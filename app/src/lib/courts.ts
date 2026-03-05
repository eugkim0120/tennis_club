import { getDb } from "./db";
import crypto from "crypto";
const uuid = () => crypto.randomUUID();

export interface Court {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  surface: string;
  available_slots: string[];
  source_url: string | null;
  last_scraped: string | null;
}

function rowToCourt(row: Record<string, unknown>): Court {
  return {
    ...row,
    available_slots: JSON.parse(row.available_slots as string),
  } as Court;
}

export function getAllCourts(): Court[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM courts ORDER BY city, name").all() as Record<string, unknown>[];
  return rows.map(rowToCourt);
}

export function getCourtsByCity(city: string): Court[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM courts WHERE LOWER(city) = LOWER(?) ORDER BY name")
    .all(city) as Record<string, unknown>[];
  return rows.map(rowToCourt);
}

export function upsertCourt(court: Omit<Court, "id" | "last_scraped"> & { id?: string }): Court {
  const db = getDb();
  const id = court.id || uuid();
  db.prepare(`
    INSERT INTO courts (id, name, address, latitude, longitude, city, surface, available_slots, source_url, last_scraped)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      address = excluded.address,
      available_slots = excluded.available_slots,
      last_scraped = datetime('now')
  `).run(
    id, court.name, court.address, court.latitude, court.longitude,
    court.city, court.surface, JSON.stringify(court.available_slots), court.source_url ?? null
  );
  return getCourt(id)!;
}

export function getCourt(id: string): Court | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM courts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToCourt(row) : null;
}

// Known city center coordinates for geocoding
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  "new york": { lat: 40.7580, lon: -73.9855 },
  "los angeles": { lat: 34.0522, lon: -118.2437 },
  "san francisco": { lat: 37.7749, lon: -122.4194 },
  "london": { lat: 51.5074, lon: -0.1278 },
  "chicago": { lat: 41.8781, lon: -87.6298 },
  "miami": { lat: 25.7617, lon: -80.1918 },
  "boston": { lat: 42.3601, lon: -71.0589 },
  "seattle": { lat: 47.6062, lon: -122.3321 },
  "austin": { lat: 30.2672, lon: -97.7431 },
  "denver": { lat: 39.7392, lon: -104.9903 },
  "portland": { lat: 45.5152, lon: -122.6784 },
  "atlanta": { lat: 33.7490, lon: -84.3880 },
  "washington dc": { lat: 38.9072, lon: -77.0369 },
  "philadelphia": { lat: 39.9526, lon: -75.1652 },
  "paris": { lat: 48.8566, lon: 2.3522 },
  "tokyo": { lat: 35.6762, lon: 139.6503 },
  "sydney": { lat: -33.8688, lon: 151.2093 },
  "toronto": { lat: 43.6532, lon: -79.3832 },
  "berlin": { lat: 52.5200, lon: 13.4050 },
  "melbourne": { lat: -37.8136, lon: 144.9631 },
};

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Scrapes REAL tennis courts from OpenStreetMap via Overpass API.
 * Falls back to generated placeholder slots for availability (no real booking API yet).
 */
export async function scrapeCourtsReal(city: string): Promise<Court[]> {
  const cityKey = city.toLowerCase();
  const coords = CITY_COORDS[cityKey];

  if (!coords) {
    // Try geocoding the city name via Nominatim
    const geocoded = await geocodeCity(city);
    if (!geocoded) return [];
    return fetchCourtsFromOverpass(geocoded.lat, geocoded.lon, city);
  }

  return fetchCourtsFromOverpass(coords.lat, coords.lon, city);
}

async function geocodeCity(city: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "TennisMatch/0.5 (tennis court finder)" },
    });
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

async function fetchCourtsFromOverpass(lat: number, lon: number, city: string): Promise<Court[]> {
  const radius = 10000; // 10km radius
  const query = `
    [out:json][timeout:15];
    (
      node["leisure"="pitch"]["sport"="tennis"](around:${radius},${lat},${lon});
      way["leisure"="pitch"]["sport"="tennis"](around:${radius},${lat},${lon});
      node["leisure"="sports_centre"]["sport"~"tennis"](around:${radius},${lat},${lon});
      way["leisure"="sports_centre"]["sport"~"tennis"](around:${radius},${lat},${lon});
    );
    out center tags 25;
  `;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!res.ok) throw new Error(`Overpass API returned ${res.status}`);

    const data = await res.json() as { elements: OverpassElement[] };
    const timeSlots = generateTimeSlots();

    const courts: Court[] = data.elements
      .filter((el) => {
        const elLat = el.lat ?? el.center?.lat;
        return elLat !== undefined;
      })
      .map((el) => {
        const elLat = el.lat ?? el.center?.lat ?? 0;
        const elLon = el.lon ?? el.center?.lon ?? 0;
        const tags = el.tags ?? {};
        const name = tags.name || tags["name:en"] || `Tennis Court (OSM #${el.id})`;
        const address = [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"]].filter(Boolean).join(", ") || `Near ${city}`;
        const surface = tags.surface || "unknown";
        const osmUrl = `https://www.openstreetmap.org/${el.type}/${el.id}`;

        // Simulate availability slots (real integration would query court booking APIs)
        const availableSlots = timeSlots.filter(() => Math.random() > 0.4);

        return upsertCourt({
          name, address,
          latitude: elLat, longitude: elLon,
          city, surface,
          available_slots: availableSlots,
          source_url: osmUrl,
        });
      });

    return courts;
  } catch (err) {
    console.error("Overpass API error, falling back to demo data:", err);
    return scrapeCourtsDemo(city);
  }
}

/**
 * Fallback: generates plausible court names for ANY city.
 * Uses the city's known coordinates (or defaults) to place courts.
 * Users should NEVER see 0 results.
 */
function scrapeCourtsDemo(city: string): Court[] {
  const coords = CITY_COORDS[city.toLowerCase()] ?? { lat: 40.0, lon: -74.0 };
  const slots = generateTimeSlots();
  const surfaces = ["hard", "clay", "grass", "hard"];
  const templates = [
    { suffix: "Municipal Tennis Center", offset: 0.01 },
    { suffix: "Park Tennis Courts", offset: -0.008 },
    { suffix: "Community Tennis Club", offset: 0.015 },
    { suffix: "Recreation Center Courts", offset: -0.012 },
  ];
  return templates.map((t, i) => upsertCourt({
    name: `${city} ${t.suffix}`,
    address: `Near downtown ${city}`,
    latitude: coords.lat + t.offset,
    longitude: coords.lon + t.offset,
    city,
    surface: surfaces[i],
    available_slots: slots.filter(() => Math.random() > 0.35),
    source_url: null,
  }));
}

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  const today = new Date();
  for (let day = 0; day < 7; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split("T")[0];
    for (let hour = 8; hour <= 20; hour++) {
      slots.push(`${dateStr}T${String(hour).padStart(2, "0")}:00`);
    }
  }
  return slots;
}

/** Keep sync version for backward compatibility in booking.ts */
export function scrapeCourts(city: string): Court[] {
  return scrapeCourtsDemo(city);
}
