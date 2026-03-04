import { NextRequest, NextResponse } from "next/server";
import { getAllCourts, getCourtsByCity, scrapeCourts } from "@/lib/courts";

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get("city");

  if (city) {
    const courts = getCourtsByCity(city);
    return NextResponse.json(courts);
  }

  return NextResponse.json(getAllCourts());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { city } = body;

  if (!city) {
    return NextResponse.json({ error: "city is required" }, { status: 400 });
  }

  const courts = scrapeCourts(city);
  return NextResponse.json({ scraped: courts.length, courts });
}
