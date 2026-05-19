/**
 * Gallery skeleton — search bar + filter chips + a 2-col grid of square
 * tiles. Matches the actual layout in GalleryFilters so the swap doesn't
 * jump when the data lands.
 */
export default function GalleryLoading() {
  return (
    <div className="px-4 py-4 space-y-3 animate-pulse">
      <div className="flex items-baseline justify-between">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-3 w-16 rounded bg-muted" />
      </div>
      <div className="rounded-xl border border-rule-2 bg-card h-11" />
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="shrink-0 h-7 w-20 rounded-full bg-card border border-rule-2"
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div
            key={i}
            className="aspect-square rounded-xl bg-rule-2"
          />
        ))}
      </div>
    </div>
  );
}
