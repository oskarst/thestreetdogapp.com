"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import type { DogMarker } from "@/types/database";
import { MapSidePanel } from "./map-side-panel";

interface MissionContext {
  slug: string;
  nameEn: string;
  nameKa: string;
  nameRu: string;
  progress: number;
  target: number;
  completionXp: number;
  allDistricts: { slug: string; ring: [number, number][] }[];
  locale: string;
  /** True when the user is browsing this raion but it isn't their active mission. */
  previewOnly?: boolean;
}

// Use the local marker assets that already ship with the PWA — drops the
// unpkg.com runtime dep and saves a DNS lookup on cold start.
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

interface DogMapProps {
  dogs: DogMarker[];
  mission?: MissionContext | null;
}

function localizedName(m: MissionContext): string {
  if (m.locale === "ka") return m.nameKa;
  if (m.locale === "ru") return m.nameRu;
  return m.nameEn;
}

const TBILISI_CENTER: [number, number] = [41.7151, 44.8271];
const DEFAULT_ZOOM = 13;

function createDogIcon(dog: DogMarker): L.DivIcon {
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

export default function DogMap({ dogs, mission }: DogMapProps) {
  const router = useRouter();
  const tMissions = useTranslations("missions");
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const overlayLayerRef = useRef<L.LayerGroup | null>(null);
  const hasFitBoundsRef = useRef(false);
  const [selectedDog, setSelectedDog] = useState<DogMarker | null>(null);

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

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

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
    map.addLayer(clusterGroup);

    const overlay = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    clusterGroupRef.current = clusterGroup;
    overlayLayerRef.current = overlay;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      clusterGroupRef.current = null;
      overlayLayerRef.current = null;
      hasFitBoundsRef.current = false;
    };
  }, []);

  // Mission overlay: draw all districts dimmed, the active one highlighted.
  // When a mission is active, fitBounds to its polygon (overrides the dog
  // bounds fit on first render).
  useEffect(() => {
    const map = mapInstanceRef.current;
    const overlay = overlayLayerRef.current;
    if (!map || !overlay) return;
    overlay.clearLayers();
    if (!mission) return;

    for (const d of mission.allDistricts) {
      const isActive = d.slug === mission.slug;
      // Leaflet polygon takes [lat, lng]; our ring is [lon, lat].
      const latlngs: [number, number][] = d.ring.map(([lon, lat]) => [lat, lon]);
      L.polygon(latlngs, {
        color: isActive ? "#15803d" : "#1a1612",
        weight: isActive ? 2.5 : 1,
        opacity: isActive ? 0.9 : 0.18,
        fillColor: isActive ? "#22c55e" : "#1a1612",
        fillOpacity: isActive ? 0.12 : 0.04,
        interactive: false,
      }).addTo(overlay);
    }

    const active = mission.allDistricts.find((d) => d.slug === mission.slug);
    if (active) {
      const bounds = L.latLngBounds(active.ring.map(([lon, lat]) => [lat, lon]));
      map.fitBounds(bounds, { padding: [40, 40] });
      hasFitBoundsRef.current = true;
    }
  }, [mission]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const clusterGroup = clusterGroupRef.current;
    if (!map || !clusterGroup) return;

    clusterGroup.clearLayers();

    const markers = dogs.map((dog) => {
      const marker = L.marker([dog.last_latitude, dog.last_longitude], {
        icon: createDogIcon(dog),
        title: dog.names?.[0] ?? "Unnamed Dog",
      });
      marker.on("click", () => setSelectedDog(dog));
      return marker;
    });

    if (markers.length > 0) clusterGroup.addLayers(markers);

    if (!hasFitBoundsRef.current && dogs.length > 0) {
      const bounds = L.latLngBounds(
        dogs.map((d) => [d.last_latitude, d.last_longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      hasFitBoundsRef.current = true;
    }
  }, [dogs]);

  return (
    <>
      <div ref={mapRef} className="w-full h-full z-0" />

      {mission && (
        <div className="absolute top-3 left-3 right-3 z-[500] flex items-center gap-2.5 rounded-xl bg-background/95 backdrop-blur-sm border border-rule-2 shadow-lg px-3 py-2.5">
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-muted-foreground">
              {mission.previewOnly
                ? tMissions("bannerPreviewLabel")
                : tMissions("bannerLabel")}
            </div>
            <div className="font-semibold text-[14px] leading-tight truncate">
              {localizedName(mission)}
            </div>
            {!mission.previewOnly && (
              <div className="font-mono text-[10.5px] tracking-[0.04em] text-muted-foreground mt-0.5">
                {tMissions("bannerProgressV2", {
                  progress: mission.progress,
                  target: mission.target,
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => router.push("/map")}
            aria-label={tMissions("abandonMission")}
            className="shrink-0 grid place-items-center size-7 rounded-full text-muted-foreground hover:bg-muted transition-colors"
          >
            <span aria-hidden className="text-lg leading-none">×</span>
          </button>
        </div>
      )}

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
