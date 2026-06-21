"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import type { DogMarker } from "@/types/database";
import { MapSidePanel } from "./map-side-panel";
import { MissionConfirmModal } from "./mission-confirm-modal";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CITY,
  isInAnyMissionCity,
  MISSION_CITIES,
} from "@/lib/cities";

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
  /** Nickname of the user who owns this chunk (most sightings), or null. */
  dominatedBy?: string | null;
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
  /** Initial map centre [lat, lng] — the viewer's city (Tbilisi fallback). */
  center?: [number, number];
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

const DEFAULT_ZOOM = 13;

// At city zoom, only show dogs inside a known mission city; zooming out past
// this reveals dogs everywhere (a global view).
const CITY_FILTER_MIN_ZOOM = 11;

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

export default function DogMap({
  dogs,
  mission,
  picker,
  center = DEFAULT_CITY.center,
}: DogMapProps) {
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
  // Show the "you are here" pin during an active mission AND while the
  // user is picking a chunk — it helps them choose a nearby one.
  const showUserLocation =
    (mission?.showUserLocation ?? false) || Boolean(picker);

  // Track whether the user has zoomed out past the Tbilisi scale. When
  // they have, non-Tbilisi dogs become visible. Booleans (not raw zoom)
  // so the visibleDogs memo only re-runs when crossing the threshold.
  const [showOutsideTbilisi, setShowOutsideTbilisi] = useState(false);

  const visibleDogs = useMemo(
    () =>
      showOutsideTbilisi
        ? dogs
        : dogs.filter((d) =>
            isInAnyMissionCity(d.last_latitude, d.last_longitude)
          ),
    [dogs, showOutsideTbilisi]
  );

  const pickerLayerRef = useRef<L.LayerGroup | null>(null);
  const hasCenteredOnUserRef = useRef(false);
  const [picking, startPicking] = useTransition();
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [pendingPick, setPendingPick] = useState<PickerChunk | null>(null);

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
      center,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: false,
    });

    L.control
      .attribution({ prefix: '<a href="https://leafletjs.com">Leaflet</a>' })
      .addTo(map);

    // CARTO Voyager: light theme with street names baked in, native zoom
    // to 20 (replaces the Esri Dark Gray Canvas dual-layer setup).
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 20,
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
    map.addLayer(clusterGroup);

    const overlay = L.layerGroup().addTo(map);
    const pickerLayer = L.layerGroup().addTo(map);

    // Show non-Tbilisi dogs only when the user has zoomed out past the
    // city scale. Wired here so the listener is registered once per map
    // instance lifetime.
    const handleZoomEnd = () => {
      setShowOutsideTbilisi(map.getZoom() < CITY_FILTER_MIN_ZOOM);
    };
    map.on("zoomend", handleZoomEnd);

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

  // Normal browse mode: center on the user's location if available, else on
  // the default city (Tbilisi). Runs once and claims the "fit done" flag so
  // the dog-cluster effect doesn't override it by fitting to every dog.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mission || picker) return;
    if (hasFitBoundsRef.current) return;
    hasFitBoundsRef.current = true;
    const toDefault = () => map.setView(DEFAULT_CITY.center, DEFAULT_ZOOM);
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], DEFAULT_ZOOM);
          // If they're outside the mission cities, reveal local dogs that the
          // city-scale filter would otherwise hide at this zoom.
          if (!isInAnyMissionCity(latitude, longitude)) {
            setShowOutsideTbilisi(true);
          }
        },
        toDefault,
        { enableHighAccuracy: false, maximumAge: 60000, timeout: 8000 }
      );
    } else {
      toDefault();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const isDominated = !!c.dominatedBy;
      const interactive =
        !isCompleted && (!picker.hasActive || isActive);

      // Dominated chunks stand out: a denser fill so "owned" turf reads at a
      // glance over un-claimed cells.
      let fillOpacity = isCompleted ? 0.22 : isActive ? 0.4 : 0.28;
      if (isDominated && !isActive && !isCompleted) fillOpacity = 0.58;

      const polygon = L.polygon(latlngs, {
        color: isActive ? "#15803d" : baseColor,
        weight: isActive ? 3 : isDominated ? 2.5 : 1.5,
        opacity: isCompleted ? 0.45 : 0.95,
        fillColor: baseColor,
        fillOpacity,
        // Only tappable chunks capture pointer events. Non-interactive
        // chunks let pinch / double-tap zoom land on the underlying map
        // tile so the user can drill down before committing.
        interactive,
        bubblingMouseEvents: false,
      });

      // Dominated chunks carry a permanent "Dominated by …" badge for
      // everyone; un-dominated chunks just show their name on hover.
      if (isDominated) {
        polygon.bindTooltip(
          tMissions("dominatedBy", { name: c.dominatedBy as string }),
          {
            direction: "center",
            permanent: true,
            className: "chunk-tip chunk-tip-dominated",
          }
        );
      } else {
        polygon.bindTooltip(localizedChunkName(c, picker.locale), {
          direction: "center",
          permanent: false,
          className: "chunk-tip",
        });
      }

      if (interactive) {
        // Tap → open the Alien-style confirmation modal. The actual
        // start_mission RPC fires from the modal's CONFIRM button.
        polygon.on("click", () => {
          setPickerError(null);
          setPendingPick(c);
        });
      }
      polygon.addTo(layer);
    }

    // Fit only on the first render of the picker — subsequent re-runs
    // must NOT snap the user out of their pinch-zoom. Start zoomed in on the
    // chunk-area centre (geolocation recenters on the user below) rather
    // than fitting every chunk, which was too zoomed out to pick one.
    if (!hasFitBoundsRef.current && allLatLngs.length > 0) {
      const bounds = L.latLngBounds(allLatLngs);
      map.setView(bounds.getCenter(), 13);
      hasFitBoundsRef.current = true;
    }
    // tMissions is a stable translator for the labels; re-running this effect
    // on its identity would needlessly redraw every chunk.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picker]);

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
        // On the picker, recenter on the user once (zoomed in) so they pick
        // a chunk near them. First fix only, so we never fight a manual pan.
        if (
          picker &&
          !picker.hasActive &&
          !hasCenteredOnUserRef.current
        ) {
          map.setView([latitude, longitude], 14);
          hasCenteredOnUserRef.current = true;
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

    const markers = visibleDogs.map((dog) => {
      const marker = L.marker([dog.last_latitude, dog.last_longitude], {
        icon: createDogIcon(dog),
        title: dog.names?.[0] ?? "Unnamed Dog",
      });
      marker.on("click", () => setSelectedDog(dog));
      return marker;
    });

    if (markers.length > 0) clusterGroup.addLayers(markers);

    if (!hasFitBoundsRef.current && visibleDogs.length > 0) {
      const bounds = L.latLngBounds(
        visibleDogs.map((d) => [d.last_latitude, d.last_longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      hasFitBoundsRef.current = true;
    }
  }, [visibleDogs]);

  return (
    <>
      <div ref={mapRef} className="w-full h-full z-0" />

      {/* City quick-jump — only in normal browse mode (not picker/mission). */}
      {!picker && !mission && (
        <div className="absolute bottom-3 left-3 right-3 z-[500] flex gap-1.5 overflow-x-auto">
          {MISSION_CITIES.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => {
                setShowOutsideTbilisi(true);
                mapInstanceRef.current?.setView(c.center, 13);
              }}
              className="shrink-0 rounded-full border border-rule-2 bg-background/95 px-3 py-1.5 font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-ink shadow-lg backdrop-blur-sm hover:bg-muted"
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {picker && (
        <div
          className={cn(
            "absolute top-3 left-3 right-3 z-[500] rounded-xl backdrop-blur-sm shadow-lg px-3 py-2.5 border",
            picker.hasActive
              ? "text-white border-[#c03c3c]"
              : "bg-background/95 border-rule-2 text-ink"
          )}
          style={
            picker.hasActive
              ? { background: "rgba(192, 60, 60, 0.95)" }
              : undefined
          }
        >
          <div className="flex items-start gap-2.5">
            {picker.hasActive && (
              <span
                aria-hidden
                className="grid place-items-center size-9 rounded-lg shrink-0"
                style={{ background: "rgba(255,255,255,0.18)" }}
              >
                <span className="text-xl leading-none">⚠</span>
              </span>
            )}
            <div className="flex-1 min-w-0">
              <div
                className="font-mono text-[11px] tracking-[0.32em] uppercase"
                style={{ opacity: picker.hasActive ? 0.85 : 0.6 }}
              >
                {tMissions(
                  picker.hasActive ? "pickerBlockedLabel" : "pickerLabel"
                )}
              </div>
              <div className="text-[15.4px] font-semibold leading-tight mt-0.5">
                {tMissions(
                  picker.hasActive ? "pickerBlocked" : "pickerPrompt"
                )}
              </div>
              {!picker.hasActive && (
                <div
                  className="font-mono text-[11px] tracking-[0.04em] mt-1"
                  style={{ opacity: 0.7 }}
                >
                  {tMissions("pickerPoints")}
                </div>
              )}
              {picker.hasActive && (
                <Link
                  href="/dashboard"
                  className="inline-block mt-1.5 font-mono text-[11px] tracking-[0.16em] uppercase underline underline-offset-2 text-white/95"
                >
                  {tMissions("pickerBlockedCta")} →
                </Link>
              )}
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              aria-label={tMissions("abandonMission")}
              className="shrink-0 grid place-items-center size-7 rounded-full transition-colors"
              style={{
                color: picker.hasActive
                  ? "rgba(255,255,255,0.9)"
                  : "var(--muted-foreground)",
              }}
            >
              <span aria-hidden className="text-lg leading-none">×</span>
            </button>
          </div>
        </div>
      )}

      {/* Alien terminal — mission confirmation modal */}
      {pendingPick && (
        <MissionConfirmModal
          chunk={pendingPick}
          locale={picker?.locale ?? "en"}
          color={picker?.colors[pendingPick.colorIndex] ?? "#22c55e"}
          loading={picking}
          error={pickerError}
          onCancel={() => {
            setPendingPick(null);
            setPickerError(null);
          }}
          onConfirm={() => {
            handlePickChunk(pendingPick.slug);
          }}
        />
      )}

      {mission && (
        <div className="absolute top-3 left-3 right-3 z-[500] flex items-center gap-2.5 rounded-xl bg-background/95 backdrop-blur-sm border border-rule-2 shadow-lg px-3 py-2.5">
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-muted-foreground">
              {mission.previewOnly
                ? tMissions("bannerPreviewLabel")
                : tMissions("bannerLabel")}
            </div>
            <div className="font-semibold text-[15.4px] leading-tight truncate">
              {localizedMissionName(mission)}
            </div>
            {!mission.previewOnly && (
              <div className="font-mono text-[11.6px] tracking-[0.04em] text-muted-foreground mt-0.5">
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
        .chunk-tip-dominated {
          font-weight: 700;
          font-size: 11px;
          color: #15803d;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(21, 128, 61, 0.4);
          border-radius: 6px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
          white-space: nowrap;
        }
        .chunk-tip-dominated::before {
          display: none;
        }
      `}</style>

      <MapSidePanel dog={selectedDog} onClose={handleClose} />
    </>
  );
}
