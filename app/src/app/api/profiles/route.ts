import { NextRequest, NextResponse } from "next/server";
import { createProfile, getAllProfiles } from "@/lib/profiles";

export async function GET() {
  const profiles = getAllProfiles();
  return NextResponse.json(profiles);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.name || !body.age || !body.skill_level) {
    return NextResponse.json({ error: "name, age, and skill_level are required" }, { status: 400 });
  }

  const profile = createProfile({
    name: body.name,
    age: body.age,
    languages: body.languages ?? [],
    skill_level: body.skill_level,
    latitude: body.latitude,
    longitude: body.longitude,
    city: body.city,
    bio: body.bio,
    preferred_age_min: body.preferred_age_min,
    preferred_age_max: body.preferred_age_max,
    preferred_skill_min: body.preferred_skill_min,
    preferred_skill_max: body.preferred_skill_max,
  });

  return NextResponse.json(profile, { status: 201 });
}
