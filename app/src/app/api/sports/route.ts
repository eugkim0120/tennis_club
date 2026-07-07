import { NextResponse } from "next/server";
import { getSports } from "@/lib/sports";

export async function GET() {
  return NextResponse.json(getSports());
}
