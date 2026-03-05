import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "tennis_club.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      session_token TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE REFERENCES users(id),
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      languages TEXT NOT NULL DEFAULT '[]',
      skill_level REAL NOT NULL DEFAULT 3.0,
      latitude REAL,
      longitude REAL,
      city TEXT,
      bio TEXT DEFAULT '',
      preferred_age_min INTEGER DEFAULT 18,
      preferred_age_max INTEGER DEFAULT 99,
      preferred_skill_min REAL DEFAULT 1.0,
      preferred_skill_max REAL DEFAULT 5.0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS courts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      city TEXT NOT NULL,
      surface TEXT DEFAULT 'hard',
      available_slots TEXT NOT NULL DEFAULT '[]',
      source_url TEXT,
      last_scraped TEXT
    );

    CREATE TABLE IF NOT EXISTS match_interests (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      target_profile_id TEXT NOT NULL REFERENCES profiles(id),
      score REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'suggested',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(profile_id, target_profile_id)
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      court_id TEXT REFERENCES courts(id),
      scheduled_time TEXT,
      status TEXT NOT NULL DEFAULT 'forming',
      city TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL REFERENCES groups(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      joined_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (group_id, profile_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id),
      court_id TEXT NOT NULL REFERENCES courts(id),
      time_slot TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}
