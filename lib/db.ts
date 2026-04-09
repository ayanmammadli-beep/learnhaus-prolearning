import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.resolve(process.cwd(), 'data', 'activities.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    ensureSchema(db)
  }
  return db
}

function ensureSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      provider TEXT NOT NULL,
      type TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT NOT NULL,
      cost TEXT NOT NULL,
      modality TEXT NOT NULL,
      level TEXT NOT NULL,
      tags TEXT NOT NULL,
      eligibility TEXT NOT NULL,
      location TEXT NOT NULL,
      freshness TEXT NOT NULL
    )
  `)
}

export interface Activity {
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
}
