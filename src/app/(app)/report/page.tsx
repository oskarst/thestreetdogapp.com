"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { SectionLabel } from "@/components/ui/section-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReportType } from "@/types/database";

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "issue", label: "Issue" },
  { value: "health", label: "Health concern" },
  { value: "feedback", label: "Feedback" },
  { value: "other", label: "Other" },
];

export default function ReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dogId = searchParams.get("dog_id");
  const { user, loading: userLoading } = useUser();

  const [reportType, setReportType] = useState<ReportType>("issue");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in to submit a report.");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.from("reports").insert({
        user_id: user.id,
        dog_id: dogId || null,
        report_type: reportType,
        message: message.trim(),
      });

      if (error) throw error;

      toast.success("Report submitted successfully!");
      router.push("/dashboard");
    } catch {
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      <div className="px-1">
        <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1.5">
          Operator · Report
        </div>
        <h1 className="text-[26px] font-bold tracking-[-0.02em] leading-tight">
          Submit a report
        </h1>
        {dogId && (
          <div className="mt-3 font-mono text-[11px] tracking-[0.04em] text-muted-foreground rounded-xl bg-card border border-rule px-3 py-2">
            re subject:{" "}
            <span className="text-ink font-medium">{dogId}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <section>
          <SectionLabel meta="pick one">Report Type</SectionLabel>
          <Select
            value={reportType}
            onValueChange={(val) => setReportType(val as ReportType)}
          >
            <SelectTrigger
              id="report-type"
              className="h-11 w-full rounded-xl border-rule-2 bg-card text-sm"
            >
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <section>
          <SectionLabel meta="required">Message</SectionLabel>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Please provide details…"
            rows={6}
            className="w-full rounded-xl border border-rule-2 bg-card px-3.5 py-2.5 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:border-ink resize-none"
            required
          />
        </section>

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-ink text-background text-[15px] font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            <span className="font-mono text-[var(--green-brand)] font-medium">
              &gt;
            </span>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit report"
            )}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="w-full px-4 py-3 rounded-xl border border-rule-2 bg-card text-sm font-medium text-ink hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
