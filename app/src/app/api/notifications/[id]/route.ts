import { NextRequest, NextResponse } from "next/server";
import { getUserBySession } from "@/lib/auth";
import { markAsRead } from "@/lib/notifications";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const token = req.cookies.get("session")?.value;
  const user = token ? getUserBySession(token) : null;
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  markAsRead(id);
  return NextResponse.json({ ok: true });
}
