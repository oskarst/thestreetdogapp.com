/**
 * Dashboard skeleton — renders instantly on tab switch while the page's
 * Supabase round-trips resolve. Matches the rough vertical layout
 * (daily quest, hero, achievements, missions, content) so the visual
 * doesn't jump when the real content lands.
 */
export default function DashboardLoading() {
  return (
    <div className="px-4 py-4 space-y-4 animate-pulse">
      <div className="h-20 rounded-2xl bg-muted" />
      <div className="card-soft p-4 space-y-3">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="flex items-end gap-4">
          <div className="h-14 w-20 rounded bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-1 rounded bg-rule-2" />
          </div>
        </div>
      </div>
      <div className="card-soft p-3 h-12" />
      <div className="card-soft p-3 h-12" />
      <div className="rounded-2xl border border-amber-brand/30 bg-amber-soft/60 h-24" />
      <div className="rounded-lg bg-muted p-1 flex gap-1">
        <div className="flex-1 h-10 rounded-md bg-background/60" />
        <div className="flex-1 h-10 rounded-md" />
        <div className="flex-1 h-10 rounded-md" />
        <div className="flex-1 h-10 rounded-md" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl p-3 ring-1 ring-foreground/10"
        >
          <div className="size-16 shrink-0 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 rounded bg-muted" />
            <div className="h-2 w-24 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
