import { getDb } from "./db";
import crypto from "crypto";

const uuid = () => crypto.randomUUID();

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  reference_id: string | null;
  read: number;
  created_at: string;
}

export function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  referenceId?: string
): Notification {
  const db = getDb();
  const id = uuid();
  db.prepare(
    "INSERT INTO notifications (id, user_id, type, title, body, reference_id) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, userId, type, title, body, referenceId ?? null);
  return db.prepare("SELECT * FROM notifications WHERE id = ?").get(id) as Notification;
}

export function getNotifications(userId: string, limit = 50): Notification[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(userId, limit) as Notification[];
}

export function getUnreadCount(userId: string): number {
  const db = getDb();
  const result = db
    .prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0")
    .get(userId) as { count: number };
  return result.count;
}

export function markAsRead(notificationId: string): void {
  const db = getDb();
  db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(notificationId);
}

export function markAllAsRead(userId: string): void {
  const db = getDb();
  db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0").run(userId);
}
