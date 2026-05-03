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
  const n = ring.length - 1;
  for (let i = 0; i < n; i++) {
    lon += ring[i][0];
    lat += ring[i][1];
  }
  return [lat / n, lon / n];
}

/**
 * Mission-allocation card. Hybrid design: warm cream surface + ink text
 * + parent-colour accent strip and button. Lighter overlay than the
 * Alien-terminal first cut so the map peeks through.
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
      style={{ background: "rgba(0, 0, 0, 0.45)", backdropFilter: "blur(2px)" }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-xl"
        style={{
          background: "var(--background)",
          color: "var(--ink)",
          border: `1px solid ${color}`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.18), 0 0 0 4px ${color}1a`,
          fontFamily:
            "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
        }}
      >
        {/* Coloured top strip with TBILISI · MISSION ALLOC */}
        <div
          className="px-4 py-2 flex items-center justify-between"
          style={{ background: color, color: "#fff" }}
        >
          <span className="text-[10px] font-medium tracking-[0.32em] uppercase">
            TBILISI · MISSION ALLOC
          </span>
          <span
            className="size-1.5 rounded-full bg-white"
            style={{ animation: "pulse-dot 1.6s ease-in-out infinite" }}
          />
        </div>

        <div className="px-5 py-4">
          <div className="text-[10px] tracking-[0.32em] uppercase text-muted-foreground mb-1">
            QUADRANT_ID
          </div>
          <div className="text-2xl font-medium tracking-[0.04em] leading-tight text-ink mb-1">
            {slugUpper}
          </div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground mb-4">
            {parent} · cell #{chunk.index}
          </div>

          <div className="space-y-1.5 mb-5 text-[11px] tracking-[0.06em] text-ink">
            <Row label="LAT" value={lat.toFixed(5)} />
            <Row label="LON" value={lon.toFixed(5)} />
            <Row
              label="STATUS"
              value={
                chunk.status === "available"
                  ? "[AVAILABLE]"
                  : chunk.status === "active"
                    ? "[ACTIVE]"
                    : "[CLEARED]"
              }
            />
            <Row label="TARGET" value="20 SUBJECTS" />
            <Row label="REWARD" value="+50 XP" />
          </div>

          {error && (
            <div className="mb-4 px-2.5 py-2 text-[10px] tracking-[0.06em] uppercase border border-destructive/50 bg-destructive/10 text-destructive">
              ⚠ {error.replace(/_/g, " ")}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="text-[11px] tracking-[0.32em] font-medium uppercase py-2.5 rounded-lg border border-rule-2 text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              {t("modalAbort")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="text-[11px] tracking-[0.32em] font-medium uppercase py-2.5 rounded-lg transition-transform active:scale-95 disabled:opacity-60"
              style={{
                color: "#fff",
                background: color,
                boxShadow: `0 4px 14px ${color}55`,
              }}
            >
              {loading ? "// PROCESSING…" : `▸ ${t("modalConfirm")}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-16 shrink-0">{label}</span>
      <span className="flex-1 border-b border-dotted border-rule" />
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
