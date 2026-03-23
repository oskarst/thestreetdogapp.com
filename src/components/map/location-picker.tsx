"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Navigation, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";

interface LocationPickerProps {
  onChange: (pos: { lat: number; lng: number }) => void;
  initialPosition?: { lat: number; lng: number };
}

const TBILISI = { lat: 41.7151, lng: 44.8271 };

function LocationPickerInner({ onChange, initialPosition }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [locating, setLocating] = useState(false);
  const [gpsPosition, setGpsPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map with default center, then update when GPS arrives
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return;

      // Use local marker icons (work offline)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "/leaflet/marker-icon-2x.png",
        iconUrl: "/leaflet/marker-icon.png",
        shadowUrl: "/leaflet/marker-shadow.png",
      });

      const center = initialPosition ?? TBILISI;
      const map = L.map(mapRef.current!, {
        center: [center.lat, center.lng],
        zoom: 15,
        attributionControl: false,
      });

      const tileLayer = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      // Detect if tiles fail to load (offline, no cache)
      let tileErrors = 0;
      tileLayer.on("tileerror", () => {
        tileErrors++;
        if (tileErrors > 3) setMapFailed(true);
      });

      const marker = L.marker([center.lat, center.lng], {
        draggable: true,
      }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setGpsPosition({ lat: pos.lat, lng: pos.lng });
        onChangeRef.current({ lat: pos.lat, lng: pos.lng });
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      setMapReady(true);

      // Emit initial position
      onChangeRef.current(center);
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [initialPosition]);

  // Auto-detect GPS location after map is ready
  useEffect(() => {
    if (!mapReady || !navigator.geolocation) return;

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsPosition(loc);
        onChangeRef.current(loc);
        const map = mapInstanceRef.current;
        const marker = markerRef.current;
        if (map && marker) {
          map.setView([loc.lat, loc.lng], 15);
          marker.setLatLng([loc.lat, loc.lng]);
        }
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [mapReady]);

  const useMyLocation = useCallback(() => {
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
        setGpsPosition({ lat, lng });
        onChangeRef.current({ lat, lng });
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative z-0">
        <div
          ref={mapRef}
          className="h-[250px] w-full rounded-lg border"
        />
        {locating && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium shadow-sm border">
            <Navigation className="size-3.5 animate-pulse text-primary" />
            Getting location...
          </div>
        )}
        {mapFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg border bg-muted/90 z-[500]">
            <WifiOff className="size-6 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Map unavailable offline</p>
            {gpsPosition && (
              <p className="text-xs text-muted-foreground mt-1">
                Location: {gpsPosition.lat.toFixed(5)}, {gpsPosition.lng.toFixed(5)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              Your GPS location is saved
            </p>
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={useMyLocation}
        disabled={locating}
      >
        <MapPin className="size-4" />
        {locating ? "Locating..." : "Update My Location"}
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
