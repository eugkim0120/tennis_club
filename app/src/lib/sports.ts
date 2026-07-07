import { getDb } from "./db";

export const DEFAULT_SPORTS = [
  { id: "tennis", name: "Tennis", icon: "🎾", players_per_side: 1, max_players: 4, team_sport: false },
  { id: "padel",  name: "Padel",  icon: "🏓", players_per_side: 2, max_players: 4, team_sport: true },
] as const;

export type SportId = (typeof DEFAULT_SPORTS)[number]["id"];

export interface Sport {
  id: string;
  name: string;
  icon: string;
  players_per_side: number;
  max_players: number;
  team_sport: boolean;
}

function rowToSport(row: Record<string, unknown>): Sport {
  return {
    id: row.id as string,
    name: row.name as string,
    icon: (row.icon as string) || "🎾",
    players_per_side: row.players_per_side as number,
    max_players: row.max_players as number,
    team_sport: (row.team_sport as number) === 1,
  };
}

export function getSports(): Sport[] {
  const db = getDb();
  return (db.prepare("SELECT * FROM sports ORDER BY name").all() as Record<string, unknown>[]).map(rowToSport);
}

export function getSport(id: string): Sport | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM sports WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToSport(row) : undefined;
}

export function seedSports(): void {
  const db = getDb();
  const existing = db.prepare("SELECT COUNT(*) as count FROM sports").get() as { count: number };
  if (existing.count > 0) return;
  const insert = db.prepare(
    "INSERT OR IGNORE INTO sports (id, name, icon, players_per_side, max_players, team_sport) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const sport of DEFAULT_SPORTS) {
    insert.run(sport.id, sport.name, sport.icon, sport.players_per_side, sport.max_players, sport.team_sport ? 1 : 0);
  }
}
