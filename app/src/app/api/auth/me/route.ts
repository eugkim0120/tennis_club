import { NextRequest, NextResponse } from "next/server";
import { getUserBySession, getProfileForUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = getUserBySession(token);
  if (!user) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const profile = getProfileForUser(user.id);

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    profile_id: profile?.id ?? null,
  });
}
