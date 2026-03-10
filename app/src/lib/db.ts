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
      reliability_score REAL NOT NULL DEFAULT 1.0,
      games_played INTEGER NOT NULL DEFAULT 0,
      games_attended INTEGER NOT NULL DEFAULT 0,
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
      creator_id TEXT REFERENCES profiles(id),
      title TEXT,
      description TEXT DEFAULT '',
      court_id TEXT REFERENCES courts(id),
      scheduled_time TEXT,
      status TEXT NOT NULL DEFAULT 'forming',
      city TEXT NOT NULL,
      join_mode TEXT NOT NULL DEFAULT 'open',
      stake_amount INTEGER NOT NULL DEFAULT 10,
      min_skill REAL DEFAULT 1.0,
      max_skill REAL DEFAULT 5.0,
      min_reliability REAL DEFAULT 0.0,
      max_members INTEGER NOT NULL DEFAULT 4,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL REFERENCES groups(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      stake_amount INTEGER NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'active',
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

    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
      balance INTEGER NOT NULL DEFAULT 100,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY,
      wallet_id TEXT NOT NULL REFERENCES wallets(id),
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      reference_id TEXT,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS group_applications (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      status TEXT NOT NULL DEFAULT 'pending',
      message TEXT,
      reviewed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(group_id, profile_id)
    );

    CREATE TABLE IF NOT EXISTS check_ins (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      checked_in_at TEXT DEFAULT (datetime('now')),
      UNIQUE(booking_id, profile_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      reference_id TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}
