/**
 * Dashboard loading splash — the first load (fresh visit, cold tab, or
 * a manual reload while data fetches) shows a centred dog logo with the
 * Street-Dog wordmark and a subtle pulse. Stays simple so it doesn't
 * cost a separate stylesheet; reuses the existing pulse-dot keyframe
 * defined in globals.css.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center gap-5">
      {/* Logo with a gentle pulse so the user knows something is happening. */}
      <div
        className="size-20 sm:size-24"
        style={{ animation: "pulse-dot 1.8s ease-in-out infinite" }}
      >
        <img
          src="/logo.png"
          alt="Street Dog"
          width={96}
          height={96}
          className="size-full object-contain"
        />
      </div>

      <div className="space-y-1.5">
        <div className="font-mono text-[11px] font-semibold tracking-[0.32em] uppercase text-ink">
          Street-Dog
        </div>
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground">
          loading dashboard
        </div>
      </div>

      {/* Three dots that read as a heartbeat rather than a generic spinner. */}
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
    </div>
  );
}
