"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReportStatus } from "@/types/database";
import { toast } from "sonner";

interface AdminReport {
  id: string;
  report_type: string;
  message: string;
  status: ReportStatus;
  created_at: string;
  dog_id: string | null;
  user_nickname: string | null;
  user_email: string;
}

const STATUS_COLORS: Record<ReportStatus, "outline" | "default" | "secondary"> = {
  open: "outline",
  in_progress: "default",
  resolved: "secondary",
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  async function fetchReports() {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    const res = await fetch(`/api/admin/reports?${params}`);
    if (res.ok) {
      setReports(await res.json());
    }
  }

  async function updateStatus(id: string, status: ReportStatus) {
    const res = await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success("Status updated");
      fetchReports();
    } else {
      toast.error("Failed to update status");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-xl font-semibold">Reports</h1>

      <Tabs
        defaultValue="all"
        onValueChange={(val) => setStatusFilter(val as string)}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reporter</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Dog</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.user_nickname ?? r.user_email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.report_type}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {r.message}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.dog_id ? r.dog_id.slice(0, 8) + "..." : "-"}
                  </TableCell>
                  <TableCell>
                    <Select
                      defaultValue={r.status}
                      onValueChange={(val) =>
                        updateStatus(r.id, val as ReportStatus)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {reports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No reports found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
