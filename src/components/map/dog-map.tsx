"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import type { DogMarker } from "@/types/database";
import { MapSidePanel } from "./map-side-panel";
import { createClient } from "@/lib/supabase/client";

interface MissionContext {
  slug: string;
  parentNameEn: string;
  parentNameKa: string;
  parentNameRu: string;
  chunkIndex: number;
  progress: number;
  target: number;
  completionXp: number;
  allDistricts: { slug: string; ring: [number, number][] }[];
  locale: string;
  /** True when the user is browsing this chunk but it isn't their active mission. */
  previewOnly?: boolean;
  /** When true, render a live "you are here" marker. */
  showUserLocation?: boolean;
}

interface PickerChunk {
  slug: string;
  parentSlug: string;
  parentNameEn: string;
  parentNameKa: string;
  parentNameRu: string;
  index: number;
  colorIndex: number;
  ring: [number, number][];
  status: "completed" | "active" | "available";
}

interface PickerContext {
  chunks: PickerChunk[];
  colors: string[];
  hasActive: boolean;
  locale: string;
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
  picker?: PickerContext | null;
}

function localizedMissionName(m: MissionContext): string {
  const stem =
    m.locale === "ka"
      ? m.parentNameKa
      : m.locale === "ru"
        ? m.parentNameRu
        : m.parentNameEn;
  return `${stem} ${m.chunkIndex}`;
}

function localizedChunkName(c: PickerChunk, locale: string): string {
  const stem =
    locale === "ka"
      ? c.parentNameKa
      : locale === "ru"
        ? c.parentNameRu
        : c.parentNameEn;
  return `${stem} ${c.index}`;
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

export default function DogMap({ dogs, mission, picker }: DogMapProps) {
  const router = useRouter();
  const tMissions = useTranslations("missions");
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const overlayLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const hasFitBoundsRef = useRef(false);
  const [selectedDog, setSelectedDog] = useState<DogMarker | null>(null);

  const handleClose = useCallback(() => setSelectedDog(null), []);
  const showUserLocation = mission?.showUserLocation ?? false;

  const pickerLayerRef = useRef<L.LayerGroup | null>(null);
  const [picking, startPicking] = useTransition();
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  function handlePickChunk(slug: string) {
    if (!picker || picker.hasActive) return;
    setPickerError(null);
    startPicking(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("start_mission", {
        p_slug: slug,
      });
      if (error) {
        setPickerError(error.message);
        return;
      }
      const result = data as { ok?: boolean; error?: string } | null;
      if (!result?.ok) {
        setPickerError(result?.error ?? "start_failed");
        return;
      }
      router.push(`/map?mission=${slug}`);
      router.refresh();
    });
  }

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
    const pickerLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    clusterGroupRef.current = clusterGroup;
    overlayLayerRef.current = overlay;
    pickerLayerRef.current = pickerLayer;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      clusterGroupRef.current = null;
      overlayLayerRef.current = null;
      pickerLayerRef.current = null;
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

  // Picker mode: render every chunk as a tappable, parent-tinted polygon.
  // Completed chunks are darker + non-interactive; the user's currently
  // active chunk (if any) is highlighted but tapping any other one is
  // disabled until the current mission is finished or cancelled.
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = pickerLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!picker) return;

    const allLatLngs: [number, number][] = [];
    for (const c of picker.chunks) {
      const latlngs: [number, number][] = c.ring.map(([lon, lat]) => [lat, lon]);
      latlngs.forEach((p) => allLatLngs.push(p));
      const baseColor = picker.colors[c.colorIndex] ?? "#1a1612";
      const isCompleted = c.status === "completed";
      const isActive = c.status === "active";
      const isHovered = hovered === c.slug;
      const interactive =
        !isCompleted && (!picker.hasActive || isActive);

      const polygon = L.polygon(latlngs, {
        color: isActive
          ? "#15803d"
          : isHovered
            ? "#1a1612"
            : baseColor,
        weight: isActive ? 3 : isHovered ? 2 : 1.5,
        opacity: isCompleted ? 0.45 : 0.95,
        fillColor: baseColor,
        fillOpacity: isCompleted
          ? 0.22
          : isActive
            ? 0.4
            : isHovered
              ? 0.45
              : 0.28,
        interactive: true,
      });

      // Tooltip with the chunk label
      polygon.bindTooltip(localizedChunkName(c, picker.locale), {
        direction: "center",
        permanent: false,
        className: "chunk-tip",
      });

      if (interactive) {
        polygon.on("mouseover", () => setHovered(c.slug));
        polygon.on("mouseout", () => setHovered(null));
        polygon.on("click", () => handlePickChunk(c.slug));
      }
      polygon.addTo(layer);
    }

    if (allLatLngs.length > 0) {
      const bounds = L.latLngBounds(allLatLngs);
      map.fitBounds(bounds, { padding: [40, 40] });
      hasFitBoundsRef.current = true;
    }
  }, [picker, hovered]);

  // Live "you are here" marker — only when an active mission asks for it.
  // Uses watchPosition so the marker tracks the spotter as they walk.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !showUserLocation) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const userIcon = L.divIcon({
      className: "",
      html: `<div style="
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #2563eb;
        border: 3px solid white;
        box-shadow: 0 0 0 1px rgba(37,99,235,0.4), 0 2px 6px rgba(0,0,0,0.3);
        position: relative;
      "><div style="
        position: absolute;
        inset: -8px;
        border-radius: 50%;
        background: rgba(37,99,235,0.18);
        animation: pulse-dot 2s ease-in-out infinite;
      "></div></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!userMarkerRef.current) {
          userMarkerRef.current = L.marker([latitude, longitude], {
            icon: userIcon,
            interactive: false,
            keyboard: false,
            zIndexOffset: 1000,
          }).addTo(map);
        } else {
          userMarkerRef.current.setLatLng([latitude, longitude]);
        }
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    };
  }, [showUserLocation]);

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

      {picker && (
        <div className="absolute top-3 left-3 right-3 z-[500] rounded-xl bg-background/95 backdrop-blur-sm border border-rule-2 shadow-lg px-3 py-2.5">
          <div className="flex items-start gap-2.5">
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-muted-foreground">
                {tMissions("pickerLabel")}
              </div>
              <div className="text-[13px] font-semibold leading-tight">
                {tMissions(
                  picker.hasActive ? "pickerBlocked" : "pickerPrompt"
                )}
              </div>
              {pickerError && (
                <div className="font-mono text-[10px] tracking-[0.04em] text-destructive mt-1">
                  {pickerError.replace(/_/g, " ")}
                </div>
              )}
              {picking && (
                <div className="font-mono text-[10px] tracking-[0.04em] text-muted-foreground mt-1">
                  …
                </div>
              )}
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              aria-label={tMissions("abandonMission")}
              className="shrink-0 grid place-items-center size-7 rounded-full text-muted-foreground hover:bg-muted transition-colors"
            >
              <span aria-hidden className="text-lg leading-none">×</span>
            </button>
          </div>
        </div>
      )}

      {mission && (
        <div className="absolute top-3 left-3 right-3 z-[500] flex items-center gap-2.5 rounded-xl bg-background/95 backdrop-blur-sm border border-rule-2 shadow-lg px-3 py-2.5">
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-muted-foreground">
              {mission.previewOnly
                ? tMissions("bannerPreviewLabel")
                : tMissions("bannerLabel")}
            </div>
            <div className="font-semibold text-[14px] leading-tight truncate">
              {localizedMissionName(mission)}
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
