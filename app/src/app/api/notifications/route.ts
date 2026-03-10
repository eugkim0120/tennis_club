import { NextRequest, NextResponse } from "next/server";
import { getUserBySession } from "@/lib/auth";
import { getNotifications, getUnreadCount, markAllAsRead } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const user = token ? getUserBySession(token) : null;
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const notifications = getNotifications(user.id);
  const unread_count = getUnreadCount(user.id);

  return NextResponse.json({ notifications, unread_count });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const user = token ? getUserBySession(token) : null;
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  markAllAsRead(user.id);
  return NextResponse.json({ ok: true });
}
