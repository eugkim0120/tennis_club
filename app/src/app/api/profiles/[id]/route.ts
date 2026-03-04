import { NextRequest, NextResponse } from "next/server";
import { getProfile, updateProfile, deleteProfile } from "@/lib/profiles";
import { validateProfile, sanitizeString } from "@/lib/validation";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = getProfile(id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = getProfile(id);
  if (!existing) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Merge with existing for validation
  const merged = {
    name: body.name ?? existing.name,
    age: body.age ?? existing.age,
    skill_level: body.skill_level ?? existing.skill_level,
    languages: body.languages ?? existing.languages,
    bio: body.bio ?? existing.bio,
  };

  const errors = validateProfile(merged);
  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = sanitizeString(body.name as string);
  if (body.age) updates.age = body.age;
  if (body.skill_level) updates.skill_level = body.skill_level;
  if (body.languages) updates.languages = body.languages;
  if (body.city) updates.city = sanitizeString(body.city as string);
  if (body.bio !== undefined) updates.bio = sanitizeString(body.bio as string);

  const updated = updateProfile(id, updates);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = deleteProfile(id);
  if (!deleted) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
