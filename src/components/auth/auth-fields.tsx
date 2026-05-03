"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: React.ReactNode;
  togglePassword?: boolean;
}

/**
 * Hairline-bordered text/password input with mono caps label, used on the
 * auth screens. Optional password reveal toggle.
 */
export function AuthField({
  label,
  error,
  hint,
  togglePassword,
  type,
  className,
  ...props
}: AuthFieldProps) {
  const [reveal, setReveal] = React.useState(false);
  const effectiveType = togglePassword
    ? reveal
      ? "text"
      : "password"
    : type;

  return (
    <div className="mb-3">
      <label className="block font-mono text-[10px] font-medium tracking-[0.16em] uppercase text-muted-foreground mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={effectiveType}
          className={cn(
            "w-full rounded-[10px] border border-rule-2 bg-card px-3.5 py-3 text-sm text-ink",
            "placeholder:text-muted-foreground/70",
            "focus:outline-none focus:border-ink",
            togglePassword && "pr-10",
            className
          )}
          {...props}
        />
        {togglePassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Hide password" : "Show password"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 grid place-items-center size-6 text-muted-foreground hover:text-ink"
          >
            {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
      {!error && hint && (
        <div className="mt-1 font-mono text-[10px] tracking-[0.04em] text-muted-foreground text-right">
          {hint}
        </div>
      )}
    </div>
  );
}

interface PrimaryAuthButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

/**
 * Dark CTA with green > prompt prefix matching the dashboard CTA.
 */
export function PrimaryAuthButton({
  children,
  loading,
  className,
  disabled,
  ...props
}: PrimaryAuthButtonProps) {
  return (
    <button
      className={cn(
        "w-full mt-1 flex items-center justify-center gap-2 px-4 py-3.5",
        "rounded-xl bg-ink text-background text-[15px] font-semibold",
        "transition-transform active:scale-[0.98] disabled:opacity-60",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      <span className="font-mono text-[var(--green-brand)] font-medium">
        &gt;
      </span>
      {loading ? "…" : children}
    </button>
  );
}

export function AuthDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 my-4 font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground/70">
      <span className="flex-1 h-px bg-rule" />
      <span>{children}</span>
      <span className="flex-1 h-px bg-rule" />
    </div>
  );
}
