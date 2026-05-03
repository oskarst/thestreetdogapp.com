"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

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

interface MissionConfirmModalProps {
  chunk: PickerChunk;
  locale: string;
  color: string;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

function localizedParent(c: PickerChunk, locale: string): string {
  if (locale === "ka") return c.parentNameKa;
  if (locale === "ru") return c.parentNameRu;
  return c.parentNameEn;
}

function centroid(ring: [number, number][]): [number, number] {
  let lon = 0,
    lat = 0;
  // GeoJSON polygons close at the start; ignore the duplicate last vertex.
  const n = ring.length - 1;
  for (let i = 0; i < n; i++) {
    lon += ring[i][0];
    lat += ring[i][1];
  }
  return [lat / n, lon / n];
}

/**
 * Nostromo-style terminal mission confirmation. Black bg, neon accent
 * pulled from the chunk's parent colour, monospace, scan lines.
 * Replaces the old "tap-to-instant-start" with a deliberate confirm step
 * so a stray tap doesn't lock the user into the wrong chunk.
 */
export function MissionConfirmModal({
  chunk,
  locale,
  color,
  loading,
  error,
  onCancel,
  onConfirm,
}: MissionConfirmModalProps) {
  const t = useTranslations("missions");

  // ESC = abort
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const [lat, lon] = centroid(chunk.ring);
  const parent = localizedParent(chunk, locale);
  const slugUpper = chunk.slug.toUpperCase().replace(/-/g, "·");

  return (
    <div
      className="fixed inset-0 z-[1000] grid place-items-center px-4"
      style={{
        background:
          "radial-gradient(circle at center, rgba(0,0,0,0.85), rgba(0,0,0,0.96))",
        backdropFilter: "blur(2px)",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden"
        style={{
          background: "#04140a",
          border: `1px solid ${color}`,
          borderRadius: 4,
          boxShadow: `0 0 0 1px rgba(0,0,0,0.6), 0 0 32px ${color}66, inset 0 0 24px ${color}22`,
          color,
          fontFamily:
            "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
        }}
      >
        {/* Scan lines */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 3px)",
          }}
        />
        {/* Vignette + flicker */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)",
            animation: "alien-flicker 4.2s steps(60) infinite",
          }}
        />

        <div className="relative px-5 pt-4 pb-5">
          {/* Header bar */}
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-dashed" style={{ borderColor: `${color}55` }}>
            <span className="text-[10px] tracking-[0.32em] font-medium">
              MU-TH-UR ⊳ MISSION ALLOC
            </span>
            <span
              className="size-1.5 rounded-full"
              style={{
                background: color,
                boxShadow: `0 0 8px ${color}`,
                animation: "pulse-dot 1.4s ease-in-out infinite",
              }}
            />
          </div>

          <div className="text-[10px] tracking-[0.32em] uppercase opacity-70 mb-1">
            QUADRANT_ID
          </div>
          <div className="text-2xl font-medium tracking-[0.04em] leading-tight mb-1">
            {slugUpper}
          </div>
          <div className="text-[11px] tracking-[0.18em] uppercase opacity-80 mb-4">
            {parent} · cell #{chunk.index}
          </div>

          <div className="space-y-1.5 mb-5 text-[11px] tracking-[0.06em]">
            <Row label="LAT" value={lat.toFixed(5)} color={color} />
            <Row label="LON" value={lon.toFixed(5)} color={color} />
            <Row
              label="STATUS"
              value={
                chunk.status === "available"
                  ? "[AVAILABLE]"
                  : chunk.status === "active"
                    ? "[ACTIVE]"
                    : "[CLEARED]"
              }
              color={color}
            />
            <Row label="TARGET" value="20 SUBJECTS" color={color} />
            <Row label="REWARD" value="+50 XP" color={color} />
          </div>

          {error && (
            <div
              className="mb-4 px-2 py-1.5 text-[10px] tracking-[0.06em] uppercase border"
              style={{ borderColor: "#ef4444aa", color: "#ef4444" }}
            >
              ⚠ {error.replace(/_/g, " ")}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="text-[11px] tracking-[0.32em] font-medium uppercase py-2.5 transition-opacity disabled:opacity-50"
              style={{
                color,
                background: "transparent",
                border: `1px solid ${color}66`,
              }}
            >
              {t("modalAbort")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="text-[11px] tracking-[0.32em] font-medium uppercase py-2.5 transition-transform active:scale-95 disabled:opacity-60"
              style={{
                color: "#04140a",
                background: color,
                border: `1px solid ${color}`,
                boxShadow: `0 0 14px ${color}88`,
              }}
            >
              {loading ? "// PROCESSING…" : `▸ ${t("modalConfirm")}`}
            </button>
          </div>

          <div
            className="mt-4 text-[9px] tracking-[0.32em] uppercase opacity-60 text-center"
            style={{ letterSpacing: "0.32em" }}
          >
            ⊏ ⊐ ⊏ ⊐ ⊏ ⊐ ⊏ ⊐ ⊏ ⊐ ⊏ ⊐
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes alien-flicker {
          0%, 96%, 100% { opacity: 1; }
          97% { opacity: 0.85; }
          98% { opacity: 0.95; }
          99% { opacity: 0.78; }
        }
      `}</style>
    </div>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="opacity-70 w-16 shrink-0">{label}</span>
      <span
        className="flex-1 border-b border-dotted"
        style={{ borderColor: `${color}55` }}
      />
      <span className="font-medium">{value}</span>
    </div>
  );
}
