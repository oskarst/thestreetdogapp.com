"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

type Status = "new" | "reviewed" | "resolved";

interface HealthReport {
  id: string;
  dog_id: string;
  dog_name: string | null;
  dog_ear_tag: string | null;
  reporter_id: string;
  reporter_name: string | null;
  body: string;
  status: Status;
  admin_note: string | null;
  created_at: string;
}

const STATUS_VARIANT: Record<Status, "outline" | "default" | "secondary"> = {
  new: "outline",
  reviewed: "default",
  resolved: "secondary",
};

export default function AdminHealthReportsPage() {
  const [reports, setReports] = useState<HealthReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_health_reports_admin", {
      p_status: statusFilter === "all" ? null : statusFilter,
    });
    if (error) {
      toast.error(error.message);
    } else {
      setReports((data ?? []) as HealthReport[]);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  async function updateStatus(id: string, status: Status) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc(
      "update_health_report_status",
      { p_id: id, p_status: status, p_admin_note: null }
    );
    const r = data as { ok?: boolean; error?: string } | null;
    if (error || !r?.ok) {
      toast.error(r?.error ?? error?.message ?? "Update failed");
      return;
    }
    toast.success(`Marked ${status}`);
    fetchReports();
  }

  const counts = reports.reduce<Record<Status, number>>(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    { new: 0, reviewed: 0, resolved: 0 }
  );

  return (
    <div>
      <AdminHeader
        eyebrow="Admin · Triage"
        title="Health reports"
        meta={`new ${counts.new} · reviewed ${counts.reviewed} · resolved ${counts.resolved}`}
      />

      <div className="mb-4 flex items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v ?? "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchReports}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="card-soft p-6 grid place-items-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <div className="card-soft p-6 text-sm text-muted-foreground text-center">
          No health reports.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="card-soft p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <Link
                    href={`/dog/${r.dog_id}`}
                    className="font-semibold text-[16.5px] text-ink hover:underline"
                  >
                    {r.dog_name || "Unnamed dog"}
                  </Link>
                  <div className="font-mono text-[12.1px] text-muted-foreground mt-0.5">
                    {r.dog_ear_tag ? `tag ${r.dog_ear_tag} · ` : ""}
                    reported by {r.reporter_name ?? "anon"} ·{" "}
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-snug mb-3">
                {r.body}
              </p>
              <div className="flex items-center gap-2">
                {r.status !== "reviewed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(r.id, "reviewed")}
                  >
                    Mark reviewed
                  </Button>
                )}
                {r.status !== "resolved" && (
                  <Button
                    size="sm"
                    onClick={() => updateStatus(r.id, "resolved")}
                  >
                    Resolve
                  </Button>
                )}
                {r.status !== "new" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateStatus(r.id, "new")}
                  >
                    Reopen
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
