import { NextRequest, NextResponse } from "next/server";
import { computeStandouts, expressInterest, passOnProfile, getMutualMatches } from "@/lib/matching";

export async function GET(req: NextRequest) {
  const profileId = req.nextUrl.searchParams.get("profile_id");
  const type = req.nextUrl.searchParams.get("type") ?? "standouts";

  if (!profileId) {
    return NextResponse.json({ error: "profile_id is required" }, { status: 400 });
  }

  if (type === "mutual") {
    const matches = getMutualMatches(profileId);
    return NextResponse.json(matches);
  }

  const standouts = computeStandouts(profileId);
  return NextResponse.json(standouts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { profile_id, target_id, action } = body;

  if (!profile_id || !target_id || !action) {
    return NextResponse.json({ error: "profile_id, target_id, and action are required" }, { status: 400 });
  }

  if (action === "interested") {
    const match = expressInterest(profile_id, target_id);
    return NextResponse.json(match);
  } else if (action === "pass") {
    passOnProfile(profile_id, target_id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "action must be 'interested' or 'pass'" }, { status: 400 });
}
