import { getDb } from "./db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface User {
  id: string;
  email: string;
  session_token: string | null;
  created_at: string;
}

export function register(email: string, password: string): User {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) throw new Error("Email already registered");

  const id = crypto.randomUUID();
  const password_hash = bcrypt.hashSync(password, 10);
  const session_token = crypto.randomUUID();

  db.prepare("INSERT INTO users (id, email, password_hash, session_token) VALUES (?, ?, ?, ?)").run(
    id, email, password_hash, session_token
  );

  return { id, email, session_token, created_at: new Date().toISOString() };
}

export function login(email: string, password: string): User {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as (User & { password_hash: string }) | undefined;
  if (!row) throw new Error("Invalid email or password");

  const valid = bcrypt.compareSync(password, row.password_hash);
  if (!valid) throw new Error("Invalid email or password");

  const session_token = crypto.randomUUID();
  db.prepare("UPDATE users SET session_token = ? WHERE id = ?").run(session_token, row.id);

  return { id: row.id, email: row.email, session_token, created_at: row.created_at };
}

export function getUserBySession(token: string): User | null {
  const db = getDb();
  const row = db.prepare("SELECT id, email, session_token, created_at FROM users WHERE session_token = ?").get(token) as User | undefined;
  return row ?? null;
}

export function getProfileForUser(userId: string): { id: string } | null {
  const db = getDb();
  return db.prepare("SELECT id FROM profiles WHERE user_id = ?").get(userId) as { id: string } | null;
}

export function logout(token: string): void {
  const db = getDb();
  db.prepare("UPDATE users SET session_token = NULL WHERE session_token = ?").run(token);
}
