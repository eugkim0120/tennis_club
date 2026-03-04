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
  created_at: string;
}

export interface CreateProfileInput {
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
}

function rowToProfile(row: Record<string, unknown>): Profile {
  return {
    ...row,
    languages: JSON.parse(row.languages as string),
  } as Profile;
}

export function createProfile(input: CreateProfileInput): Profile {
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO profiles (id, name, age, languages, skill_level, latitude, longitude, city, bio, preferred_age_min, preferred_age_max, preferred_skill_min, preferred_skill_max)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
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
    input.preferred_skill_max ?? 5.0
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
      values.push(key === "languages" ? JSON.stringify(value) : value);
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
