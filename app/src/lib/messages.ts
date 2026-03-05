import { getDb } from "./db";
import crypto from "crypto";

export interface Message {
  id: string;
  group_id: string;
  profile_id: string;
  profile_name?: string;
  content: string;
  created_at: string;
}

export function sendMessage(groupId: string, profileId: string, content: string): Message {
  const db = getDb();
  const id = crypto.randomUUID();

  // Verify sender is in the group
  const member = db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND profile_id = ?").get(groupId, profileId);
  if (!member) throw new Error("You are not a member of this group");

  db.prepare("INSERT INTO messages (id, group_id, profile_id, content) VALUES (?, ?, ?, ?)").run(id, groupId, profileId, content);

  return { id, group_id: groupId, profile_id: profileId, content, created_at: new Date().toISOString() };
}

export function getMessages(groupId: string, limit = 50): Message[] {
  const db = getDb();
  return db.prepare(`
    SELECT m.*, p.name as profile_name
    FROM messages m
    JOIN profiles p ON m.profile_id = p.id
    WHERE m.group_id = ?
    ORDER BY m.created_at ASC
    LIMIT ?
  `).all(groupId, limit) as Message[];
}
