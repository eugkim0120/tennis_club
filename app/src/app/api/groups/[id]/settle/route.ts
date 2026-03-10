import { NextRequest, NextResponse } from "next/server";
import { getUserBySession, getProfileForUser } from "@/lib/auth";
import { settleGame } from "@/lib/settlement";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await params;

  const token = req.cookies.get("session")?.value;
  const user = token ? getUserBySession(token) : null;
  if (!user) return NextResponse.json({ error: "Must be logged in" }, { status: 401 });

  const profile = getProfileForUser(user.id);
  if (!profile) return NextResponse.json({ error: "Create a profile first" }, { status: 400 });

  // Only group creator can settle
  const db = getDb();
  const group = db.prepare("SELECT creator_id FROM groups WHERE id = ?").get(groupId) as { creator_id: string } | undefined;
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (group.creator_id !== profile.id) {
    return NextResponse.json({ error: "Only the group creator can settle the game" }, { status: 403 });
  }

  try {
    const result = settleGame(groupId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
