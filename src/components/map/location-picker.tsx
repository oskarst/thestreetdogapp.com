"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationPickerProps {
  onChange: (pos: { lat: number; lng: number }) => void;
  initialPosition?: { lat: number; lng: number };
}

const TBILISI = { lat: 41.7151, lng: 44.8271 };

function LocationPickerInner({ onChange, initialPosition }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return;

      // Fix default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const center = initialPosition ?? TBILISI;
      const map = L.map(mapRef.current!, {
        center: [center.lat, center.lng],
        zoom: 15,
        attributionControl: false,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      const marker = L.marker([center.lat, center.lng], {
        draggable: true,
      }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChange({ lat: pos.lat, lng: pos.lng });
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Emit initial position
      onChange(center);
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        const map = mapInstanceRef.current;
        const marker = markerRef.current;
        if (map && marker) {
          map.setView([lat, lng], 15);
          marker.setLatLng([lat, lng]);
        }
        onChange({ lat, lng });
      },
      () => {
        setLocating(false);
        alert("Unable to get your location. Please drag the marker.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="space-y-2">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div
        ref={mapRef}
        className="h-[250px] w-full rounded-lg border"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={useMyLocation}
        disabled={locating}
      >
        <MapPin className="size-4" />
        {locating ? "Locating..." : "Use My Location"}
      </Button>
    </div>
  );
}

// Dynamic wrapper to prevent SSR
import dynamic from "next/dynamic";

const LocationPicker = dynamic(
  () => Promise.resolve(LocationPickerInner),
  { ssr: false }
);

export { LocationPicker };
