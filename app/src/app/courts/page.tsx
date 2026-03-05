"use client";

import { useState, useEffect } from "react";
import CourtCard from "@/components/CourtCard";

interface Court {
  id: string;
  name: string;
  address: string;
  city: string;
  surface: string;
  available_slots: string[];
  source_url: string | null;
}

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [city, setCity] = useState("New York");
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [source, setSource] = useState<string | null>(null);

  async function loadCourts() {
    setLoading(true);
    const res = await fetch(`/api/courts?city=${encodeURIComponent(city)}`);
    setCourts(await res.json());
    setLoading(false);
  }

  async function scrapeCourts() {
    setScraping(true);
    setSource(null);
    const res = await fetch("/api/courts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city }),
    });
    const data = await res.json();
    setSource(data.source);
    await loadCourts();
    setScraping(false);
  }

  useEffect(() => { loadCourts(); }, [city]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Tennis Courts</h1>

      <div className="flex gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City (any city worldwide)</label>
          <input
            type="text" value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && scrapeCourts()}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900 w-64"
            placeholder="e.g. Paris, Tokyo, Denver..."
          />
        </div>
        <button onClick={scrapeCourts} disabled={scraping} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
          {scraping ? "Searching OpenStreetMap..." : "Find Real Courts"}
        </button>
      </div>

      {source && (
        <p className="text-xs text-gray-400">
          Source: {source === "openstreetmap" ? "OpenStreetMap (real data)" : "Demo data (Overpass API unreachable)"}
        </p>
      )}

      {loading && <p className="text-gray-500">Loading courts...</p>}

      {!loading && courts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courts.map((court) => (
            <CourtCard key={court.id} court={court} />
          ))}
        </div>
      )}

      {!loading && courts.length === 0 && (
        <p className="text-gray-500">No courts found for {city}. Click &quot;Find Real Courts&quot; to search OpenStreetMap for nearby tennis courts.</p>
      )}
    </div>
  );
}
