import { NextRequest, NextResponse } from "next/server";
import { getOrCreateGroup, joinGroup, getGroupsForProfile, getAllGroups } from "@/lib/booking";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const profileId = req.nextUrl.searchParams.get("profile_id");

  if (profileId) {
    const groups = getGroupsForProfile(profileId);
    return NextResponse.json(groups);
  }

  return NextResponse.json(getAllGroups());
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { profile_id, city } = body as { profile_id: string; city: string };

  if (!profile_id || !city) {
    return NextResponse.json({ error: "profile_id and city are required" }, { status: 400 });
  }

  if (typeof profile_id !== "string" || typeof city !== "string") {
    return NextResponse.json({ error: "profile_id and city must be strings" }, { status: 400 });
  }

  // Verify profile exists
  const db = getDb();
  const profile = db.prepare("SELECT id FROM profiles WHERE id = ?").get(profile_id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const group = getOrCreateGroup(city);
  const updated = joinGroup(group.id, profile_id);

  return NextResponse.json(updated);
}
