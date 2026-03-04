import { NextRequest, NextResponse } from "next/server";
import { getOrCreateGroup, joinGroup, getGroupsForProfile, getAllGroups } from "@/lib/booking";

export async function GET(req: NextRequest) {
  const profileId = req.nextUrl.searchParams.get("profile_id");

  if (profileId) {
    const groups = getGroupsForProfile(profileId);
    return NextResponse.json(groups);
  }

  return NextResponse.json(getAllGroups());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { profile_id, city } = body;

  if (!profile_id || !city) {
    return NextResponse.json({ error: "profile_id and city are required" }, { status: 400 });
  }

  const group = getOrCreateGroup(city);
  const updated = joinGroup(group.id, profile_id);

  return NextResponse.json(updated);
}
