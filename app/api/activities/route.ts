import { ACTIVITIES } from '@/lib/activities'

export async function GET() {
  const breakdown: Record<string, number> = {}
  for (const a of ACTIVITIES) {
    breakdown[a.type] = (breakdown[a.type] ?? 0) + 1
  }
  const breakdown_by_type = Object.entries(breakdown)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  return Response.json({
    total: ACTIVITIES.length,
    schema: {
      id: 'INTEGER — unique identifier',
      title: 'TEXT — activity name',
      provider: 'TEXT — organization offering the activity',
      type: 'TEXT — course | certificate | hackathon | community | volunteering | meetup | professional association',
      url: 'TEXT — canonical source URL, verified at seed time',
      description: 'TEXT — 1-2 sentence summary used in LLM context',
      cost: 'TEXT — human-readable cost string (e.g. "free to audit", "paid ($149)")',
      modality: 'TEXT — online | in-person | hybrid',
      level: 'TEXT — beginner | intermediate | advanced | all',
      tags: 'TEXT — comma-separated topic tags',
      eligibility: 'TEXT — who can participate (e.g. "all", "college", "professional")',
      location: 'TEXT — geographic location or "Remote"',
      freshness: 'TEXT — YYYY-MM-DD of last manual verification',
    },
    breakdown_by_type,
    activities: ACTIVITIES,
  })
}
