import { getDb } from "./db";
import crypto from "crypto";
const uuid = () => crypto.randomUUID();

export interface Profile {
  id: string;
  name: string;
  age: number;
  languages: string[];
  skill_level: number;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  bio: string;
  preferred_age_min: number;
  preferred_age_max: number;
  preferred_skill_min: number;
  preferred_skill_max: number;
  sport_preferences: string[];
  created_at: string;
}

export interface CreateProfileInput {
  user_id?: string;
  name: string;
  age: number;
  languages: string[];
  skill_level: number;
  latitude?: number;
  longitude?: number;
  city?: string;
  bio?: string;
  preferred_age_min?: number;
  preferred_age_max?: number;
  preferred_skill_min?: number;
  preferred_skill_max?: number;
  sport_preferences?: string[];
}

const JSON_FIELDS = new Set(["languages", "sport_preferences"]);

function rowToProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    name: row.name as string,
    age: row.age as number,
    languages: JSON.parse((row.languages as string) || "[]"),
    skill_level: row.skill_level as number,
    latitude: row.latitude as number | null,
    longitude: row.longitude as number | null,
    city: row.city as string | null,
    bio: (row.bio as string) || "",
    preferred_age_min: (row.preferred_age_min as number) ?? 18,
    preferred_age_max: (row.preferred_age_max as number) ?? 99,
    preferred_skill_min: (row.preferred_skill_min as number) ?? 1.0,
    preferred_skill_max: (row.preferred_skill_max as number) ?? 5.0,
    sport_preferences: JSON.parse((row.sport_preferences as string) || '["tennis"]'),
    created_at: (row.created_at as string) || "",
  };
}

export function createProfile(input: CreateProfileInput): Profile {
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO profiles (id, user_id, name, age, languages, skill_level, latitude, longitude, city, bio, preferred_age_min, preferred_age_max, preferred_skill_min, preferred_skill_max, sport_preferences)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.user_id ?? null,
    input.name,
    input.age,
    JSON.stringify(input.languages),
    input.skill_level,
    input.latitude ?? null,
    input.longitude ?? null,
    input.city ?? null,
    input.bio ?? "",
    input.preferred_age_min ?? 18,
    input.preferred_age_max ?? 99,
    input.preferred_skill_min ?? 1.0,
    input.preferred_skill_max ?? 5.0,
    JSON.stringify(input.sport_preferences ?? ["tennis"])
  );
  return getProfile(id)!;
}

export function getProfile(id: string): Profile | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM profiles WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToProfile(row) : null;
}

export function getAllProfiles(): Profile[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM profiles ORDER BY created_at DESC").all() as Record<string, unknown>[];
  return rows.map(rowToProfile);
}

export function updateProfile(id: string, input: Partial<CreateProfileInput>): Profile | null {
  const db = getDb();
  const existing = getProfile(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(JSON_FIELDS.has(key) ? JSON.stringify(value) : value);
    }
  }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE profiles SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  }

  return getProfile(id);
}

export function deleteProfile(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM profiles WHERE id = ?").run(id);
  return result.changes > 0;
}
