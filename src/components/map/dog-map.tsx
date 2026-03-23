"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import type { DogRow } from "@/types/database";
import { MapSidePanel } from "./map-side-panel";

// Fix default Leaflet marker icon issue in Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface DogMapProps {
  dogs: DogRow[];
}

const TBILISI_CENTER: [number, number] = [41.7151, 44.8271];
const DEFAULT_ZOOM = 13;

function createDogIcon(dog: DogRow): L.DivIcon {
  const initial = dog.names?.[0]?.[0]?.toUpperCase() ?? "🐾";
  return L.divIcon({
    html: `<div style="
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: hsl(var(--primary, 221 83% 53%));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${initial}</div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function DogMap({ dogs }: DogMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [selectedDog, setSelectedDog] = useState<DogRow | null>(null);

  const handleClose = useCallback(() => setSelectedDog(null), []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: TBILISI_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: false,
    });

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

    const clusterGroup = L.markerClusterGroup({
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size: string;
        if (count < 10) size = "small";
        else if (count < 50) size = "medium";
        else size = "large";

        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(40, 40),
        });
      },
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 80,
    });

    const dogsWithCoords = dogs.filter(
      (d) => d.last_latitude != null && d.last_longitude != null
    );

    dogsWithCoords.forEach((dog) => {
      const marker = L.marker([dog.last_latitude!, dog.last_longitude!], {
        icon: createDogIcon(dog),
        title: dog.names?.[0] ?? "Unknown Dog",
      });

      marker.on("click", () => {
        setSelectedDog(dog);
      });

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);

    if (dogsWithCoords.length > 0) {
      const bounds = L.latLngBounds(
        dogsWithCoords.map((d) => [d.last_latitude!, d.last_longitude!])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // Only run once on mount - dogs won't change after initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div ref={mapRef} className="w-full h-full" />

      <style jsx global>{`
        .marker-cluster-small {
          background-color: rgba(59, 130, 246, 0.5);
        }
        .marker-cluster-small div {
          background-color: rgba(59, 130, 246, 0.8);
        }
        .marker-cluster-medium {
          background-color: rgba(245, 158, 11, 0.5);
        }
        .marker-cluster-medium div {
          background-color: rgba(245, 158, 11, 0.8);
        }
        .marker-cluster-large {
          background-color: rgba(239, 68, 68, 0.5);
        }
        .marker-cluster-large div {
          background-color: rgba(239, 68, 68, 0.8);
        }
        .marker-cluster {
          background-clip: padding-box;
          border-radius: 50%;
        }
        .marker-cluster div {
          width: 30px;
          height: 30px;
          margin-left: 5px;
          margin-top: 5px;
          text-align: center;
          border-radius: 50%;
          font-size: 12px;
          font-weight: bold;
          color: white;
          line-height: 30px;
        }
        .marker-cluster span {
          line-height: 30px;
        }
      `}</style>

      <MapSidePanel dog={selectedDog} onClose={handleClose} />
    </>
  );
}
