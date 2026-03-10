import { NextRequest, NextResponse } from "next/server";
import { getUserBySession, getProfileForUser } from "@/lib/auth";
import { checkIn } from "@/lib/settlement";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await params;

  const token = req.cookies.get("session")?.value;
  const user = token ? getUserBySession(token) : null;
  if (!user) return NextResponse.json({ error: "Must be logged in" }, { status: 401 });

  const profile = getProfileForUser(user.id);
  if (!profile) return NextResponse.json({ error: "Create a profile first" }, { status: 400 });

  const db = getDb();
  const booking = db.prepare("SELECT id FROM bookings WHERE group_id = ? AND status = 'confirmed'").get(groupId) as { id: string } | undefined;
  if (!booking) return NextResponse.json({ error: "No confirmed booking for this group" }, { status: 400 });

  const success = checkIn(booking.id, profile.id);
  if (!success) return NextResponse.json({ error: "Check-in failed" }, { status: 400 });

  return NextResponse.json({ checked_in: true });
}
