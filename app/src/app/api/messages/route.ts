import { NextRequest, NextResponse } from "next/server";
import { sendMessage, getMessages } from "@/lib/messages";
import { getUserBySession, getProfileForUser } from "@/lib/auth";
import { sanitizeString } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const groupId = req.nextUrl.searchParams.get("group_id");
  if (!groupId) {
    return NextResponse.json({ error: "group_id is required" }, { status: 400 });
  }

  const messages = getMessages(groupId);
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const user = token ? getUserBySession(token) : null;
  if (!user) {
    return NextResponse.json({ error: "Must be logged in" }, { status: 401 });
  }

  const profile = getProfileForUser(user.id);
  if (!profile) {
    return NextResponse.json({ error: "Create a profile first" }, { status: 400 });
  }

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { group_id, content } = body;
  if (!group_id || !content) {
    return NextResponse.json({ error: "group_id and content are required" }, { status: 400 });
  }

  if (content.length > 1000) {
    return NextResponse.json({ error: "Message too long (max 1000 chars)" }, { status: 400 });
  }

  try {
    const msg = sendMessage(group_id, profile.id, sanitizeString(content));
    return NextResponse.json(msg, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
