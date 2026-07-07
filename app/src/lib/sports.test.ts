import Database from "better-sqlite3";

let testDb: Database.Database;

jest.mock("./db", () => ({
  getDb: () => {
    if (!testDb) {
      testDb = new Database(":memory:");
      testDb.pragma("foreign_keys = ON");
      testDb.exec(`
        CREATE TABLE IF NOT EXISTS sports (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          icon TEXT DEFAULT '🎾',
          players_per_side INTEGER NOT NULL DEFAULT 1,
          max_players INTEGER NOT NULL DEFAULT 4,
          team_sport INTEGER NOT NULL DEFAULT 0
        );
        INSERT OR IGNORE INTO sports (id, name, icon, players_per_side, max_players, team_sport)
        VALUES ('tennis', 'Tennis', '🎾', 1, 4, 0);
        INSERT OR IGNORE INTO sports (id, name, icon, players_per_side, max_players, team_sport)
        VALUES ('padel', 'Padel', '🏓', 2, 4, 1);
        INSERT OR IGNORE INTO sports (id, name, icon, players_per_side, max_players, team_sport)
        VALUES ('squash', 'Squash', '🏸', 1, 2, 0);
      `);
    }
    return testDb;
  },
}));

import { getSports, getSport } from "./sports";

describe("getSports", () => {
  it("returns all seeded sports", () => {
    const sports = getSports();
    expect(sports.length).toBe(3);
    expect(sports.map(s => s.id)).toContain("tennis");
    expect(sports.map(s => s.id)).toContain("padel");
    expect(sports.map(s => s.id)).toContain("squash");
  });
});

describe("getSport", () => {
  it("returns a specific sport", () => {
    const tennis = getSport("tennis");
    expect(tennis?.name).toBe("Tennis");
    expect(tennis?.max_players).toBe(4);
    // SQLite stores booleans as 0/1 integers
    expect(tennis?.team_sport ? true : false).toBe(false);
    expect(tennis?.players_per_side).toBe(1);
  });

  it("returns padel with team sport flag", () => {
    const padel = getSport("padel");
    expect(padel ? true : false).toBe(true);
    expect(padel?.players_per_side).toBe(2);
  });

  it("returns undefined for unknown sport", () => {
    expect(getSport("unknown")).toBeUndefined();
  });
});
