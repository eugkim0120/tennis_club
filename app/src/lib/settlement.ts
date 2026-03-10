import { getDb } from "./db";
import crypto from "crypto";
import { refundCredits, bonusCredits } from "./wallet";
import { createNotification } from "./notifications";

const uuid = () => crypto.randomUUID();

export function checkIn(bookingId: string, profileId: string): boolean {
  const db = getDb();

  // Verify booking exists and is confirmed
  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId) as { group_id: string; status: string } | undefined;
  if (!booking || booking.status !== "confirmed") return false;

  // Verify profile is a member of the group
  const member = db
    .prepare("SELECT 1 FROM group_members WHERE group_id = ? AND profile_id = ? AND status = 'active'")
    .get(booking.group_id, profileId);
  if (!member) return false;

  // Insert check-in (idempotent via UNIQUE constraint)
  try {
    db.prepare("INSERT INTO check_ins (id, booking_id, profile_id) VALUES (?, ?, ?)").run(uuid(), bookingId, profileId);
  } catch {
    // Already checked in
  }

  return true;
}

export function settleGame(groupId: string): { attended: string[]; noShows: string[] } {
  const db = getDb();

  const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as {
    id: string; status: string; city: string;
  } | undefined;
  if (!group || group.status !== "booked") throw new Error("Group is not booked");

  const booking = db.prepare("SELECT * FROM bookings WHERE group_id = ? AND status = 'confirmed'").get(groupId) as {
    id: string;
  } | undefined;
  if (!booking) throw new Error("No confirmed booking found");

  // Get all active members
  const members = db
    .prepare("SELECT gm.profile_id, gm.stake_amount, p.user_id FROM group_members gm JOIN profiles p ON gm.profile_id = p.id WHERE gm.group_id = ? AND gm.status = 'active'")
    .all(groupId) as { profile_id: string; stake_amount: number; user_id: string }[];

  // Get check-ins
  const checkedIn = db
    .prepare("SELECT profile_id FROM check_ins WHERE booking_id = ?")
    .all(booking.id) as { profile_id: string }[];
  const checkedInIds = new Set(checkedIn.map((c) => c.profile_id));

  const attended: string[] = [];
  const noShows: string[] = [];
  let noShowPool = 0;

  for (const member of members) {
    if (checkedInIds.has(member.profile_id)) {
      attended.push(member.profile_id);
      // Refund staked credits
      refundCredits(member.user_id, member.stake_amount, groupId, "Stake refund - attended game");
      // Update member status
      db.prepare("UPDATE group_members SET status = 'attended' WHERE group_id = ? AND profile_id = ?").run(groupId, member.profile_id);
      // Update games stats
      db.prepare("UPDATE profiles SET games_played = games_played + 1, games_attended = games_attended + 1 WHERE id = ?").run(member.profile_id);
    } else {
      noShows.push(member.profile_id);
      noShowPool += member.stake_amount;
      // Update member status
      db.prepare("UPDATE group_members SET status = 'no_show' WHERE group_id = ? AND profile_id = ?").run(groupId, member.profile_id);
      // Update games stats (played but not attended)
      db.prepare("UPDATE profiles SET games_played = games_played + 1 WHERE id = ?").run(member.profile_id);
    }
  }

  // Distribute no-show pool among attendees
  if (attended.length > 0 && noShowPool > 0) {
    const bonusPerPerson = Math.floor(noShowPool / attended.length);
    for (const profileId of attended) {
      const member = members.find((m) => m.profile_id === profileId)!;
      bonusCredits(member.user_id, bonusPerPerson, groupId, `No-show bonus (${noShows.length} no-show${noShows.length > 1 ? "s" : ""})`);
    }
  }

  // Update reliability scores
  for (const member of members) {
    const profile = db.prepare("SELECT games_played, games_attended FROM profiles WHERE id = ?").get(member.profile_id) as {
      games_played: number; games_attended: number;
    };
    const reliability = profile.games_played > 0 ? profile.games_attended / profile.games_played : 1.0;
    db.prepare("UPDATE profiles SET reliability_score = ? WHERE id = ?").run(reliability, member.profile_id);
  }

  // Mark group as completed
  db.prepare("UPDATE groups SET status = 'completed' WHERE id = ?").run(groupId);

  // Send notifications
  for (const member of members) {
    const isAttended = checkedInIds.has(member.profile_id);
    createNotification(
      member.user_id,
      "game_settled",
      isAttended ? "Game completed!" : "Missed game",
      isAttended
        ? `You attended the game. Your ${member.stake_amount} credits have been refunded.${noShowPool > 0 ? ` Plus bonus from no-shows!` : ""}`
        : `You missed the game. Your ${member.stake_amount} staked credits have been forfeited.`,
      groupId
    );
  }

  return { attended, noShows };
}

export function getCancellationRefund(scheduledTime: string, stakeAmount: number): { refund: number; reliabilityHit: number; tier: string } {
  const now = new Date();
  const gameTime = new Date(scheduledTime);
  const hoursUntil = (gameTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil > 24) {
    return { refund: stakeAmount, reliabilityHit: 0, tier: "full" };
  } else if (hoursUntil > 12) {
    return { refund: Math.floor(stakeAmount * 0.5), reliabilityHit: 0.02, tier: "half" };
  } else {
    return { refund: 0, reliabilityHit: 0.05, tier: "none" };
  }
}
