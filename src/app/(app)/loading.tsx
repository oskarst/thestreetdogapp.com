/**
 * Default loading skeleton for any authenticated route that hasn't
 * defined its own loading.tsx. Shows immediately on navigation so the
 * user gets visual feedback instead of an unresponsive idle screen
 * during slow network or RSC streaming. More specific routes (dashboard,
 * gallery) override this with a richer skeleton.
 */
export default function AppRouteLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
      <div className="flex items-center gap-1.5">
        {[0, 0.2, 0.4].map((delay, i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-[var(--green-brand)]"
            style={{
              animation: "pulse-dot 1.4s ease-in-out infinite",
              animationDelay: `${delay}s`,
            }}
          />
        ))}
      </div>
      <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground">
        loading
      </div>
    </div>
  );
}
