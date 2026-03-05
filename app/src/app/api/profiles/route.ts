import { NextRequest, NextResponse } from "next/server";
import { createProfile, getAllProfiles } from "@/lib/profiles";
import { validateProfile, sanitizeString } from "@/lib/validation";
import { getUserBySession, getProfileForUser } from "@/lib/auth";

export async function GET() {
  const profiles = getAllProfiles();
  return NextResponse.json(profiles);
}

export async function POST(req: NextRequest) {
  // Require authentication
  const token = req.cookies.get("session")?.value;
  const user = token ? getUserBySession(token) : null;
  if (!user) {
    return NextResponse.json({ error: "Must be logged in to create a profile" }, { status: 401 });
  }

  // One profile per user
  const existing = getProfileForUser(user.id);
  if (existing) {
    return NextResponse.json({ error: "You already have a profile", profile_id: existing.id }, { status: 409 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const errors = validateProfile(body);
  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  const profile = createProfile({
    user_id: user.id,
    name: sanitizeString(body.name as string),
    age: body.age as number,
    languages: (body.languages as string[] | undefined) ?? [],
    skill_level: body.skill_level as number,
    latitude: body.latitude as number | undefined,
    longitude: body.longitude as number | undefined,
    city: body.city ? sanitizeString(body.city as string) : undefined,
    bio: body.bio ? sanitizeString(body.bio as string) : undefined,
    preferred_age_min: body.preferred_age_min as number | undefined,
    preferred_age_max: body.preferred_age_max as number | undefined,
    preferred_skill_min: body.preferred_skill_min as number | undefined,
    preferred_skill_max: body.preferred_skill_max as number | undefined,
  });

  return NextResponse.json(profile, { status: 201 });
}
