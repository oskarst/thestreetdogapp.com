"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Sighting {
  latitude: number;
  longitude: number;
  timestamp: string;
  nickname: string;
  notes: string | null;
}

interface DailyActivityMapProps {
  sightings: Sighting[];
}

function DailyActivityMapInner({ sightings }: DailyActivityMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || sightings.length === 0) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, { attributionControl: false });
    mapInstanceRef.current = map;

    L.control
      .attribution({ prefix: '<a href="https://leafletjs.com">Leaflet</a>' })
      .addTo(map);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    // Sort chronologically (oldest first)
    const sorted = [...sightings].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const pathCoords: L.LatLngExpression[] = [];

    sorted.forEach((s, index) => {
      const number = index + 1;
      const coords: L.LatLngExpression = [s.latitude, s.longitude];
      pathCoords.push(coords);

      const numberedIcon = L.divIcon({
        className: "numbered-marker",
        html: `<div style="background-color:#0d6efd;border:2px solid white;border-radius:50%;color:white;font-weight:bold;text-align:center;line-height:24px;font-size:12px;width:28px;height:28px;">${number}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker(coords, { icon: numberedIcon });
      const popupContent = `
        <strong>#${number} - ${s.nickname}</strong><br>
        ${new Date(s.timestamp).toLocaleString()}
        ${s.notes ? "<br><small>" + s.notes + "</small>" : ""}
      `;
      marker.bindPopup(popupContent);
      marker.addTo(map);
    });

    L.polyline(pathCoords, {
      color: "#0d6efd",
      weight: 3,
      opacity: 0.7,
      dashArray: "10, 5",
    }).addTo(map);

    if (pathCoords.length > 0) {
      const bounds = L.latLngBounds(pathCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [sightings]);

  return <div ref={mapRef} className="z-0" style={{ height: 400, width: "100%" }} />;
}

import dynamic from "next/dynamic";

export const DailyActivityMap = dynamic(
  () => Promise.resolve(DailyActivityMapInner),
  { ssr: false }
);
