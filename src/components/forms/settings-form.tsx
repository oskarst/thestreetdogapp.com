"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AuthField, PrimaryAuthButton } from "@/components/auth/auth-fields";

interface SettingsFormProps {
  /** Mono caps eyebrow shown above the title (e.g. "Profile · Nickname") */
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  submitLabel: string;
  loading?: boolean;
  error?: string;
}

/**
 * Shared form scaffold for /change-nickname and /change-password — back button,
 * eyebrow, title, the form fields, and a primary CTA.
 */
export function SettingsForm({
  eyebrow,
  title,
  description,
  children,
  onSubmit,
  submitLabel,
  loading,
  error,
}: SettingsFormProps) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 font-mono text-[11px] tracking-[0.16em] uppercase text-muted-foreground hover:text-ink mb-5"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      <div className="font-mono text-[10px] font-medium tracking-[0.22em] uppercase text-muted-foreground mb-1.5">
        {eyebrow}
      </div>
      <h1 className="text-[26px] font-bold tracking-[-0.02em] leading-tight mb-1.5">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-muted-foreground mb-5">{description}</p>
      )}

      <form onSubmit={onSubmit}>
        {children}

        {error && (
          <p className="text-sm text-destructive mb-2">{error}</p>
        )}

        <PrimaryAuthButton type="submit" loading={loading}>
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </span>
          ) : (
            submitLabel
          )}
        </PrimaryAuthButton>
      </form>
    </div>
  );
}

export { AuthField as SettingsField };
