import Database from "better-sqlite3";

let testDb: Database.Database;

jest.mock("./db", () => ({
  getDb: () => {
    if (!testDb) {
      testDb = new Database(":memory:");
      testDb.pragma("foreign_keys = ON");
      testDb.exec(`
        CREATE TABLE profiles (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, age INTEGER NOT NULL,
          languages TEXT NOT NULL DEFAULT '[]', skill_level REAL NOT NULL DEFAULT 3.0,
          latitude REAL, longitude REAL, city TEXT, bio TEXT DEFAULT '',
          preferred_age_min INTEGER DEFAULT 18, preferred_age_max INTEGER DEFAULT 99,
          preferred_skill_min REAL DEFAULT 1.0, preferred_skill_max REAL DEFAULT 5.0,
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE courts (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT NOT NULL,
          latitude REAL NOT NULL, longitude REAL NOT NULL, city TEXT NOT NULL,
          surface TEXT DEFAULT 'hard', available_slots TEXT NOT NULL DEFAULT '[]',
          source_url TEXT, last_scraped TEXT
        );
        CREATE TABLE groups (
          id TEXT PRIMARY KEY, court_id TEXT, scheduled_time TEXT,
          status TEXT NOT NULL DEFAULT 'forming', city TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE group_members (
          group_id TEXT NOT NULL, profile_id TEXT NOT NULL,
          joined_at TEXT DEFAULT (datetime('now')),
          PRIMARY KEY (group_id, profile_id)
        );
        CREATE TABLE bookings (
          id TEXT PRIMARY KEY, group_id TEXT NOT NULL, court_id TEXT NOT NULL,
          time_slot TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);
    }
    return testDb;
  },
}));

import { getOrCreateGroup, joinGroup, getGroupsForProfile } from "./booking";

function insertProfile(id: string) {
  testDb.prepare("INSERT INTO profiles (id, name, age) VALUES (?, ?, ?)").run(id, `Player ${id}`, 25);
}

function insertCourt(city: string) {
  testDb.prepare(`
    INSERT INTO courts (id, name, address, latitude, longitude, city, available_slots)
    VALUES ('court-1', 'Test Court', '123 Test St', 40.7, -73.9, ?, '["2026-03-05T10:00"]')
  `).run(city);
}

beforeEach(() => {
  if (testDb) {
    testDb.exec("DELETE FROM bookings; DELETE FROM group_members; DELETE FROM groups; DELETE FROM courts; DELETE FROM profiles;");
  }
});

describe("getOrCreateGroup", () => {
  it("creates a new forming group", () => {
    const group = getOrCreateGroup("New York");
    expect(group.city).toBe("New York");
    expect(group.status).toBe("forming");
  });

  it("returns existing forming group for same city", () => {
    const g1 = getOrCreateGroup("New York");
    const g2 = getOrCreateGroup("New York");
    expect(g1.id).toBe(g2.id);
  });
});

describe("joinGroup", () => {
  it("adds member to group", () => {
    insertProfile("p1");
    const group = getOrCreateGroup("New York");
    const result = joinGroup(group.id, "p1");
    expect(result.members).toContain("p1");
  });

  it("does not duplicate membership", () => {
    insertProfile("p1");
    const group = getOrCreateGroup("New York");
    joinGroup(group.id, "p1");
    const result = joinGroup(group.id, "p1");
    expect(result.members.length).toBe(1);
  });

  it("auto-books when 4 members join", () => {
    insertCourt("New York");
    for (let i = 1; i <= 4; i++) insertProfile(`p${i}`);

    const group = getOrCreateGroup("New York");
    joinGroup(group.id, "p1");
    joinGroup(group.id, "p2");
    joinGroup(group.id, "p3");
    const result = joinGroup(group.id, "p4");

    expect(result.members.length).toBe(4);
    // Refetch to check status
    const updated = testDb.prepare("SELECT status FROM groups WHERE id = ?").get(group.id) as { status: string };
    expect(updated.status).toBe("booked");
  });
});

describe("getGroupsForProfile", () => {
  it("returns groups the profile belongs to", () => {
    insertProfile("p1");
    const group = getOrCreateGroup("New York");
    joinGroup(group.id, "p1");

    const groups = getGroupsForProfile("p1");
    expect(groups.length).toBe(1);
    expect(groups[0].city).toBe("New York");
  });
});
