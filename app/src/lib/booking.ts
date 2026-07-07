import { getDb } from "./db";
import crypto from "crypto";
import { getCourtsByCity, scrapeCourts } from "./courts";
import { stakeCredits, refundCredits } from "./wallet";
import { createNotification } from "./notifications";
import { getCancellationRefund } from "./settlement";

const uuid = () => crypto.randomUUID();

export interface Group {
  id: string;
  creator_id: string | null;
  title: string | null;
  description: string;
  court_id: string | null;
  scheduled_time: string | null;
  status: "forming" | "ready" | "booked" | "completed";
  city: string;
  join_mode: "open" | "approval";
  stake_amount: number;
  min_skill: number;
  max_skill: number;
  min_reliability: number;
  max_members: number;
  sport: string;
  created_at: string;
}

export interface GroupWithMembers extends Group {
  members: GroupMember[];
}

export interface GroupMember {
  profile_id: string;
  stake_amount: number;
  status: string;
  joined_at: string;
  name?: string;
  skill_level?: number;
  reliability_score?: number;
}

export interface Booking {
  id: string;
  group_id: string;
  court_id: string;
  time_slot: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
}

export interface CreateGroupInput {
  creatorProfileId: string;
  creatorUserId: string;
  title: string;
  city: string;
  description?: string;
  scheduledTime?: string;
  courtId?: string;
  joinMode?: "open" | "approval";
  stakeAmount?: number;
  minSkill?: number;
  maxSkill?: number;
  minReliability?: number;
  maxMembers?: number;
  sport?: string;
}

export function createGroup(input: CreateGroupInput): GroupWithMembers {
  const db = getDb();
  const stakeAmount = input.stakeAmount ?? 10;
  const sport = input.sport ?? "tennis";

  // Stake credits for the creator
  const staked = stakeCredits(input.creatorUserId, stakeAmount, "pending_group", `Stake for creating game: ${input.title}`);
  if (!staked) throw new Error("Insufficient credits");

  const id = uuid();
  db.prepare(`
    INSERT INTO groups (id, creator_id, title, description, court_id, scheduled_time, status, city, join_mode, stake_amount, min_skill, max_skill, min_reliability, max_members, sport)
    VALUES (?, ?, ?, ?, ?, ?, 'forming', ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.creatorProfileId,
    input.title,
    input.description ?? "",
    input.courtId ?? null,
    input.scheduledTime ?? null,
    input.city,
    input.joinMode ?? "open",
    stakeAmount,
    input.minSkill ?? 1.0,
    input.maxSkill ?? 5.0,
    input.minReliability ?? 0.0,
    input.maxMembers ?? 4,
    sport
  );

  // Update the stake reference to use the actual group id
  db.prepare("UPDATE wallet_transactions SET reference_id = ? WHERE reference_id = 'pending_group' AND description LIKE ?").run(
    id,
    `Stake for creating game: ${input.title}`
  );

  // Add creator as first member
  db.prepare("INSERT INTO group_members (group_id, profile_id, stake_amount) VALUES (?, ?, ?)").run(id, input.creatorProfileId, stakeAmount);

  return getGroupWithMembers(id)!;
}

// Legacy function for backward compatibility
export function getOrCreateGroup(city: string, sport: string = "tennis"): Group {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM groups WHERE LOWER(city) = LOWER(?) AND status = 'forming' AND sport = ?")
    .get(city, sport) as Group | undefined;

  if (existing) return existing;

  const id = uuid();
  db.prepare("INSERT INTO groups (id, city, status, sport) VALUES (?, ?, 'forming', ?)").run(id, city, sport);
  return db.prepare("SELECT * FROM groups WHERE id = ?").get(id) as Group;
}

export function joinGroup(groupId: string, profileId: string, userId: string): GroupWithMembers {
  const db = getDb();

  const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as Group | undefined;
  if (!group) throw new Error("Group not found");
  if (group.status !== "forming") throw new Error("Group is no longer accepting members");

  // Check if already a member
  const alreadyIn = db
    .prepare("SELECT 1 FROM group_members WHERE group_id = ? AND profile_id = ?")
    .get(groupId, profileId);
  if (alreadyIn) return getGroupWithMembers(groupId)!;

  // Check member count
  const memberCount = db
    .prepare("SELECT COUNT(*) as count FROM group_members WHERE group_id = ?")
    .get(groupId) as { count: number };
  if (memberCount.count >= group.max_members) throw new Error("Group is full");

  // Check sport preference
  const profile = db.prepare("SELECT skill_level, reliability_score, sport_preferences FROM profiles WHERE id = ?").get(profileId) as {
    skill_level: number; reliability_score: number; sport_preferences: string;
  } | undefined;
  if (!profile) throw new Error("Profile not found");

  const prefs: string[] = JSON.parse(profile.sport_preferences || '["tennis"]');
  if (!prefs.includes(group.sport)) {
    throw new Error(`This group is for ${group.sport}, but your sport preferences don't include it`);
  }

  if (profile.skill_level < group.min_skill || profile.skill_level > group.max_skill) {
    throw new Error(`Skill level must be between ${group.min_skill} and ${group.max_skill}`);
  }
  if (profile.reliability_score < group.min_reliability) {
    throw new Error(`Reliability score must be at least ${group.min_reliability}`);
  }

  // Stake credits
  const staked = stakeCredits(userId, group.stake_amount, groupId, `Stake to join: ${group.title || group.city}`);
  if (!staked) throw new Error("Insufficient credits");

  db.prepare("INSERT INTO group_members (group_id, profile_id, stake_amount) VALUES (?, ?, ?)").run(groupId, profileId, group.stake_amount);

  // Notify creator
  if (group.creator_id) {
    const creatorUser = db.prepare("SELECT user_id FROM profiles WHERE id = ?").get(group.creator_id) as { user_id: string } | undefined;
    const joinerName = db.prepare("SELECT name FROM profiles WHERE id = ?").get(profileId) as { name: string };
    if (creatorUser) {
      createNotification(
        creatorUser.user_id,
        "member_joined",
        "New player joined!",
        `${joinerName.name} joined your game "${group.title || group.city}"`,
        groupId
      );
    }
  }

  const result = getGroupWithMembers(groupId)!;

  // Auto-book when we reach max members
  if (result.members.length >= group.max_members && group.status === "forming") {
    autoBook(groupId, group.city, group.sport);
    return getGroupWithMembers(groupId)!;
  }

  return result;
}

function autoBook(groupId: string, city: string, sport: string): Booking | null {
  const db = getDb();
  let courts = db.prepare(
    "SELECT * FROM courts WHERE LOWER(city) = LOWER(?) AND sport = ?"
  ).all(city, sport) as Record<string, unknown>[];

  if (courts.length === 0) {
    scrapeCourts(city);
    courts = db.prepare(
      "SELECT * FROM courts WHERE LOWER(city) = LOWER(?) AND sport = ?"
    ).all(city, sport) as Record<string, unknown>[];
  }

  for (const courtRow of courts) {
    const court = {
      ...courtRow,
      available_slots: JSON.parse(courtRow.available_slots as string || "[]"),
    } as { id: string; name: string; available_slots: string[] };

    if (court.available_slots.length > 0) {
      const slot = court.available_slots[0];
      const bookingId = uuid();

      db.prepare("UPDATE groups SET status = 'booked', court_id = ?, scheduled_time = ? WHERE id = ?").run(
        court.id, slot, groupId
      );

      db.prepare("INSERT INTO bookings (id, group_id, court_id, time_slot, status, sport) VALUES (?, ?, ?, ?, 'confirmed', ?)").run(
        bookingId, groupId, court.id, slot, sport
      );

      const updatedSlots = court.available_slots.filter((s) => s !== slot);
      db.prepare("UPDATE courts SET available_slots = ? WHERE id = ?").run(JSON.stringify(updatedSlots), court.id);

      // Notify all members
      const members = db.prepare(
        "SELECT p.user_id, p.name FROM group_members gm JOIN profiles p ON gm.profile_id = p.id WHERE gm.group_id = ?"
      ).all(groupId) as { user_id: string; name: string }[];

      for (const member of members) {
        createNotification(
          member.user_id,
          "game_booked",
          "Game booked!",
          `Your game has been booked at ${court.name}. Don't forget to check in!`,
          groupId
        );
      }

      return {
        id: bookingId,
        group_id: groupId,
        court_id: court.id,
        time_slot: slot,
        status: "confirmed",
        created_at: new Date().toISOString(),
      };
    }
  }

  return null;
}

export function cancelMembership(groupId: string, profileId: string, userId: string): { refund: number; tier: string } {
  const db = getDb();

  const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as Group | undefined;
  if (!group) throw new Error("Group not found");

  const member = db.prepare("SELECT * FROM group_members WHERE group_id = ? AND profile_id = ? AND status = 'active'")
    .get(groupId, profileId) as GroupMember | undefined;
  if (!member) throw new Error("Not a member of this group");

  // Calculate refund based on cancellation policy
  let refundAmount = member.stake_amount;
  let tier = "full";

  if (group.status === "booked" && group.scheduled_time) {
    const result = getCancellationRefund(group.scheduled_time, member.stake_amount);
    refundAmount = result.refund;
    tier = result.tier;

    // Apply reliability hit
    if (result.reliabilityHit > 0) {
      db.prepare("UPDATE profiles SET reliability_score = MAX(0, reliability_score - ?) WHERE id = ?").run(
        result.reliabilityHit, profileId
      );
    }
  }

  // Process refund
  if (refundAmount > 0) {
    refundCredits(userId, refundAmount, groupId, `Cancellation refund (${tier})`);
  }

  // Update member status
  db.prepare("UPDATE group_members SET status = 'cancelled' WHERE group_id = ? AND profile_id = ?").run(groupId, profileId);

  // If group was forming, revert to forming with fewer members
  if (group.status === "forming" || group.status === "booked") {
    const activeMembers = db.prepare("SELECT COUNT(*) as count FROM group_members WHERE group_id = ? AND status = 'active'")
      .get(groupId) as { count: number };
    if (activeMembers.count < group.max_members && group.status === "booked") {
      db.prepare("UPDATE groups SET status = 'forming' WHERE id = ?").run(groupId);
    }
  }

  // Notify creator
  if (group.creator_id && group.creator_id !== profileId) {
    const creatorUser = db.prepare("SELECT user_id FROM profiles WHERE id = ?").get(group.creator_id) as { user_id: string } | undefined;
    const leaverName = db.prepare("SELECT name FROM profiles WHERE id = ?").get(profileId) as { name: string };
    if (creatorUser) {
      createNotification(
        creatorUser.user_id,
        "member_cancelled",
        "Player cancelled",
        `${leaverName.name} cancelled from "${group.title || group.city}"`,
        groupId
      );
    }
  }

  return { refund: refundAmount, tier };
}

export function getGroupWithMembers(groupId: string): GroupWithMembers | null {
  const db = getDb();
  const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as Group | undefined;
  if (!group) return null;

  const members = db.prepare(`
    SELECT gm.profile_id, gm.stake_amount, gm.status, gm.joined_at,
           p.name, p.skill_level, p.reliability_score
    FROM group_members gm
    JOIN profiles p ON gm.profile_id = p.id
    WHERE gm.group_id = ? AND gm.status = 'active'
    ORDER BY gm.joined_at ASC
  `).all(groupId) as GroupMember[];

  return { ...group, members };
}

export function getGroupsForProfile(profileId: string): GroupWithMembers[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT g.* FROM groups g
    JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.profile_id = ? AND gm.status = 'active'
    ORDER BY g.created_at DESC
  `).all(profileId) as Group[];

  return rows.map((g) => {
    const members = db.prepare(`
      SELECT gm.profile_id, gm.stake_amount, gm.status, gm.joined_at,
             p.name, p.skill_level, p.reliability_score
      FROM group_members gm
      JOIN profiles p ON gm.profile_id = p.id
      WHERE gm.group_id = ? AND gm.status = 'active'
    `).all(g.id) as GroupMember[];
    return { ...g, members };
  });
}

export function browseGroups(city?: string, skillLevel?: number, sport?: string): GroupWithMembers[] {
  const db = getDb();
  let query = "SELECT * FROM groups WHERE status = 'forming'";
  const params: (string | number)[] = [];

  if (city) {
    query += " AND LOWER(city) = LOWER(?)";
    params.push(city);
  }

  if (sport) {
    query += " AND sport = ?";
    params.push(sport);
  }

  if (skillLevel) {
    query += " AND min_skill <= ? AND max_skill >= ?";
    params.push(skillLevel, skillLevel);
  }

  query += " ORDER BY created_at DESC";

  const groups = db.prepare(query).all(...params) as Group[];

  return groups.map((g) => {
    const members = db.prepare(`
      SELECT gm.profile_id, gm.stake_amount, gm.status, gm.joined_at,
             p.name, p.skill_level, p.reliability_score
      FROM group_members gm
      JOIN profiles p ON gm.profile_id = p.id
      WHERE gm.group_id = ? AND gm.status = 'active'
    `).all(g.id) as GroupMember[];
    return { ...g, members };
  });
}

export function getBookingsForGroup(groupId: string): Booking[] {
  const db = getDb();
  return db.prepare("SELECT * FROM bookings WHERE group_id = ?").all(groupId) as Booking[];
}

// Legacy - kept for backward compatibility
export function leaveGroup(groupId: string, profileId: string): boolean {
  const db = getDb();
  const group = db.prepare("SELECT status FROM groups WHERE id = ?").get(groupId) as { status: string } | undefined;
  if (!group) return false;
  if (group.status !== "forming") return false;

  const result = db.prepare("DELETE FROM group_members WHERE group_id = ? AND profile_id = ?").run(groupId, profileId);
  return result.changes > 0;
}

export function getAllGroups(): GroupWithMembers[] {
  const db = getDb();
  const groups = db.prepare("SELECT * FROM groups ORDER BY created_at DESC").all() as Group[];
  return groups.map((g) => {
    const members = db.prepare(`
      SELECT gm.profile_id, gm.stake_amount, gm.status, gm.joined_at,
             p.name, p.skill_level, p.reliability_score
      FROM group_members gm
      JOIN profiles p ON gm.profile_id = p.id
      WHERE gm.group_id = ?
    `).all(g.id) as GroupMember[];
    return { ...g, members };
  });
}
