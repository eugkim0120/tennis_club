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
  phone: string | null;
  website: string | null;
  booking_url: string | null;
  booking_method: string;
  hours: string | null;
  rating: number | null;
  photo_url: string | null;
  num_courts: number;
  indoor: boolean;
  lit: boolean;
  access_type: string;
  operator: string | null;
  data_sources: string[];
  sport: string;
}

function rowToCourt(row: Record<string, unknown>): Court {
  return {
    ...row,
    available_slots: JSON.parse(row.available_slots as string || "[]"),
    data_sources: JSON.parse(row.data_sources as string || "[]"),
    sport: (row.sport as string) || "tennis",
    indoor: row.indoor === 1,
    lit: row.lit === 1,
  } as Court;
}

export function getAllCourts(): Court[] {
  const db = getDb();
  return (db.prepare("SELECT * FROM courts ORDER BY city, name").all() as Record<string, unknown>[]).map(rowToCourt);
}

export function getCourtsByCity(city: string, sport?: string): Court[] {
  const db = getDb();
  if (sport) {
    return (db.prepare("SELECT * FROM courts WHERE LOWER(city) = LOWER(?) AND sport = ? ORDER BY name").all(city, sport) as Record<string, unknown>[]).map(rowToCourt);
  }
  return (db.prepare("SELECT * FROM courts WHERE LOWER(city) = LOWER(?) ORDER BY name").all(city) as Record<string, unknown>[]).map(rowToCourt);
}

export function getCourt(id: string): Court | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM courts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToCourt(row) : null;
}

export function searchCourts(lat: number, lon: number, radiusKm: number, sport?: string): Court[] {
  const db = getDb();
  // Rough bounding box filter, then Haversine for accuracy
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
  const sportFilter = sport || null;
  const rows = db.prepare(`
    SELECT *, (
      6371 * acos(
        cos(? * 3.14159265 / 180) * cos(latitude * 3.14159265 / 180) *
        cos((longitude - ?) * 3.14159265 / 180) +
        sin(? * 3.14159265 / 180) * sin(latitude * 3.14159265 / 180)
      )
    ) AS distance
    FROM courts
    WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?
    AND (? IS NULL OR sport = ?)
    HAVING distance <= ?
    ORDER BY distance
  `).all(lat, lon, lat, lat - latDelta, lat + latDelta, lon - lonDelta, lon + lonDelta, sportFilter, sportFilter, radiusKm) as Record<string, unknown>[];
  return rows.map(rowToCourt);
}

interface UpsertCourtInput {
  id?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  surface?: string;
  available_slots?: string[];
  source_url?: string | null;
  phone?: string | null;
  website?: string | null;
  booking_url?: string | null;
  booking_method?: string;
  hours?: string | null;
  rating?: number | null;
  photo_url?: string | null;
  num_courts?: number;
  indoor?: boolean;
  lit?: boolean;
  access_type?: string;
  operator?: string | null;
  data_sources?: string[];
  sport?: string;
}

export function upsertCourt(input: UpsertCourtInput): Court {
  const db = getDb();
  const id = input.id || uuid();
  db.prepare(`
    INSERT INTO courts (id, name, address, latitude, longitude, city, surface, available_slots, source_url, last_scraped,
      phone, website, booking_url, booking_method, hours, rating, photo_url, num_courts, indoor, lit, access_type, operator, data_sources, sport)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, address = excluded.address, available_slots = excluded.available_slots,
      last_scraped = datetime('now'), phone = COALESCE(excluded.phone, courts.phone),
      website = COALESCE(excluded.website, courts.website), booking_url = COALESCE(excluded.booking_url, courts.booking_url),
      booking_method = CASE WHEN excluded.booking_method != 'unknown' THEN excluded.booking_method ELSE courts.booking_method END,
      hours = COALESCE(excluded.hours, courts.hours), rating = COALESCE(excluded.rating, courts.rating),
      photo_url = COALESCE(excluded.photo_url, courts.photo_url), num_courts = COALESCE(excluded.num_courts, courts.num_courts),
      indoor = excluded.indoor, lit = excluded.lit, access_type = CASE WHEN excluded.access_type != 'unknown' THEN excluded.access_type ELSE courts.access_type END,
      operator = COALESCE(excluded.operator, courts.operator), data_sources = excluded.data_sources
  `).run(
    id, input.name, input.address, input.latitude, input.longitude,
    input.city, input.surface ?? "hard", JSON.stringify(input.available_slots ?? []),
    input.source_url ?? null, input.phone ?? null, input.website ?? null,
    input.booking_url ?? null, input.booking_method ?? "unknown",
    input.hours ?? null, input.rating ?? null, input.photo_url ?? null,
    input.num_courts ?? 1, input.indoor ? 1 : 0, input.lit ? 1 : 0,
    input.access_type ?? "unknown", input.operator ?? null,
    JSON.stringify(input.data_sources ?? []),
    input.sport ?? "tennis"
  );
  return getCourt(id)!;
}

// ── Geocoding ──────────────────────────────────────────────────────

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
  "madrid": { lat: 40.4168, lon: -3.7038 },
  "rome": { lat: 41.9028, lon: 12.4964 },
  "amsterdam": { lat: 52.3676, lon: 4.9041 },
  "barcelona": { lat: 41.3851, lon: 2.1734 },
  "munich": { lat: 48.1351, lon: 11.5820 },
  "dubai": { lat: 25.2048, lon: 55.2708 },
  "singapore": { lat: 1.3521, lon: 103.8198 },
  "hong kong": { lat: 22.3193, lon: 114.1694 },
  "mumbai": { lat: 19.0760, lon: 72.8777 },
  "sao paulo": { lat: -23.5505, lon: -46.6333 },
  "dallas": { lat: 32.7767, lon: -96.7970 },
  "houston": { lat: 29.7604, lon: -95.3698 },
  "phoenix": { lat: 33.4484, lon: -112.0740 },
  "san diego": { lat: 32.7157, lon: -117.1611 },
  "minneapolis": { lat: 44.9778, lon: -93.2650 },
  "nashville": { lat: 36.1627, lon: -86.7816 },
  "charlotte": { lat: 35.2271, lon: -80.8431 },
  "indianapolis": { lat: 39.7684, lon: -86.1581 },
  "cape town": { lat: -33.9249, lon: 18.4241 },
  "lisbon": { lat: 38.7223, lon: -9.1393 },
};

export async function geocodeCity(city: string): Promise<{ lat: number; lon: number } | null> {
  const cached = CITY_COORDS[city.toLowerCase()];
  if (cached) return cached;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "TennisMatch/1.0 (tennis court discovery)" },
    });
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

// ── Source 1: OpenStreetMap Overpass API ────────────────────────────

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export async function scrapeFromOverpass(lat: number, lon: number, city: string, radiusM = 15000, sport: string = "tennis"): Promise<Court[]> {
  // Extended query: pitches, sports centres, sports halls, clubs
  const query = `
    [out:json][timeout:25];
    (
      node["leisure"="pitch"]["sport"~"${sport}"](around:${radiusM},${lat},${lon});
      way["leisure"="pitch"]["sport"~"${sport}"](around:${radiusM},${lat},${lon});
      relation["leisure"="pitch"]["sport"~"${sport}"](around:${radiusM},${lat},${lon});
      node["leisure"="sports_centre"]["sport"~"${sport}"](around:${radiusM},${lat},${lon});
      way["leisure"="sports_centre"]["sport"~"${sport}"](around:${radiusM},${lat},${lon});
      node["leisure"="sports_hall"]["sport"~"${sport}"](around:${radiusM},${lat},${lon});
      way["leisure"="sports_hall"]["sport"~"${sport}"](around:${radiusM},${lat},${lon});
      node["club"="sport"]["sport"~"${sport}"](around:${radiusM},${lat},${lon});
      way["club"="sport"]["sport"~"${sport}"](around:${radiusM},${lat},${lon});
    );
    out center tags 50;
  `;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (!res.ok) throw new Error(`Overpass returned ${res.status}`);
  const data = await res.json() as { elements: OverpassElement[] };

  const courts: Court[] = [];
  const seenCoords = new Set<string>();

  for (const el of data.elements) {
    const elLat = el.lat ?? el.center?.lat;
    const elLon = el.lon ?? el.center?.lon;
    if (elLat === undefined || elLon === undefined) continue;

    // Deduplicate by proximity (within ~50m)
    const coordKey = `${Math.round(elLat * 1000)},${Math.round(elLon * 1000)}`;
    if (seenCoords.has(coordKey)) continue;
    seenCoords.add(coordKey);

    const tags = el.tags ?? {};
    const name = tags.name || tags["name:en"] || `Tennis Court`;
    const addrParts = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"] || city].filter(Boolean);
    const address = addrParts.length > 0 ? addrParts.join(", ") : `Near ${city}`;

    const surface = tags.surface || "unknown";
    const osmUrl = `https://www.openstreetmap.org/${el.type}/${el.id}`;
    const isIndoor = tags.building === "yes" || tags.leisure === "sports_hall" || tags.indoor === "yes";
    const isLit = tags.lit === "yes";
    const accessType = tags.access || (tags.fee === "no" ? "public" : "unknown");
    const operator = tags.operator || tags["operator:type"] || null;
    const phone = tags.phone || tags["contact:phone"] || null;
    const website = tags.website || tags["contact:website"] || tags.url || null;
    const hours = tags.opening_hours || null;

    // Extract number of courts if encoded in name or tags
    let numCourts = 1;
    const courtMatch = name.match(/(\d+)\s*(courts?|terrains?|piste)/i);
    if (courtMatch) numCourts = parseInt(courtMatch[1]);

    const timeSlots = generateTimeSlots();
    const availableSlots = timeSlots.filter(() => Math.random() > 0.4);

    courts.push(upsertCourt({
      name, address,
      latitude: elLat, longitude: elLon,
      city, surface,
      available_slots: availableSlots,
      source_url: osmUrl,
      phone, website,
      booking_url: website, // Initial guess — will be refined by booking scraper
      booking_method: website ? "website" : "unknown",
      hours,
      num_courts: numCourts,
      indoor: isIndoor,
      lit: isLit,
      access_type: accessType,
      operator,
      data_sources: ["openstreetmap"],
      sport,
    }));
  }

  return courts;
}

// ── Source 2: Nominatim Search (supplementary geocoded locations) ───

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  class: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    state?: string;
    country?: string;
  };
}

export async function scrapeFromNominatim(city: string): Promise<Court[]> {
  try {
    const queries = [
      `tennis court ${city}`,
      `tennis club ${city}`,
      `tennis center ${city}`,
    ];
    const allResults: NominatimResult[] = [];

    for (const q of queries) {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=10&addressdetails=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": "TennisMatch/1.0 (tennis court discovery)" },
      });
      if (!res.ok) continue;
      const data = await res.json() as NominatimResult[];
      allResults.push(...data);
      // Respect Nominatim rate limit (1 req/sec)
      await new Promise(r => setTimeout(r, 1100));
    }

    // Deduplicate by place_id
    const seen = new Set<number>();
    const unique = allResults.filter(r => {
      if (seen.has(r.place_id)) return false;
      seen.add(r.place_id);
      return true;
    });

    const courts: Court[] = [];
    for (const r of unique) {
      const lat = parseFloat(r.lat);
      const lon = parseFloat(r.lon);
      if (isNaN(lat) || isNaN(lon)) continue;

      // Check if we already have this court (within ~100m)
      const existing = getDb().prepare(`
        SELECT id FROM courts WHERE ABS(latitude - ?) < 0.001 AND ABS(longitude - ?) < 0.001
      `).get(lat, lon);
      if (existing) continue;

      const name = r.display_name.split(",")[0] || `Tennis Venue`;
      const address = r.display_name.split(",").slice(0, 3).join(",").trim();

      courts.push(upsertCourt({
        name, address,
        latitude: lat, longitude: lon,
        city,
        surface: "unknown",
        available_slots: generateTimeSlots().filter(() => Math.random() > 0.4),
        source_url: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`,
        data_sources: ["nominatim"],
      }));
    }

    return courts;
  } catch (e) {
    console.error("Nominatim scrape error:", e);
    return [];
  }
}

// ── Source 3: Booking Method Detection ─────────────────────────────

export interface BookingDetection {
  court_id: string;
  booking_url: string | null;
  booking_method: "clubspark" | "courtreserve" | "playbypoint" | "phone" | "website" | "email" | "walkin" | "unknown";
  platform_name: string | null;
  detected_phone: string | null;
  detected_email: string | null;
  instructions: string;
}

/**
 * Inspects a court's website to detect its booking method.
 * Fetches the page HTML and looks for common booking platform signatures.
 */
export async function detectBookingMethod(court: Court): Promise<BookingDetection> {
  const result: BookingDetection = {
    court_id: court.id,
    booking_url: court.booking_url,
    booking_method: "unknown",
    platform_name: null,
    detected_phone: court.phone,
    detected_email: null,
    instructions: "",
  };

  if (!court.website) {
    if (court.phone) {
      result.booking_method = "phone";
      result.instructions = `Call ${court.phone} to book a court.`;
    } else {
      result.booking_method = "walkin";
      result.instructions = "Walk in or check local listings for booking info.";
    }
    return result;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(court.website, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) {
      result.booking_method = "website";
      result.booking_url = court.website;
      result.instructions = `Visit ${court.website} to book.`;
      return result;
    }

    const html = await res.text();
    const htmlLower = html.toLowerCase();
    const finalUrl = res.url;

    // Detect booking platform from HTML content
    if (htmlLower.includes("clubspark") || finalUrl.includes("clubspark")) {
      result.booking_method = "clubspark";
      result.platform_name = "ClubSpark";
      // Try to extract the ClubSpark booking URL
      const csMatch = html.match(/https?:\/\/clubspark\.lta\.org\.uk\/[^\s"'<>]+/i)
        || html.match(/https?:\/\/[^"'\s]*clubspark[^"'\s]*/i);
      result.booking_url = csMatch ? csMatch[0] : finalUrl;
      result.instructions = `Book online via ClubSpark at ${result.booking_url}`;
    } else if (htmlLower.includes("courtreserve") || finalUrl.includes("courtreserve")) {
      result.booking_method = "courtreserve";
      result.platform_name = "CourtReserve";
      const crMatch = html.match(/https?:\/\/[^"'\s]*courtreserve[^"'\s]*/i);
      result.booking_url = crMatch ? crMatch[0] : finalUrl;
      result.instructions = `Book online via CourtReserve at ${result.booking_url}`;
    } else if (htmlLower.includes("playbypoint") || finalUrl.includes("playbypoint")) {
      result.booking_method = "playbypoint";
      result.platform_name = "PlayByPoint";
      const pbMatch = html.match(/https?:\/\/[^"'\s]*playbypoint[^"'\s]*/i);
      result.booking_url = pbMatch ? pbMatch[0] : finalUrl;
      result.instructions = `Book online via PlayByPoint at ${result.booking_url}`;
    } else {
      // Generic booking link detection
      const bookingLinkPatterns = [
        /href=["']([^"']*(?:book|reserv|buch)[^"']*)["']/gi,
        /href=["']([^"']*(?:court|terrain|piste)[^"']*(?:book|reserv)[^"']*)["']/gi,
      ];

      let bookingLink: string | null = null;
      for (const pattern of bookingLinkPatterns) {
        const match = pattern.exec(html);
        if (match) {
          bookingLink = match[1];
          if (bookingLink.startsWith("/")) {
            const base = new URL(court.website);
            bookingLink = `${base.origin}${bookingLink}`;
          }
          break;
        }
      }

      if (bookingLink) {
        result.booking_method = "website";
        result.booking_url = bookingLink;
        result.instructions = `Book online at ${bookingLink}`;
      } else {
        result.booking_method = "website";
        result.booking_url = court.website;
        result.instructions = `Visit ${court.website} for booking information.`;
      }
    }

    // Extract phone number if not already known
    if (!result.detected_phone) {
      const phoneMatch = html.match(/(?:tel:|phone|telephone)[:\s]*[+]?[\d\s\-().]{7,20}/i)
        || html.match(/href="tel:([^"]+)"/i);
      if (phoneMatch) {
        const raw = phoneMatch[1] || phoneMatch[0];
        result.detected_phone = raw.replace(/[^+\d\s\-()]/g, "").trim();
      }
    }

    // Extract email
    const emailMatch = html.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    if (emailMatch) {
      result.detected_email = emailMatch[0];
      if (result.booking_method === "unknown") {
        result.booking_method = "email";
        result.instructions = `Email ${result.detected_email} to book.`;
      }
    }

    // Update court in DB with detected booking info
    getDb().prepare(`
      UPDATE courts SET booking_url = ?, booking_method = ?, phone = COALESCE(?, phone)
      WHERE id = ?
    `).run(result.booking_url, result.booking_method, result.detected_phone, court.id);

    return result;
  } catch (e) {
    // Timeout or network error — just use what we have
    result.booking_method = court.phone ? "phone" : "website";
    result.booking_url = court.website;
    result.instructions = court.phone
      ? `Call ${court.phone} to book.`
      : `Visit ${court.website} for booking information.`;
    return result;
  }
}

// ── Main scrape orchestrator ───────────────────────────────────────

export interface ScrapeResult {
  courts: Court[];
  sources_used: string[];
  total: number;
  city: string;
  center: { lat: number; lon: number };
}

export async function scrapeAllSources(city: string, sport?: string): Promise<ScrapeResult> {
  const coords = await geocodeCity(city);
  if (!coords) {
    // Fallback to demo data
    const demo = scrapeCourtsDemo(city);
    return {
      courts: demo,
      sources_used: ["demo"],
      total: demo.length,
      city,
      center: CITY_COORDS[city.toLowerCase()] ?? { lat: 40.0, lon: -74.0 },
    };
  }

  const sourcesUsed: string[] = [];
  let allCourts: Court[] = [];

  // Source 1: OpenStreetMap Overpass (primary — most comprehensive)
  try {
    const osmCourts = await scrapeFromOverpass(coords.lat, coords.lon, city, 15000, sport || "tennis");
    allCourts.push(...osmCourts);
    if (osmCourts.length > 0) sourcesUsed.push("openstreetmap");
  } catch (e) {
    console.error("Overpass scrape failed:", e);
  }

  // Source 2: Nominatim search (fills gaps OSM misses)
  try {
    const nomCourts = await scrapeFromNominatim(city);
    allCourts.push(...nomCourts);
    if (nomCourts.length > 0) sourcesUsed.push("nominatim");
  } catch (e) {
    console.error("Nominatim scrape failed:", e);
  }

  // Fallback if no real data
  if (allCourts.length === 0) {
    allCourts = scrapeCourtsDemo(city);
    sourcesUsed.push("demo");
  }

  // Deduplicate courts from DB (may have duplicates across sources)
  const courtIds = new Set<string>();
  allCourts = allCourts.filter(c => {
    if (courtIds.has(c.id)) return false;
    courtIds.add(c.id);
    return true;
  });

  return {
    courts: allCourts,
    sources_used: sourcesUsed,
    total: allCourts.length,
    city,
    center: coords,
  };
}

/**
 * Batch-detect booking methods for courts that haven't been checked yet.
 * Rate-limited to avoid hammering websites.
 */
export async function enrichBookingMethods(courts: Court[], maxConcurrent = 3): Promise<BookingDetection[]> {
  const unchecked = courts.filter(c => c.booking_method === "unknown" || c.booking_method === "website");
  const results: BookingDetection[] = [];

  // Process in batches
  for (let i = 0; i < unchecked.length; i += maxConcurrent) {
    const batch = unchecked.slice(i, i + maxConcurrent);
    const batchResults = await Promise.allSettled(
      batch.map(c => detectBookingMethod(c))
    );
    for (const r of batchResults) {
      if (r.status === "fulfilled") results.push(r.value);
    }
    // Rate limit between batches
    if (i + maxConcurrent < unchecked.length) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  return results;
}

// ── Legacy helpers ─────────────────────────────────────────────────

function scrapeCourtsDemo(city: string, sport: string = "tennis"): Court[] {
  const coords = CITY_COORDS[city.toLowerCase()] ?? { lat: 40.0, lon: -74.0 };
  const slots = generateTimeSlots();
  const surfaces = ["hard", "clay", "grass", "hard"];
  const templates = [
    { suffix: "Municipal Tennis Center", offset: 0.01, numCourts: 6, lit: true, access: "public" },
    { suffix: "Park Tennis Courts", offset: -0.008, numCourts: 4, lit: false, access: "public" },
    { suffix: "Community Tennis Club", offset: 0.015, numCourts: 8, lit: true, access: "members" },
    { suffix: "Recreation Center Courts", offset: -0.012, numCourts: 3, lit: true, access: "public" },
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
    num_courts: t.numCourts,
    lit: t.lit,
    access_type: t.access,
    data_sources: ["demo"],
    sport,
  }));
}

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  const today = new Date();
  for (let day = 0; day < 7; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split("T")[0];
    for (let hour = 7; hour <= 21; hour++) {
      slots.push(`${dateStr}T${String(hour).padStart(2, "0")}:00`);
    }
  }
  return slots;
}

/** Legacy sync function for backward compat with booking.ts */
export function scrapeCourts(city: string, sport: string = "tennis"): Court[] {
  return scrapeCourtsDemo(city, sport);
}

/** Legacy alias */
export async function scrapeCourtsReal(city: string): Promise<Court[]> {
  const result = await scrapeAllSources(city);
  return result.courts;
}
