"use client";

import { useMemo, useState } from "react";
import { DogGalleryCard } from "@/components/dog/dog-gallery-card";
import { cn } from "@/lib/utils";
import type { DogRow } from "@/types/database";

type Filter = "all" | "caught" | "uncaught" | "favorites";

interface GalleryFiltersProps {
  dogs: DogRow[];
  caughtIds: string[];
  favIds: string[];
}

export function GalleryFilters({
  dogs,
  caughtIds,
  favIds,
}: GalleryFiltersProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const caughtSet = useMemo(() => new Set(caughtIds), [caughtIds]);
  const favSet = useMemo(() => new Set(favIds), [favIds]);

  const counts = {
    all: dogs.length,
    caught: caughtIds.length,
    uncaught: dogs.length - caughtIds.length,
    favorites: favIds.length,
  };

  const filtered = useMemo(() => {
    let list = dogs;
    if (filter === "caught") list = list.filter((d) => caughtSet.has(d.id));
    if (filter === "uncaught")
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

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "caught", label: "Caught" },
    { value: "uncaught", label: "Uncaught" },
    { value: "favorites", label: "Favorites" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-rule-2 bg-card px-3 py-2.5">
        <SearchGlyph />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, ear tag, neighborhood…"
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
                "font-mono text-[10.5px] font-medium tracking-[0.12em] uppercase",
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
          No dogs match this filter.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {filtered.map((dog) => (
            <DogGalleryCard key={dog.id} dog={dog} />
          ))}
        </div>
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
