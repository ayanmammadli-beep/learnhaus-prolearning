import Anthropic from '@anthropic-ai/sdk'
import { ACTIVITIES } from '@/lib/activities'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildActivityIndex(): string {
  return ACTIVITIES.map(a =>
    `[ID:${a.id}] ${a.title} | ${a.provider} | Type: ${a.type} | Cost: ${a.cost} | Level: ${a.level} | Modality: ${a.modality} | Eligibility: ${a.eligibility} | Location: ${a.location} | Tags: ${a.tags} | ${a.description}`
  ).join('\n')
}

export async function POST(req: Request) {
  const body = await req.json()
  const { query, background, goal, budget, location_pref } = body

  if (!query || typeof query !== 'string') {
    return Response.json({ error: 'Query required' }, { status: 400 })
  }

  const contextParts: string[] = [`Query: ${query}`]
  if (background) contextParts.push(`Background: ${background}`)
  if (goal) contextParts.push(`Goal: ${goal}`)
  if (budget) contextParts.push(`Budget: ${budget}`)
  if (location_pref) contextParts.push(`Format preference: ${location_pref}`)
  const userContext = contextParts.join('\n')

  const index = buildActivityIndex()

  const systemPrompt = `You are ProLearner — an intelligent learning activity recommender that helps US-based students and professionals find real-world ProLearning opportunities.

ProLearning is defined as real-world experiential learning: online courses, certificate programs, workshops, communities of practice, meetups, hackathons, professional associations, and volunteering. NOT quiz apps or generic exercises.

ProLearners are people actively trying to build skills to get a job, get promoted, or grow professionally — high school students (16+), college students, community college students, or working professionals.

You have access to an index of real, verified ProLearning activities. Your job is to:
1. First, REASON OUT LOUD about the user's goal, background, and what they need — be specific and thoughtful
2. Then RECOMMEND the best matching activities from the index with clear explanations and structured scores

ACTIVITY INDEX:
${index}

IMPORTANT RULES:
- Only recommend activities from the index above. Never invent activities.
- Always include the source URL from the index.
- If an activity does not match the user's goal, do not recommend it.
- Prioritize activities based on: goal fit, level match, cost accessibility, and eligibility.
- Consider the user's budget and format preference when scoring.
- Be honest about tradeoffs (cost, time commitment, prerequisites).
- Think step by step before recommending.
- When you reference an activity in your thinking, include its [ID:X] tag so the system can resolve it.
- Only include activities scoring 6 or higher in the recommendations section.

FORMAT your response exactly like this:

<thinking>
[Your step-by-step reasoning about the user's goal, what they likely need, what constraints matter, and how you are selecting activities. Be specific. Reference the user's actual words. When you identify a match, include [ID:X].]
</thinking>

<recommendations>
[ID:X] | score:N | reason: [1-2 sentence specific explanation of why this activity matches the user's goal, background, and constraints]

Where N is a match score from 1-10. Only include activities scoring 6+. Order by score descending. Each recommendation must be on its own line in exactly this format.
</recommendations>`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = await client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContext }],
        })

        let fullText = ''

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            fullText += chunk.delta.text
            const data = JSON.stringify({ type: 'text', text: chunk.delta.text })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        }

        const activityMeta: Record<number, { score: number; reason: string }> = {}
        const recsMatch = fullText.match(/<recommendations>([\s\S]*?)(<\/recommendations>|$)/)
        if (recsMatch) {
          const recsText = recsMatch[1]
          for (const lineMatch of recsText.matchAll(/\[ID:(\d+)\]\s*\|\s*score:(\d+)\s*\|\s*reason:\s*([\s\S]+?)(?=\n\[ID:|\n*$)/gm)) {
            const id = parseInt(lineMatch[1])
            const score = parseInt(lineMatch[2])
            const reason = lineMatch[3].replace(/\n/g, ' ').trim()
            activityMeta[id] = { score, reason }
          }
        }

        const recommendedIds: number[] = []
        for (const match of fullText.matchAll(/\[ID:(\d+)\]/g)) {
          const id = parseInt(match[1])
          if (!recommendedIds.includes(id)) recommendedIds.push(id)
        }

        const scoredIds = Object.entries(activityMeta)
          .filter(([, meta]) => meta.score >= 6)
          .map(([id]) => parseInt(id))

        const idsToUse = scoredIds.length > 0 ? scoredIds : recommendedIds

        const recommended = ACTIVITIES
          .filter(a => idsToUse.includes(a.id))
          .map(a => ({
            ...a,
            matchScore: activityMeta[a.id]?.score,
            matchReason: activityMeta[a.id]?.reason,
          }))
          .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'done', activities: recommended })}\n\n`
          )
        )
        controller.close()
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: String(err) })}\n\n`
          )
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
