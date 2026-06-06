interface AdminHeaderProps {
  eyebrow: string;
  title: string;
  meta?: React.ReactNode;
}

/**
 * Standard admin page heading: mono eyebrow + bold title + optional meta line.
 * Keeps every admin page visually consistent.
 */
export function AdminHeader({ eyebrow, title, meta }: AdminHeaderProps) {
  return (
    <div className="mb-5">
      <div className="font-mono text-[11px] font-medium tracking-[0.22em] uppercase text-muted-foreground mb-1">
        {eyebrow}
      </div>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h1 className="text-[24.2px] font-bold tracking-[-0.02em] leading-tight">
          {title}
        </h1>
        {meta && (
          <span className="font-mono text-[12.1px] tracking-[0.06em] text-muted-foreground">
            {meta}
          </span>
        )}
      </div>
    </div>
  );
}
