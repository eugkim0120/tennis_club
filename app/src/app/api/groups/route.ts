import { NextRequest, NextResponse } from "next/server";
import { getUserBySession, getProfileForUser } from "@/lib/auth";
import { createGroup, browseGroups } from "@/lib/booking";
import { sanitizeString } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get("city") ?? undefined;
  const skillStr = req.nextUrl.searchParams.get("skill");
  const skill = skillStr ? parseFloat(skillStr) : undefined;
  const sport = req.nextUrl.searchParams.get("sport") ?? undefined;

  const groups = browseGroups(city, skill, sport);
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const user = token ? getUserBySession(token) : null;
  if (!user) return NextResponse.json({ error: "Must be logged in" }, { status: 401 });

  const profile = getProfileForUser(user.id);
  if (!profile) return NextResponse.json({ error: "Create a profile first" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, city, description, scheduled_time, court_id, join_mode, stake_amount, min_skill, max_skill, min_reliability, max_members, sport } = body as Record<string, string | number>;

  if (!title || !city) {
    return NextResponse.json({ error: "title and city are required" }, { status: 400 });
  }

  try {
    const group = createGroup({
      creatorProfileId: profile.id,
      creatorUserId: user.id,
      title: sanitizeString(title as string),
      city: sanitizeString(city as string),
      description: description ? sanitizeString(description as string) : undefined,
      scheduledTime: scheduled_time as string | undefined,
      courtId: court_id as string | undefined,
      joinMode: (join_mode as "open" | "approval") ?? "open",
      stakeAmount: stake_amount ? Number(stake_amount) : undefined,
      minSkill: min_skill ? Number(min_skill) : undefined,
      maxSkill: max_skill ? Number(max_skill) : undefined,
      minReliability: min_reliability ? Number(min_reliability) : undefined,
      maxMembers: max_members ? Number(max_members) : undefined,
      sport: sport as string | undefined,
    });
    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
