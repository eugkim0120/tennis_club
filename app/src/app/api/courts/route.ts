import { NextRequest, NextResponse } from "next/server";
import { getAllCourts, getCourtsByCity, scrapeCourts, Court } from "@/lib/courts";

function formatSlot(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function enrichCourt(court: Court) {
  return {
    ...court,
    available_slots_formatted: court.available_slots.map((s) => ({
      iso: s,
      display: formatSlot(s),
    })),
  };
}

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get("city");

  if (city) {
    const courts = getCourtsByCity(city);
    return NextResponse.json(courts.map(enrichCourt));
  }

  return NextResponse.json(getAllCourts().map(enrichCourt));
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { city } = body as { city: string };

  if (!city) {
    return NextResponse.json({ error: "city is required" }, { status: 400 });
  }

  const courts = scrapeCourts(city);
  return NextResponse.json({ scraped: courts.length, courts: courts.map(enrichCourt) });
}
