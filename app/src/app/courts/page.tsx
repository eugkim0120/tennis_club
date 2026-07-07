"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";

const CourtMap = dynamic(() => import("@/components/CourtMap"), {
  ssr: false,
  loading: () => <div className="w-full h-[500px] bg-slate-100 rounded-2xl animate-pulse flex items-center justify-center text-slate-400">Loading map...</div>,
});

interface SlotFormatted {
  iso: string;
  display: string;
}

interface CourtData {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  surface: string;
  available_slots: string[];
  available_slots_formatted: SlotFormatted[];
  source_url: string | null;
  phone: string | null;
  website: string | null;
  booking_url: string | null;
  booking_method: string;
  hours: string | null;
  rating: number | null;
  num_courts: number;
  indoor: boolean;
  lit: boolean;
  access_type: string;
  operator: string | null;
  data_sources: string[];
}

interface BookingDetection {
  court_id: string;
  booking_url: string | null;
  booking_method: string;
  platform_name: string | null;
  detected_phone: string | null;
  detected_email: string | null;
  instructions: string;
}

export default function CourtsPage() {
  const [courts, setCourts] = useState<CourtData[]>([]);
  const [city, setCity] = useState("");
  const [scraping, setScraping] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const [center, setCenter] = useState<{ lat: number; lon: number }>({ lat: 40.758, lon: -73.985 });
  const [selectedCourt, setSelectedCourt] = useState<CourtData | null>(null);
  const [bookingInfo, setBookingInfo] = useState<BookingDetection | null>(null);
  const [detectingBooking, setDetectingBooking] = useState(false);
  const [surfaceFilter, setSurfaceFilter] = useState<string>("all");
  const [accessFilter, setAccessFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"split" | "map" | "list">("split");
  const [enriching, setEnriching] = useState(false);

  async function scrapeCourts() {
    if (!city) return;
    setScraping(true);
    setSelectedCourt(null);
    setBookingInfo(null);
    setSources([]);
    try {
      const res = await fetch("/api/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city }),
      });
      const data = await res.json();
      setCourts(data.courts || []);
      setSources(data.sources || []);
      if (data.center) setCenter(data.center);
    } catch (e) {
      console.error("Scrape error:", e);
    }
    setScraping(false);
  }

  async function detectBooking(court: CourtData) {
    setDetectingBooking(true);
    setBookingInfo(null);
    try {
      const res = await fetch("/api/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "detect_booking", court_id: court.id }),
      });
      if (res.ok) {
        const detection = await res.json();
        setBookingInfo(detection);
        // Update the court in our local list
        setCourts(prev => prev.map(c =>
          c.id === court.id ? { ...c, booking_method: detection.booking_method, booking_url: detection.booking_url } : c
        ));
      }
    } catch (e) {
      console.error("Booking detection error:", e);
    }
    setDetectingBooking(false);
  }

  async function enrichAll() {
    if (!city) return;
    setEnriching(true);
    try {
      const res = await fetch("/api/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enrich_bookings", city }),
      });
      if (res.ok) {
        // Reload courts to get updated booking info
        const reload = await fetch(`/api/courts?city=${encodeURIComponent(city)}`);
        if (reload.ok) setCourts(await reload.json());
      }
    } catch (e) {
      console.error("Enrich error:", e);
    }
    setEnriching(false);
  }

  const handleSelectCourt = useCallback((court: CourtData) => {
    setSelectedCourt(court);
    setBookingInfo(null);
  }, []);

  // Compute unique surfaces and access types
  const surfaces = useMemo(() => {
    const s = new Set(courts.map(c => c.surface).filter(s => s !== "unknown"));
    return Array.from(s);
  }, [courts]);

  const filteredCourts = useMemo(() => {
    return courts.filter(c => {
      if (surfaceFilter !== "all" && c.surface !== surfaceFilter) return false;
      if (accessFilter !== "all" && c.access_type !== accessFilter) return false;
      return true;
    });
  }, [courts, surfaceFilter, accessFilter]);

  // Try user's geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {} // ignore errors, use default
      );
    }
  }, []);

  const bookingMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      clubspark: "bg-blue-100 text-blue-700",
      courtreserve: "bg-purple-100 text-purple-700",
      playbypoint: "bg-indigo-100 text-indigo-700",
      website: "bg-emerald-100 text-emerald-700",
      phone: "bg-amber-100 text-amber-700",
      email: "bg-teal-100 text-teal-700",
      walkin: "bg-slate-100 text-slate-700",
      unknown: "bg-slate-100 text-slate-400",
    };
    const labels: Record<string, string> = {
      clubspark: "ClubSpark",
      courtreserve: "CourtReserve",
      playbypoint: "PlayByPoint",
      website: "Online",
      phone: "Phone",
      email: "Email",
      walkin: "Walk-in",
      unknown: "Unknown",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors[method] || colors.unknown}`}>
        {labels[method] || method}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tennis Courts</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Discover real courts from OpenStreetMap, Nominatim &amp; more
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode("split")} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === "split" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>Split</button>
          <button onClick={() => setViewMode("map")} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === "map" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>Map</button>
          <button onClick={() => setViewMode("list")} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === "list" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>List</button>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text" value={city} onChange={e => setCity(e.target.value)}
          onKeyDown={e => e.key === "Enter" && scrapeCourts()}
          className="flex-1 max-w-md border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          placeholder="Search any city worldwide: Paris, Tokyo, Austin..."
        />
        <button onClick={scrapeCourts} disabled={scraping}
          className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm whitespace-nowrap">
          {scraping ? "Searching..." : "Find Courts"}
        </button>
        {courts.length > 0 && (
          <button onClick={enrichAll} disabled={enriching}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-sm whitespace-nowrap">
            {enriching ? "Detecting..." : "Detect Booking Methods"}
          </button>
        )}
      </div>

      {/* Source + Filter bar */}
      {courts.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="font-semibold">{filteredCourts.length}</span> courts
            {sources.length > 0 && <span>&middot; Sources: {sources.join(", ")}</span>}
          </div>
          <div className="flex gap-1.5 ml-auto">
            <select value={surfaceFilter} onChange={e => setSurfaceFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600">
              <option value="all">All surfaces</option>
              {surfaces.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={accessFilter} onChange={e => setAccessFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600">
              <option value="all">All access</option>
              <option value="public">Public</option>
              <option value="members">Members only</option>
            </select>
          </div>
        </div>
      )}

      {/* Map + List */}
      <div className={`grid gap-4 ${viewMode === "split" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* Map */}
        {viewMode !== "list" && (
          <div className={`${viewMode === "map" ? "" : ""}`}>
            <CourtMap
              courts={filteredCourts}
              center={center}
              onSelectCourt={handleSelectCourt}
              selectedCourtId={selectedCourt?.id}
              className="w-full h-[500px] rounded-2xl overflow-hidden border border-slate-200/60 shadow-sm"
            />
          </div>
        )}

        {/* Court list */}
        {viewMode !== "map" && (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredCourts.length === 0 && !scraping && (
              <div className="text-center py-12">
                <div className="text-slate-300 text-4xl mb-3">&#127934;</div>
                <p className="text-slate-500 font-medium">No courts found</p>
                <p className="text-sm text-slate-400 mt-1">Search a city to discover tennis courts</p>
              </div>
            )}
            {filteredCourts.map(court => (
              <div
                key={court.id}
                onClick={() => handleSelectCourt(court)}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedCourt?.id === court.id ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200/60 hover:border-emerald-200"
                }`}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <h3 className="font-semibold text-slate-900 text-sm leading-tight">{court.name}</h3>
                  <div className="flex gap-1 shrink-0 ml-2">
                    {court.surface !== "unknown" && (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[10px] font-semibold capitalize">{court.surface}</span>
                    )}
                    {bookingMethodBadge(court.booking_method)}
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-2">{court.address}</p>
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold">{court.available_slots.length} slots</span>
                  {court.num_courts > 1 && <span className="text-slate-400">{court.num_courts} courts</span>}
                  {court.indoor && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-semibold">Indoor</span>}
                  {court.lit && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded font-semibold">Lit</span>}
                  {court.access_type === "public" && <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded font-semibold">Public</span>}
                  {court.operator && <span className="text-slate-400">{court.operator}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Court Detail Panel */}
      {selectedCourt && (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{selectedCourt.name}</h2>
              <p className="text-sm text-slate-500">{selectedCourt.address}</p>
            </div>
            <button onClick={() => { setSelectedCourt(null); setBookingInfo(null); }}
              className="text-xs text-slate-400 hover:text-slate-600 p-1">Close</button>
          </div>

          {/* Court info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Surface</p>
              <p className="text-sm font-bold text-slate-700 capitalize">{selectedCourt.surface}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Courts</p>
              <p className="text-sm font-bold text-slate-700">{selectedCourt.num_courts}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Available</p>
              <p className="text-sm font-bold text-emerald-600">{selectedCourt.available_slots.length} slots</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Booking</p>
              <div className="mt-0.5">{bookingMethodBadge(selectedCourt.booking_method)}</div>
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedCourt.indoor && <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold">Indoor</span>}
            {selectedCourt.lit && <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-semibold">Lit for night play</span>}
            {selectedCourt.access_type === "public" && <span className="px-2.5 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-semibold">Public access</span>}
            {selectedCourt.operator && <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">{selectedCourt.operator}</span>}
            {selectedCourt.hours && <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">{selectedCourt.hours}</span>}
          </div>

          {/* Available time slots */}
          {selectedCourt.available_slots_formatted && selectedCourt.available_slots_formatted.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Available Times</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedCourt.available_slots_formatted.slice(0, 15).map((s: SlotFormatted, i: number) => (
                  <span key={i} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-medium hover:bg-emerald-100 cursor-pointer transition-colors">
                    {s.display}
                  </span>
                ))}
                {selectedCourt.available_slots_formatted.length > 15 && (
                  <span className="px-2 py-1 text-slate-400 text-[11px]">+{selectedCourt.available_slots_formatted.length - 15} more</span>
                )}
              </div>
            </div>
          )}

          {/* Booking detection */}
          {bookingInfo ? (
            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Booking Info</span>
                {bookingInfo.platform_name && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-semibold">{bookingInfo.platform_name}</span>
                )}
              </div>
              <p className="text-sm text-slate-700 mb-3">{bookingInfo.instructions}</p>
              <div className="flex flex-wrap gap-2">
                {bookingInfo.booking_url && (
                  <a href={bookingInfo.booking_url} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all shadow-sm inline-flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    Book Now
                  </a>
                )}
                {bookingInfo.detected_phone && (
                  <a href={`tel:${bookingInfo.detected_phone}`}
                    className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-all shadow-sm inline-flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    Call {bookingInfo.detected_phone}
                  </a>
                )}
                {bookingInfo.detected_email && (
                  <a href={`mailto:${bookingInfo.detected_email}`}
                    className="px-4 py-2 bg-slate-600 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-all shadow-sm">
                    Email {bookingInfo.detected_email}
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => detectBooking(selectedCourt)} disabled={detectingBooking}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-sm">
                {detectingBooking ? "Detecting..." : "Detect Booking Method"}
              </button>
              {selectedCourt.booking_url && (
                <a href={selectedCourt.booking_url} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all shadow-sm inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  Visit Website
                </a>
              )}
              {selectedCourt.source_url && (
                <a href={selectedCourt.source_url} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 bg-white text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 border border-slate-200 transition-colors">
                  View on OSM
                </a>
              )}
            </div>
          )}

          {/* Data sources */}
          {selectedCourt.data_sources.length > 0 && (
            <div className="mt-3 text-[10px] text-slate-400">
              Data from: {selectedCourt.data_sources.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {courts.length === 0 && !scraping && (
        <div className="text-center py-16">
          <div className="text-slate-200 text-6xl mb-4">&#127759;</div>
          <h2 className="text-lg font-bold text-slate-700 mb-1">Discover Tennis Courts Worldwide</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            We scrape real court data from OpenStreetMap, Nominatim, and detect booking methods from court websites automatically.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {["New York", "London", "Paris", "Tokyo", "Sydney", "Berlin", "Toronto", "Barcelona"].map(c => (
              <button key={c} onClick={() => { setCity(c); }}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
