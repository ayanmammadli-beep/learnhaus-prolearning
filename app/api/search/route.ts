import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface Activity {
  id: number
  title: string
  provider: string
  type: string
  url: string
  description: string
  cost: string
  modality: string
  level: string
  tags: string
  eligibility: string
  location: string
  freshness: string
  matchScore?: number
  matchReason?: string
}

const ACTIVITIES: Activity[] = [
  { id: 1, title: "Machine Learning Specialization", provider: "Coursera / DeepLearning.AI", type: "course", url: "https://www.coursera.org/specializations/machine-learning-introduction", description: "Foundational ML program covering supervised learning, unsupervised learning, and best ML practices. Taught by Andrew Ng.", cost: "free to audit", modality: "online", level: "beginner", tags: "machine learning, python, ai, data science, career", eligibility: "all", location: "Remote", freshness: "2025-01-01" },
  { id: 2, title: "Google Data Analytics Certificate", provider: "Coursera / Google", type: "certificate", url: "https://www.coursera.org/professional-certificates/google-data-analytics", description: "Professional certificate covering SQL, R, and Tableau. Designed for career changers seeking data roles.", cost: "paid (financial aid available)", modality: "online", level: "beginner", tags: "data analytics, sql, tableau, career, certificate", eligibility: "all", location: "Remote", freshness: "2025-01-01" },
  { id: 3, title: "CS50: Introduction to Computer Science", provider: "Harvard / edX", type: "course", url: "https://cs50.harvard.edu/x/", description: "Harvard's intro to CS. Covers C, Python, SQL, HTML/CSS/JS. Free to complete, paid certificate available.", cost: "free to audit", modality: "online", level: "beginner", tags: "computer science, python, programming, career", eligibility: "all", location: "Remote", freshness: "2025-01-01" },
  { id: 4, title: "MLH Fellowship", provider: "Major League Hacking", type: "community", url: "https://fellowship.mlh.io/", description: "12-week remote internship alternative contributing to open source projects. Stipend provided to selected fellows.", cost: "free (stipend)", modality: "online", level: "intermediate", tags: "open source, software engineering, fellowship, career, college", eligibility: "college", location: "Remote", freshness: "2025-03-01" },
  { id: 5, title: "AI Community of Practice — US Government", provider: "Digital.gov", type: "community", url: "https://digital.gov/communities/artificial-intelligence/", description: "Federal community of practice for AI in government. Monthly calls, resources, and networking for AI practitioners.", cost: "free", modality: "online", level: "all", tags: "ai, networking, government, policy, community", eligibility: "professional", location: "Remote", freshness: "2025-01-01" },
  { id: 6, title: "HackMIT", provider: "MIT", type: "hackathon", url: "https://hackmit.org/", description: "Annual MIT hackathon with 1000+ students building projects over a weekend. Travel reimbursement available.", cost: "free", modality: "in-person", level: "all", tags: "hackathon, networking, software engineering, college, projects", eligibility: "college", location: "Cambridge, MA", freshness: "2025-06-01" },
  { id: 7, title: "AWS Cloud Practitioner Certification", provider: "Amazon Web Services", type: "certificate", url: "https://aws.amazon.com/certification/certified-cloud-practitioner/", description: "Entry-level cloud cert validating foundational AWS knowledge. Widely recognized by employers for cloud and devops roles.", cost: "paid ($100 exam)", modality: "online", level: "beginner", tags: "cloud, aws, certificate, career, devops", eligibility: "all", location: "Remote", freshness: "2025-01-01" },
  { id: 8, title: "Full Stack Open", provider: "University of Helsinki", type: "course", url: "https://fullstackopen.com/en/", description: "Free deep dive into modern web development: React, Node.js, TypeScript, GraphQL. Free certificate from University of Helsinki.", cost: "free", modality: "online", level: "intermediate", tags: "web development, react, javascript, typescript, full stack", eligibility: "all", location: "Remote", freshness: "2025-01-01" },
  { id: 9, title: "Y Combinator Startup School", provider: "Y Combinator", type: "course", url: "https://www.startupschool.org/", description: "Free 8-week online program on building startups from YC partners. Access to YC community and office hours.", cost: "free", modality: "online", level: "all", tags: "startup, entrepreneurship, business, yc, founder", eligibility: "all", location: "Remote", freshness: "2025-01-01" },
  { id: 10, title: "TreeHacks", provider: "Stanford University", type: "hackathon", url: "https://treehacks.com/", description: "Stanford's flagship hackathon focused on high-impact tech. Travel grants available for admitted students.", cost: "free", modality: "in-person", level: "all", tags: "hackathon, stanford, ai, software engineering, college", eligibility: "college", location: "Stanford, CA", freshness: "2025-06-01" },
  { id: 11, title: "Google Summer of Code", provider: "Google", type: "volunteering", url: "https://summerofcode.withgoogle.com/", description: "Paid open source internship. Contribute to open source orgs over summer with a stipend from Google.", cost: "free (stipend $1500–$6600)", modality: "online", level: "intermediate", tags: "open source, software engineering, google, internship, stipend", eligibility: "college", location: "Remote", freshness: "2025-03-01" },
  { id: 12, title: "Taproot Foundation Pro Bono Volunteering", provider: "Taproot Foundation", type: "volunteering", url: "https://taprootplus.org/", description: "Pro bono professional services platform connecting skilled volunteers with nonprofits. Real-world portfolio building.", cost: "free", modality: "online", level: "intermediate", tags: "volunteering, nonprofit, professional skills, portfolio, career", eligibility: "professional", location: "Remote", freshness: "2025-01-01" },
  { id: 13, title: "IEEE Student Membership", provider: "IEEE", type: "professional association", url: "https://www.ieee.org/membership/students/index.html", description: "Global professional network for engineering students with publications, conferences, and local chapter events.", cost: "paid ($32/year)", modality: "hybrid", level: "all", tags: "engineering, networking, professional, conferences, college", eligibility: "college", location: "US", freshness: "2025-01-01" },
  { id: 14, title: "AI Safety Fundamentals", provider: "BlueDot Impact", type: "course", url: "https://aisafetyfundamentals.com/", description: "8-week cohort course on AI safety and alignment. Covers technical and governance aspects. Free reading groups available.", cost: "free", modality: "online", level: "intermediate", tags: "ai safety, alignment, policy, research, ai, governance", eligibility: "all", location: "Remote", freshness: "2025-01-01" },
  { id: 15, title: "Kaggle Competitions", provider: "Kaggle / Google", type: "community", url: "https://www.kaggle.com/competitions", description: "Data science competitions with real datasets and cash prizes. Strong portfolio-building opportunity with a large community.", cost: "free", modality: "online", level: "all", tags: "data science, machine learning, competition, portfolio, python", eligibility: "all", location: "Remote", freshness: "2025-03-01" },
  { id: 16, title: "Buildspace Nights & Weekends", provider: "Buildspace", type: "community", url: "https://buildspace.so/", description: "6-week cohort to build and ship your own project alongside thousands of builders worldwide. Strong community.", cost: "free", modality: "online", level: "all", tags: "startup, building, community, projects, entrepreneurship", eligibility: "all", location: "Remote", freshness: "2025-01-01" },
  { id: 17, title: "PennApps", provider: "University of Pennsylvania", type: "hackathon", url: "https://pennapps.com/", description: "One of the oldest collegiate hackathons. 1200+ participants, $20k+ in prizes, and a strong alumni network.", cost: "free", modality: "in-person", level: "all", tags: "hackathon, college, software engineering, prizes, networking", eligibility: "college", location: "Philadelphia, PA", freshness: "2025-06-01" },
  { id: 18, title: "LinkedIn Learning Business & Tech Courses", provider: "LinkedIn Learning", type: "course", url: "https://www.linkedin.com/learning/", description: "Extensive library of business and tech courses. Often free through public libraries. Certificates display on LinkedIn profile.", cost: "free (with library card)", modality: "online", level: "all", tags: "business, leadership, communication, professional, career", eligibility: "all", location: "Remote", freshness: "2025-01-01" },
  { id: 19, title: "PMP Certification", provider: "Project Management Institute", type: "certificate", url: "https://www.pmi.org/certifications/project-management-pmp", description: "Gold standard project management certification. Globally recognized for professionals leading teams and projects.", cost: "paid ($405 members / $555 non-members)", modality: "hybrid", level: "advanced", tags: "project management, pmp, leadership, professional, certification", eligibility: "professional", location: "US", freshness: "2025-01-01" },
  { id: 20, title: "Dev.to Community", provider: "DEV Community", type: "community", url: "https://dev.to/", description: "Online community of software developers sharing articles, discussions, and projects. Great for building a public profile.", cost: "free", modality: "online", level: "all", tags: "software engineering, community, writing, portfolio, career", eligibility: "all", location: "Remote", freshness: "2025-01-01" },
  { id: 21, title: "Responsible AI Certification", provider: "Responsible AI Institute", type: "certificate", url: "https://www.responsible.ai/certification/", description: "Professional cert in responsible AI practices: ethics, bias, governance, and compliance frameworks.", cost: "paid", modality: "online", level: "intermediate", tags: "ai ethics, responsible ai, governance, professional, policy", eligibility: "professional", location: "Remote", freshness: "2025-01-01" },
  { id: 22, title: "Product Management Fellowship", provider: "Exponent", type: "community", url: "https://www.tryexponent.com/", description: "Community and program helping aspiring PMs break into product management through mock interviews and resources.", cost: "paid (subscription)", modality: "online", level: "intermediate", tags: "product management, pm, career, interview, business", eligibility: "all", location: "Remote", freshness: "2025-01-01" },
  { id: 23, title: "HackNY", provider: "hackNY", type: "hackathon", url: "https://hackny.org/", description: "NYC's premier student hackathon with mentorship from the NYC tech ecosystem. Focused on social good applications.", cost: "free", modality: "in-person", level: "all", tags: "hackathon, nyc, social good, software engineering, college", eligibility: "college", location: "New York, NY", freshness: "2025-06-01" },
  { id: 24, title: "Data Science DC Meetup", provider: "Meetup.com / Data Science DC", type: "meetup", url: "https://www.meetup.com/data-science-dc/", description: "Monthly in-person meetups on data science topics. One of the largest DS communities on the East Coast.", cost: "free", modality: "in-person", level: "all", tags: "data science, networking, meetup, community, machine learning", eligibility: "all", location: "Washington, DC", freshness: "2025-03-01" },
  { id: 25, title: "Tech Elevator Coding Bootcamp", provider: "Tech Elevator", type: "course", url: "https://www.techelevator.com/", description: "14-week intensive coding bootcamp with job placement support. Focus on Java or .NET full-stack development.", cost: "paid ($15,950 — ISA available)", modality: "hybrid", level: "beginner", tags: "coding bootcamp, software engineering, job placement, career change", eligibility: "all", location: "US", freshness: "2025-01-01" },
]

function buildActivityIndex(activities: Activity[]): string {
  return activities.map(a =>
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

  const index = buildActivityIndex(ACTIVITIES)

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
