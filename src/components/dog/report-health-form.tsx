"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ReportHealthFormProps {
  dogId: string;
  dogName: string;
}

const MIN_LEN = 4;
const MAX_LEN = 2000;

export function ReportHealthForm({ dogId, dogName }: ReportHealthFormProps) {
  const t = useTranslations("healthReport");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const tooShort = body.trim().length < MIN_LEN;
  const tooLong = body.trim().length > MAX_LEN;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (tooShort) {
      setError(t("errorTooShort"));
      return;
    }
    if (tooLong) {
      setError(t("errorTooLong"));
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const { data, error: rpcErr } = await supabase.rpc(
        "submit_health_report",
        { p_dog_id: dogId, p_body: body.trim() }
      );
      if (rpcErr) {
        setError(t("errorGeneric"));
        return;
      }
      const r = data as { ok?: boolean; error?: string } | null;
      if (!r?.ok) {
        setError(r?.error ? t("errorGeneric") : t("errorGeneric"));
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-[var(--green-brand)]/40 bg-green-soft p-5 text-center space-y-3">
        <CheckCircle2 className="h-10 w-10 mx-auto text-[var(--green-deep)]" />
        <div>
          <h2 className="font-semibold text-[16px] text-[var(--green-deep)]">
            {t("thanksTitle")}
          </h2>
          <p className="text-sm text-[var(--green-deep)]/80 mt-1">
            {t("thanksBody", { name: dogName })}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-1">
          <Link
            href={`/dog/${dogId}`}
            className="rounded-full px-3.5 py-2 text-[12px] font-mono font-medium tracking-[0.06em] uppercase bg-ink text-background no-underline hover:brightness-110 transition-all"
          >
            {t("backToDog")}
          </Link>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-full px-3.5 py-2 text-[12px] font-mono font-medium tracking-[0.06em] uppercase text-muted-foreground hover:text-ink transition-colors"
          >
            {t("backHome")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-soft p-4 space-y-3">
      <div>
        <label
          htmlFor="health-report-body"
          className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground"
        >
          {t("formLabel")}
        </label>
        <textarea
          id="health-report-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={MAX_LEN + 50}
          placeholder={t("placeholder")}
          className="mt-1.5 w-full rounded-xl border border-rule bg-background px-3 py-2.5 text-[14px] leading-snug text-ink placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-amber-brand/40 focus:border-amber-brand"
        />
        <div className="flex justify-between mt-1 font-mono text-[10px] text-muted-foreground">
          <span>{t("minHint", { n: MIN_LEN })}</span>
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
          className="font-mono text-[11px] tracking-[0.06em] uppercase text-muted-foreground hover:text-ink transition-colors no-underline px-2 py-1.5"
        >
          {t("cancel")}
        </Link>
        <button
          type="submit"
          disabled={pending || tooShort}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] font-medium tracking-[0.06em] uppercase bg-ink text-background disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t("submit")}
        </button>
      </div>
    </form>
  );
}
