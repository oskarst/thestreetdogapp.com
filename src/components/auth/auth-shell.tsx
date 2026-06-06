"use client";

import Image from "next/image";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  /** Footer slot — typically the cross-link to login/register */
  footer?: React.ReactNode;
}

/**
 * Shared chrome for /login and /register: REC strip, logo, eyebrow + title,
 * sub, then the form children, optional footer link.
 */
export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.06em] uppercase text-muted-foreground border-b border-rule pb-3 mb-7">
        <div className="flex items-center gap-2">
          <span
            className="inline-block size-1.5 rounded-full bg-[var(--destructive)]"
            style={{ animation: "pulse-dot 1.6s ease-in-out infinite" }}
          />
          <span>Street-Dog // Auth v3.41</span>
        </div>
        <span>secure</span>
      </div>

      <Image
        src="/logo.png"
        alt="The Street Dog App"
        width={64}
        height={64}
        priority
        className="size-16 object-contain mb-4"
      />

      <div className="font-mono text-[11px] font-medium tracking-[0.22em] uppercase text-muted-foreground mb-1.5">
        {eyebrow}
      </div>
      <h1 className="text-[30.8px] font-bold tracking-[-0.02em] leading-[1.1] mb-1.5">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
        {description}
      </p>

      {children}

      {footer && (
        <div className="text-center font-mono text-[12.1px] tracking-[0.04em] text-muted-foreground mt-3.5">
          {footer}
        </div>
      )}
    </div>
  );
}
