import { cn } from "@/lib/utils";

interface SectionLabelProps {
  children: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}

/**
 * Mono caps section header used throughout the hybrid design.
 * Optional right-aligned meta text (e.g. counts, "resets 00:00").
 */
export function SectionLabel({ children, meta, className }: SectionLabelProps) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3 px-0.5 mb-2",
        className
      )}
    >
      <span className="font-mono text-[12.1px] font-medium tracking-[0.22em] uppercase text-muted-foreground">
        {children}
      </span>
      {meta != null && (
        <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-muted-foreground/70">
          {meta}
        </span>
      )}
    </div>
  );
}

interface StatusDotProps {
  className?: string;
  pulse?: boolean;
}

/**
 * Live-state indicator used for "ON_DOG_SPOTTING" and similar pills.
 */
export function StatusDot({ className, pulse = true }: StatusDotProps) {
  return (
    <span
      className={cn(
        "inline-block size-1.5 rounded-full bg-current shadow-[0_0_0_3px_var(--green-soft)]",
        pulse && "animate-[pulse-dot_1.8s_ease-in-out_infinite]",
        className
      )}
      style={{
        animation: pulse ? "pulse-dot 1.8s ease-in-out infinite" : undefined,
      }}
    />
  );
}
