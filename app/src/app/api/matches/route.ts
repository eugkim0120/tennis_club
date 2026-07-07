import { NextRequest, NextResponse } from "next/server";
import { computeStandouts, expressInterest, passOnProfile, getMutualMatches } from "@/lib/matching";

export async function GET(req: NextRequest) {
  const profileId = req.nextUrl.searchParams.get("profile_id");
  const sport = req.nextUrl.searchParams.get("sport") ?? undefined;
  const type = req.nextUrl.searchParams.get("type") ?? "standouts";

  if (!profileId) {
    return NextResponse.json({ error: "profile_id is required" }, { status: 400 });
  }

  if (type === "mutual") {
    const matches = getMutualMatches(profileId);
    return NextResponse.json(matches);
  }

  const standouts = computeStandouts(profileId, 10, sport);
  return NextResponse.json(standouts);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { profile_id, target_id, action } = body as { profile_id: string; target_id: string; action: string };

  if (!profile_id || !target_id || !action) {
    return NextResponse.json({ error: "profile_id, target_id, and action are required" }, { status: 400 });
  }

  if (profile_id === target_id) {
    return NextResponse.json({ error: "Cannot match with yourself" }, { status: 400 });
  }

  if (action !== "interested" && action !== "pass") {
    return NextResponse.json({ error: "action must be 'interested' or 'pass'" }, { status: 400 });
  }

  if (action === "interested") {
    const match = expressInterest(profile_id, target_id);
    return NextResponse.json(match);
  }

  passOnProfile(profile_id, target_id);
  return NextResponse.json({ status: "passed", profile_id, target_id });
}
