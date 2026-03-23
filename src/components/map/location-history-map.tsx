"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Location {
  latitude: number;
  longitude: number;
  timestamp: string;
  nickname: string;
  notes: string | null;
}

interface LocationHistoryMapProps {
  locations: Location[];
}

function LocationHistoryMapInner({ locations }: LocationHistoryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || locations.length === 0) return;
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

    // Fix default marker icon
    const defaultIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const coords: L.LatLngExpression[] = [];

    locations.forEach((loc) => {
      const latlng: L.LatLngExpression = [loc.latitude, loc.longitude];
      coords.push(latlng);

      const marker = L.marker(latlng, { icon: defaultIcon });
      const popupContent = `
        <strong>${loc.nickname}</strong><br>
        ${new Date(loc.timestamp).toLocaleString()}
        ${loc.notes ? "<br><small>" + loc.notes + "</small>" : ""}
      `;
      marker.bindPopup(popupContent);
      marker.addTo(map);
    });

    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [locations]);

  return <div ref={mapRef} className="z-0" style={{ height: 400, width: "100%" }} />;
}

// Dynamic import wrapper to avoid SSR
import dynamic from "next/dynamic";

export const LocationHistoryMap = dynamic(
  () => Promise.resolve(LocationHistoryMapInner),
  { ssr: false }
);
