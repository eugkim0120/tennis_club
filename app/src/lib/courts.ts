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
      available_slots = excluded.available_slots,
      last_scraped = datetime('now')
  `).run(
    id,
    court.name,
    court.address,
    court.latitude,
    court.longitude,
    court.city,
    court.surface,
    JSON.stringify(court.available_slots),
    court.source_url ?? null
  );
  return getCourt(id)!;
}

export function getCourt(id: string): Court | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM courts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToCourt(row) : null;
}

/**
 * Simulates scraping tennis courts for a city.
 * In production, this would use Playwright/Puppeteer to scrape real court sites.
 * For MVP, we seed realistic demo data.
 */
export function scrapeCourts(city: string): Court[] {
  const courtData: Record<string, Array<{ name: string; address: string; lat: number; lng: number; surface: string }>> = {
    "new york": [
      { name: "Central Park Tennis Center", address: "West 93rd St, New York, NY", lat: 40.7912, lng: -73.9665, surface: "hard" },
      { name: "USTA Billie Jean King National Tennis Center", address: "Flushing Meadows, Queens, NY", lat: 40.7501, lng: -73.8458, surface: "hard" },
      { name: "Riverside Clay Tennis Association", address: "Riverside Dr & 97th St, NY", lat: 40.7977, lng: -73.9727, surface: "clay" },
      { name: "Fort Greene Park Tennis Courts", address: "DeKalb Ave, Brooklyn, NY", lat: 40.6892, lng: -73.9762, surface: "hard" },
    ],
    "los angeles": [
      { name: "Griffith Park Tennis Courts", address: "3401 Riverside Dr, LA, CA", lat: 34.1381, lng: -118.2626, surface: "hard" },
      { name: "Venice Beach Tennis Courts", address: "2300 Ocean Front Walk, LA, CA", lat: 33.9925, lng: -118.4714, surface: "hard" },
      { name: "Poinsettia Park Tennis Courts", address: "7341 Willoughby Ave, LA, CA", lat: 34.0837, lng: -118.3518, surface: "hard" },
    ],
    "san francisco": [
      { name: "Golden Gate Park Tennis Complex", address: "Golden Gate Park, SF, CA", lat: 37.7694, lng: -122.4569, surface: "hard" },
      { name: "Dolores Park Tennis Courts", address: "19th St & Dolores St, SF, CA", lat: 37.7596, lng: -122.4269, surface: "hard" },
      { name: "Alice Marble Tennis Courts", address: "Greenwich St, SF, CA", lat: 37.8007, lng: -122.4159, surface: "hard" },
    ],
    london: [
      { name: "Hyde Park Tennis Centre", address: "South Carriage Dr, London", lat: 51.5053, lng: -0.1675, surface: "hard" },
      { name: "Regent's Park Tennis Centre", address: "York Bridge, London", lat: 51.5278, lng: -0.1554, surface: "hard" },
      { name: "Islington Tennis Centre", address: "Market Rd, London", lat: 51.5479, lng: -0.1085, surface: "hard" },
    ],
  };

  const cityKey = city.toLowerCase();
  const courts = courtData[cityKey];
  if (!courts) return [];

  const timeSlots = generateTimeSlots();

  return courts.map((c) => {
    const randomSlots = timeSlots.filter(() => Math.random() > 0.4);
    return upsertCourt({
      name: c.name,
      address: c.address,
      latitude: c.lat,
      longitude: c.lng,
      city,
      surface: c.surface,
      available_slots: randomSlots,
      source_url: null,
    });
  });
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
