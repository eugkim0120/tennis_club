import { NextRequest, NextResponse } from "next/server";
import {
  getAllCourts, getCourtsByCity, getCourt, searchCourts,
  scrapeAllSources, enrichBookingMethods, detectBookingMethod,
  Court,
} from "@/lib/courts";

function formatSlot(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
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
  const sport = req.nextUrl.searchParams.get("sport") ?? undefined;
  const id = req.nextUrl.searchParams.get("id");
  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");
  const radius = req.nextUrl.searchParams.get("radius");

  // Single court by ID
  if (id) {
    const court = getCourt(id);
    if (!court) return NextResponse.json({ error: "Court not found" }, { status: 404 });
    return NextResponse.json(enrichCourt(court));
  }

  // Geo search by lat/lon/radius
  if (lat && lon) {
    const radiusKm = parseFloat(radius || "10");
    const courts = searchCourts(parseFloat(lat), parseFloat(lon), radiusKm);
    return NextResponse.json(courts.map(enrichCourt));
  }

    // Filter by city (with optional sport)
  if (city) {
    return NextResponse.json(getCourtsByCity(city, sport).map(enrichCourt));
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

  const action = body.action as string | undefined;

  // Action: detect booking method for a single court
  if (action === "detect_booking") {
    const courtId = body.court_id as string;
    if (!courtId) return NextResponse.json({ error: "court_id required" }, { status: 400 });
    const court = getCourt(courtId);
    if (!court) return NextResponse.json({ error: "Court not found" }, { status: 404 });
    const detection = await detectBookingMethod(court);
    return NextResponse.json(detection);
  }

  // Action: enrich booking methods for all courts in a city
  if (action === "enrich_bookings") {
    const city = body.city as string;
    if (!city) return NextResponse.json({ error: "city required" }, { status: 400 });
    const courts = getCourtsByCity(city);
    const detections = await enrichBookingMethods(courts);
    return NextResponse.json({ enriched: detections.length, detections });
  }

  // Default: scrape courts for a city
  const city = body.city as string;
  if (!city) return NextResponse.json({ error: "city is required" }, { status: 400 });

  const result = await scrapeAllSources(city);

  return NextResponse.json({
    scraped: result.total,
    sources: result.sources_used,
    center: result.center,
    courts: result.courts.map(enrichCourt),
  });
}
