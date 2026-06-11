"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ReportDataFormProps {
  dogId: string;
  dogName: string;
}

const MIN_LEN = 4;
const MAX_LEN = 2000;

/**
 * "Report bad data" — files a report_type 'issue' against the dog via the
 * submit_data_report RPC. Mirrors the health-report form.
 */
export function ReportDataForm({ dogId, dogName }: ReportDataFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const tooShort = body.trim().length < MIN_LEN;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (tooShort) {
      setError("Please add a few words about what's wrong.");
      return;
    }
    if (body.trim().length > MAX_LEN) {
      setError("That's a bit too long — please shorten it.");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const { data, error: rpcErr } = await supabase.rpc("submit_data_report", {
        p_dog_id: dogId,
        p_body: body.trim(),
      });
      const r = data as { ok?: boolean } | null;
      if (rpcErr || !r?.ok) {
        setError("Couldn't send the report. Please try again.");
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="card-soft p-5 text-center space-y-3">
        <CheckCircle2 className="h-10 w-10 mx-auto text-ink" />
        <div>
          <h2 className="font-semibold text-[17.6px]">Thanks for the report</h2>
          <p className="text-sm text-muted-foreground mt-1">
            An admin will review the data for {dogName}.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-1">
          <Link
            href={`/dog/${dogId}`}
            className="rounded-full px-3.5 py-2 text-[13.2px] font-mono font-medium tracking-[0.06em] uppercase bg-ink text-background no-underline hover:brightness-110 transition-all"
          >
            Back to dog
          </Link>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-full px-3.5 py-2 text-[13.2px] font-mono font-medium tracking-[0.06em] uppercase text-muted-foreground hover:text-ink transition-colors"
          >
            Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-soft p-4 space-y-3">
      <div>
        <label
          htmlFor="data-report-body"
          className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground"
        >
          What&apos;s wrong with this dog&apos;s data?
        </label>
        <textarea
          id="data-report-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={MAX_LEN + 50}
          placeholder="e.g. wrong ear-tag number, duplicate of another dog, wrong photo, wrong location…"
          className="mt-1.5 w-full rounded-xl border border-rule bg-background px-3 py-2.5 text-[15.4px] leading-snug text-ink placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ink/30 focus:border-ink"
        />
        <div className="flex justify-between mt-1 font-mono text-[11px] text-muted-foreground">
          <span>min {MIN_LEN} characters</span>
          <span>
            {body.trim().length} / {MAX_LEN}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Link
          href={`/dog/${dogId}`}
          className="font-mono text-[12.1px] tracking-[0.06em] uppercase text-muted-foreground hover:text-ink transition-colors no-underline px-2 py-1.5"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending || tooShort}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[12.1px] font-medium tracking-[0.06em] uppercase bg-ink text-background disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Send report
        </button>
      </div>
    </form>
  );
}
