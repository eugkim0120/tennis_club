"use client";

import { useState, useEffect } from "react";

interface Court {
  id: string;
  name: string;
  address: string;
  city: string;
  surface: string;
  available_slots: string[];
  available_slots_formatted?: string[];
  source_url: string | null;
}

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [source, setSource] = useState<string | null>(null);

  async function loadCourts(c: string) {
    if (!c) return;
    setLoading(true);
    const res = await fetch(`/api/courts?city=${encodeURIComponent(c)}`);
    setCourts(await res.json());
    setLoading(false);
  }

  async function scrapeCourts() {
    if (!city) return;
    setScraping(true);
    setSource(null);
    const res = await fetch("/api/courts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city }),
    });
    const data = await res.json();
    setSource(data.source);
    await loadCourts(city);
    setScraping(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tennis Courts</h1>
        <p className="text-sm text-slate-500 mt-0.5">Search for real tennis courts worldwide via OpenStreetMap</p>
      </div>

      <div className="flex gap-2">
        <input type="text" value={city} onChange={e => setCity(e.target.value)}
          onKeyDown={e => e.key === "Enter" && scrapeCourts()}
          className="flex-1 max-w-sm border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          placeholder="e.g. Paris, Tokyo, Austin..." />
        <button onClick={scrapeCourts} disabled={scraping}
          className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm">
          {scraping ? "Searching..." : "Find Courts"}
        </button>
      </div>

      {source && (
        <p className="text-xs text-slate-400">
          Source: {source === "openstreetmap" ? "OpenStreetMap (real data)" : "Demo data"}
        </p>
      )}

      {loading && <div className="text-center py-16 text-slate-400">Searching for courts...</div>}

      {!loading && courts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courts.map(court => (
            <div key={court.id} className="bg-white rounded-2xl border border-slate-200/60 p-5 hover:border-emerald-200 transition-all hover:shadow-md">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-slate-900 text-sm">{court.name}</h3>
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[10px] font-semibold capitalize">{court.surface}</span>
              </div>
              <p className="text-xs text-slate-400 mb-3">{court.address}</p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-semibold">
                  {court.available_slots.length} slots
                </span>
                {court.source_url && (
                  <a href={court.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline">View on OSM</a>
                )}
              </div>
              {court.available_slots_formatted && court.available_slots_formatted.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {court.available_slots_formatted.slice(0, 6).map((s, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px]">{s}</span>
                  ))}
                  {court.available_slots_formatted.length > 6 && (
                    <span className="text-[10px] text-slate-400">+{court.available_slots_formatted.length - 6} more</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && courts.length === 0 && city && (
        <div className="text-center py-16">
          <div className="text-slate-300 text-5xl mb-4">🗺️</div>
          <p className="text-slate-500 font-medium">No courts found for &ldquo;{city}&rdquo;</p>
          <p className="text-sm text-slate-400 mt-1">Try clicking &ldquo;Find Courts&rdquo; to search OpenStreetMap</p>
        </div>
      )}
    </div>
  );
}
