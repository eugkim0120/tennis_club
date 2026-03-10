import { NextRequest, NextResponse } from "next/server";
import { getUserBySession, getProfileForUser } from "@/lib/auth";
import { joinGroup } from "@/lib/booking";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await params;

  const token = req.cookies.get("session")?.value;
  const user = token ? getUserBySession(token) : null;
  if (!user) return NextResponse.json({ error: "Must be logged in" }, { status: 401 });

  const profile = getProfileForUser(user.id);
  if (!profile) return NextResponse.json({ error: "Create a profile first" }, { status: 400 });

  try {
    const group = joinGroup(groupId, profile.id, user.id);
    return NextResponse.json(group);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
