import { getDb } from "./db";
import crypto from "crypto";
const uuid = () => crypto.randomUUID();
import { getCourtsByCity, Court } from "./courts";

export interface Group {
  id: string;
  court_id: string | null;
  scheduled_time: string | null;
  status: "forming" | "ready" | "booked" | "completed";
  city: string;
  created_at: string;
}

export interface GroupWithMembers extends Group {
  members: string[];
}

export interface Booking {
  id: string;
  group_id: string;
  court_id: string;
  time_slot: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
}

export function getOrCreateGroup(city: string): Group {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM groups WHERE LOWER(city) = LOWER(?) AND status = 'forming'")
    .get(city) as Group | undefined;

  if (existing) return existing;

  const id = uuid();
  db.prepare("INSERT INTO groups (id, city, status) VALUES (?, ?, 'forming')").run(id, city);
  return db.prepare("SELECT * FROM groups WHERE id = ?").get(id) as Group;
}

export function joinGroup(groupId: string, profileId: string): GroupWithMembers {
  const db = getDb();

  const alreadyIn = db
    .prepare("SELECT 1 FROM group_members WHERE group_id = ? AND profile_id = ?")
    .get(groupId, profileId);

  if (!alreadyIn) {
    db.prepare("INSERT INTO group_members (group_id, profile_id) VALUES (?, ?)").run(groupId, profileId);
  }

  const members = db
    .prepare("SELECT profile_id FROM group_members WHERE group_id = ?")
    .all(groupId) as { profile_id: string }[];

  const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as Group;

  const result: GroupWithMembers = {
    ...group,
    members: members.map((m) => m.profile_id),
  };

  // Auto-book when we reach 4 members
  if (result.members.length >= 4 && result.status === "forming") {
    autoBook(result);
    // Re-read group after booking to return updated status
    const updated = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as Group;
    return { ...updated, members: result.members };
  }

  return result;
}

function autoBook(group: GroupWithMembers): Booking | null {
  const db = getDb();
  const courts = getCourtsByCity(group.city);

  // Find first available court with a slot
  for (const court of courts) {
    if (court.available_slots.length > 0) {
      const slot = court.available_slots[0];
      const bookingId = uuid();

      db.prepare("UPDATE groups SET status = 'booked', court_id = ?, scheduled_time = ? WHERE id = ?").run(
        court.id,
        slot,
        group.id
      );

      db.prepare("INSERT INTO bookings (id, group_id, court_id, time_slot, status) VALUES (?, ?, ?, ?, 'confirmed')").run(
        bookingId,
        group.id,
        court.id,
        slot
      );

      // Remove slot from available
      const updatedSlots = court.available_slots.filter((s) => s !== slot);
      db.prepare("UPDATE courts SET available_slots = ? WHERE id = ?").run(JSON.stringify(updatedSlots), court.id);

      return {
        id: bookingId,
        group_id: group.id,
        court_id: court.id,
        time_slot: slot,
        status: "confirmed",
        created_at: new Date().toISOString(),
      };
    }
  }

  return null;
}

export function getGroupsForProfile(profileId: string): GroupWithMembers[] {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT g.* FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.profile_id = ?
      ORDER BY g.created_at DESC
    `)
    .all(profileId) as Group[];

  return rows.map((g) => {
    const members = db
      .prepare("SELECT profile_id FROM group_members WHERE group_id = ?")
      .all(g.id) as { profile_id: string }[];
    return { ...g, members: members.map((m) => m.profile_id) };
  });
}

export function getBookingsForGroup(groupId: string): Booking[] {
  const db = getDb();
  return db.prepare("SELECT * FROM bookings WHERE group_id = ?").all(groupId) as Booking[];
}

export function getAllGroups(): GroupWithMembers[] {
  const db = getDb();
  const groups = db.prepare("SELECT * FROM groups ORDER BY created_at DESC").all() as Group[];
  return groups.map((g) => {
    const members = db
      .prepare("SELECT profile_id FROM group_members WHERE group_id = ?")
      .all(g.id) as { profile_id: string }[];
    return { ...g, members: members.map((m) => m.profile_id) };
  });
}
