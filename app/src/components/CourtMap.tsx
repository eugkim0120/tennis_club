"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";

interface CourtMarker {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  surface: string;
  available_slots: string[];
  booking_method: string;
  num_courts: number;
  indoor: boolean;
  lit: boolean;
  access_type: string;
  operator: string | null;
  source_url: string | null;
  booking_url: string | null;
}

interface CourtMapProps {
  courts: CourtMarker[];
  center: { lat: number; lon: number };
  onSelectCourt?: (court: CourtMarker) => void;
  selectedCourtId?: string | null;
  className?: string;
}

// Custom marker icon using inline SVG data URI
function createMarkerIcon(isSelected: boolean, accessType: string): L.DivIcon {
  const color = isSelected ? "#dc2626" : accessType === "public" ? "#059669" : "#7c3aed";
  const size = isSelected ? 36 : 28;

  return L.divIcon({
    className: "court-marker",
    html: `<div style="
      width: ${size}px; height: ${size}px;
      background: ${color}; border: 3px solid white;
      border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    ">
      <span style="transform: rotate(45deg); color: white; font-weight: 700; font-size: ${isSelected ? 14 : 11}px;">T</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

export default function CourtMap({ courts, center, onSelectCourt, selectedCourtId, className }: CourtMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  // Load Leaflet CSS via link tag (Turbopack can't import CSS from node_modules in client components)
  useEffect(() => {
    if (document.getElementById("leaflet-css")) return;
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [center.lat, center.lon],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    // Use CartoDB Voyager tiles (clean, modern look)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update center when it changes
  useEffect(() => {
    if (!mapInstance.current) return;
    mapInstance.current.setView([center.lat, center.lon], 13);
  }, [center.lat, center.lon]);

  // Update markers when courts change
  useEffect(() => {
    if (!mapInstance.current || !mapReady) return;
    const map = mapInstance.current;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (courts.length === 0) return;

    const bounds = L.latLngBounds([]);

    courts.forEach(court => {
      const isSelected = court.id === selectedCourtId;
      const icon = createMarkerIcon(isSelected, court.access_type);

      const slotsCount = court.available_slots.length;
      const slotsLabel = slotsCount > 0 ? `${slotsCount} slots available` : "No slots available";
      const surfaceBadge = court.surface !== "unknown" ? `<span style="background:#ede9fe;color:#7c3aed;padding:1px 6px;border-radius:99px;font-size:10px;font-weight:600;">${court.surface}</span>` : "";
      const indoorBadge = court.indoor ? `<span style="background:#dbeafe;color:#2563eb;padding:1px 6px;border-radius:99px;font-size:10px;font-weight:600;">Indoor</span>` : "";
      const litBadge = court.lit ? `<span style="background:#fef3c7;color:#d97706;padding:1px 6px;border-radius:99px;font-size:10px;font-weight:600;">Lit</span>` : "";
      const accessBadge = court.access_type === "public" ? `<span style="background:#d1fae5;color:#059669;padding:1px 6px;border-radius:99px;font-size:10px;font-weight:600;">Public</span>` : "";

      const popupHtml = `
        <div style="min-width:200px;max-width:280px;font-family:system-ui,sans-serif;">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#0f172a;">${court.name}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:6px;">${court.address}</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
            ${surfaceBadge}${indoorBadge}${litBadge}${accessBadge}
          </div>
          ${court.num_courts > 1 ? `<div style="font-size:11px;color:#64748b;">${court.num_courts} courts</div>` : ""}
          ${court.operator ? `<div style="font-size:11px;color:#64748b;">Operated by: ${court.operator}</div>` : ""}
          <div style="font-size:12px;font-weight:600;color:${slotsCount > 0 ? "#059669" : "#dc2626"};margin:6px 0;">${slotsLabel}</div>
          <div style="display:flex;gap:4px;margin-top:8px;">
            ${court.booking_url ? `<a href="${court.booking_url}" target="_blank" rel="noopener" style="padding:4px 10px;background:#059669;color:white;border-radius:8px;font-size:11px;font-weight:600;text-decoration:none;">Book Now</a>` : ""}
            ${court.source_url ? `<a href="${court.source_url}" target="_blank" rel="noopener" style="padding:4px 10px;background:#f1f5f9;color:#475569;border-radius:8px;font-size:11px;font-weight:600;text-decoration:none;">View on Map</a>` : ""}
          </div>
        </div>
      `;

      const marker = L.marker([court.latitude, court.longitude], { icon })
        .addTo(map)
        .bindPopup(popupHtml, { maxWidth: 300, closeButton: true });

      marker.on("click", () => {
        if (onSelectCourt) onSelectCourt(court);
      });

      if (isSelected) {
        marker.openPopup();
      }

      markersRef.current.push(marker);
      bounds.extend([court.latitude, court.longitude]);
    });

    // Fit map to show all courts
    if (courts.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (courts.length === 1) {
      map.setView([courts[0].latitude, courts[0].longitude], 15);
    }
  }, [courts, selectedCourtId, mapReady, onSelectCourt]);

  return (
    <div className={className || ""}>
      <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "400px", borderRadius: "16px" }} />
      <style jsx global>{`
        .court-marker { background: transparent !important; border: none !important; }
        .leaflet-popup-content-wrapper { border-radius: 12px !important; box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important; }
        .leaflet-popup-tip { box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important; }
      `}</style>
    </div>
  );
}
