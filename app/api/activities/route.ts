import Database from 'better-sqlite3'
import path from 'path'

export async function GET() {
  const db = new Database(path.resolve(process.cwd(), 'data', 'activities.db'), { readonly: true })
  const activities = db.prepare('SELECT * FROM activities').all()
  const count = (db.prepare('SELECT COUNT(*) as n FROM activities').get() as { n: number }).n
  const types = (db.prepare("SELECT type, COUNT(*) as count FROM activities GROUP BY type ORDER BY count DESC").all()) as { type: string; count: number }[]
  db.close()

  return Response.json({
    total: count,
    schema: {
      id: 'INTEGER PRIMARY KEY — auto-increment',
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
    breakdown_by_type: types,
    activities,
  })
}
