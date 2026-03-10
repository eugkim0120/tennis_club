import { NextRequest, NextResponse } from "next/server";
import { getGroupWithMembers } from "@/lib/booking";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const group = getGroupWithMembers(id);
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  return NextResponse.json(group);
}
