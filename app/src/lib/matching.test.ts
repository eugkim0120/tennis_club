import Database from "better-sqlite3";

// Mock the db module to use in-memory database
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
          preferred_skill_min REAL DEFAULT 1.0, preferred_skill_max REAL DEFAULT 5.0, sport_preferences TEXT NOT NULL DEFAULT '["tennis"]',
          reliability_score REAL NOT NULL DEFAULT 1.0,
          games_played INTEGER NOT NULL DEFAULT 0, games_attended INTEGER NOT NULL DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE match_interests (
          id TEXT PRIMARY KEY, profile_id TEXT NOT NULL, target_profile_id TEXT NOT NULL,
          score REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'suggested',
          created_at TEXT DEFAULT (datetime('now')),
          UNIQUE(profile_id, target_profile_id)
        );
      `);
    }
    return testDb;
  },
}));

import { computeStandouts, expressInterest, getMutualMatches } from "./matching";

function insertProfile(id: string, overrides: Record<string, unknown> = {}) {
  const defaults = {
    name: `Player ${id}`, age: 28, languages: '["English"]', skill_level: 3.0,
    city: "New York", bio: "", preferred_age_min: 18, preferred_age_max: 50,
    preferred_skill_min: 1.0, preferred_skill_max: 5.0,
  };
  const p = { ...defaults, ...overrides, sport_preferences: overrides.sport_preferences as string ?? '["tennis"]' };
  testDb.prepare(`
    INSERT INTO profiles (id, name, age, languages, skill_level, city, bio, preferred_age_min, preferred_age_max, preferred_skill_min, preferred_skill_max, sport_preferences)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, p.name, p.age, p.languages, p.skill_level, p.city, p.bio, p.preferred_age_min, p.preferred_age_max, p.preferred_skill_min, p.preferred_skill_max, p.sport_preferences);
}

beforeEach(() => {
  if (testDb) {
    testDb.exec("DELETE FROM match_interests");
    testDb.exec("DELETE FROM profiles");
  }
});

describe("computeStandouts", () => {
  it("returns empty for unknown profile", () => {
    expect(computeStandouts("nonexistent")).toEqual([]);
  });

  it("ranks similar skill levels higher", () => {
    insertProfile("me", { skill_level: 3.0 });
    insertProfile("close", { skill_level: 3.2 });
    insertProfile("far", { skill_level: 1.0 });

    const results = computeStandouts("me");
    expect(results.length).toBe(2);
    expect(results[0].profile.id).toBe("close");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("considers age range preferences", () => {
    insertProfile("me", { age: 28, preferred_age_min: 25, preferred_age_max: 35 });
    insertProfile("inrange", { age: 30, preferred_age_min: 25, preferred_age_max: 35 });
    insertProfile("outrange", { age: 50, preferred_age_min: 45, preferred_age_max: 60 });

    const results = computeStandouts("me");
    const inRangeMatch = results.find((r) => r.profile.id === "inrange")!;
    const outRangeMatch = results.find((r) => r.profile.id === "outrange")!;
    expect(inRangeMatch.breakdown.criteria).toBeGreaterThan(outRangeMatch.breakdown.criteria);
  });

  it("considers language overlap", () => {
    insertProfile("me", { languages: '["English","Spanish"]' });
    insertProfile("shared", { languages: '["English","Spanish"]' });
    insertProfile("none", { languages: '["Japanese"]' });

    const results = computeStandouts("me");
    const sharedMatch = results.find((r) => r.profile.id === "shared")!;
    const noneMatch = results.find((r) => r.profile.id === "none")!;
    expect(sharedMatch.breakdown.criteria).toBeGreaterThan(noneMatch.breakdown.criteria);
  });
});

describe("expressInterest", () => {
  it("creates an interested match", () => {
    insertProfile("a");
    insertProfile("b");

    const result = expressInterest("a", "b");
    expect(result.status).toBe("interested");
  });

  it("creates mutual match when both express interest", () => {
    insertProfile("a");
    insertProfile("b");

    expressInterest("a", "b");
    const result = expressInterest("b", "a");
    expect(result.status).toBe("mutual");
  });
});

describe("getMutualMatches", () => {
  it("returns mutual matches", () => {
    insertProfile("a");
    insertProfile("b");
    insertProfile("c");

    expressInterest("a", "b");
    expressInterest("b", "a"); // mutual
    expressInterest("a", "c"); // not mutual

    const mutuals = getMutualMatches("a");
    expect(mutuals.length).toBe(1);
    expect(mutuals[0].target_profile_id).toBe("b");
  });
});
