"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface DogNameInputProps {
  dogId: string;
  redirectAfterSave?: string;
  autoFocus?: boolean;
}

export function DogNameInput({
  dogId,
  redirectAfterSave,
  autoFocus = true,
}: DogNameInputProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/dogs/${dogId}/name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) {
        throw new Error(body?.error ?? "Failed to save name");
      }
      if (redirectAfterSave) {
        router.push(redirectAfterSave);
      } else {
        setSavedName(trimmed);
        setName("");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save name");
    } finally {
      setSubmitting(false);
    }
  }

  if (savedName) {
    return (
      <div className="rounded-xl border border-[var(--green-brand)]/40 bg-green-soft px-3.5 py-3 text-center">
        <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-green-deep">
          Named
        </div>
        <div className="text-[15.4px] font-semibold text-ink mt-0.5">
          Subject named &ldquo;{savedName}&rdquo;
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter a name…"
        className="w-full rounded-xl border border-rule-2 bg-card px-3.5 py-3 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:border-ink"
        maxLength={20}
        required
        autoFocus={autoFocus}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !name.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-ink text-background text-[16.5px] font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        <span className="font-mono text-[var(--green-brand)] font-medium">
          &gt;
        </span>
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save name"
        )}
      </button>
    </form>
  );
}
