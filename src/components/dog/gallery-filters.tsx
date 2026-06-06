"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { DogGalleryCard } from "@/components/dog/dog-gallery-card";
import { cn } from "@/lib/utils";
import type { DogListRow } from "@/types/database";

type Filter = "all" | "found" | "toFind" | "favorites";

const PAGE_SIZE = 12;

interface GalleryFiltersProps {
  dogs: DogListRow[];
  caughtIds: string[];
  favIds: string[];
}

export function GalleryFilters({
  dogs,
  caughtIds,
  favIds,
}: GalleryFiltersProps) {
  const t = useTranslations("gallery");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const caughtSet = useMemo(() => new Set(caughtIds), [caughtIds]);
  const favSet = useMemo(() => new Set(favIds), [favIds]);

  const counts: Record<Filter, number> = {
    all: dogs.length,
    found: caughtIds.length,
    toFind: dogs.length - caughtIds.length,
    favorites: favIds.length,
  };

  const filtered = useMemo(() => {
    let list = dogs;
    if (filter === "found") list = list.filter((d) => caughtSet.has(d.id));
    if (filter === "toFind")
      list = list.filter((d) => !caughtSet.has(d.id));
    if (filter === "favorites") list = list.filter((d) => favSet.has(d.id));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (d) =>
          (d.names?.[0] ?? "").toLowerCase().includes(q) ||
          (d.ear_tag_id ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [dogs, filter, query, caughtSet, favSet]);

  // Reset the visible window when the filter / search changes — otherwise a
  // user who'd expanded to 200 dogs would briefly render 200 thumbnails when
  // they pivot to a 5-dog filter.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [filter, query]);

  const shown = filtered.slice(0, visible);
  const remaining = filtered.length - shown.length;

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: t("filterAll") },
    { value: "found", label: t("filterFound") },
    { value: "toFind", label: t("filterToFind") },
    { value: "favorites", label: t("filterFavorites") },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-rule-2 bg-card px-3 py-2.5">
        <SearchGlyph />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted-foreground outline-none"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {filters.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full border",
                "font-mono text-[11.6px] font-medium tracking-[0.12em] uppercase",
                active
                  ? "border-ink bg-ink text-background"
                  : "border-rule-2 bg-card text-muted-foreground hover:border-rule"
              )}
            >
              {f.label}
              <span
                className={cn(
                  "ml-1",
                  active ? "text-background/60" : "text-muted-foreground/60"
                )}
              >
                {counts[f.value]}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-card p-8 text-center text-sm text-muted-foreground border border-rule">
          {t("noMatches")}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {shown.map((dog) => (
              <DogGalleryCard key={dog.id} dog={dog} />
            ))}
          </div>

          {remaining > 0 ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-muted-foreground">
                {t("showingOf", { shown: shown.length, total: filtered.length })}
              </span>
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="rounded-lg border border-rule-2 bg-card px-3.5 py-2 font-mono text-[12.1px] font-medium tracking-[0.06em] uppercase text-ink hover:bg-muted transition-colors"
              >
                {t("loadMore", { n: Math.min(PAGE_SIZE, remaining) })}
              </button>
            </div>
          ) : (
            filtered.length > PAGE_SIZE && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setVisible(PAGE_SIZE)}
                  className="font-mono text-[11px] tracking-[0.16em] uppercase text-muted-foreground hover:text-ink transition-colors"
                >
                  {t("collapse")} ↑
                </button>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

function SearchGlyph() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      className="text-muted-foreground shrink-0"
      aria-hidden
    >
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16 L20 20" />
    </svg>
  );
}
