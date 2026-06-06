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

interface LocationHistoryMapInnerProps {
  locations: Location[];
}

export default function LocationHistoryMapInner({
  locations,
}: LocationHistoryMapInnerProps) {
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

    // CARTO Voyager: light theme with street names, native zoom to 20.
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 20,
      }
    ).addTo(map);

    // Default marker icon — local copies in /public/leaflet/ so the page
    // works offline and the CSP doesn't have to allowlist a third-party CDN.
    const defaultIcon = L.icon({
      iconUrl: "/leaflet/marker-icon.png",
      iconRetinaUrl: "/leaflet/marker-icon-2x.png",
      shadowUrl: "/leaflet/marker-shadow.png",
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

  return (
    <div ref={mapRef} className="z-0" style={{ height: 400, width: "100%" }} />
  );
}
