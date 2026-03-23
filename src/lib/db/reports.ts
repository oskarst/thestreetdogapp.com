import { createClient } from "@/lib/supabase/server";
import type {
  ReportRow,
  ReportInsert,
  ReportStatus,
} from "@/types/database";

export interface ReportWithUser extends ReportRow {
  profiles: { nickname: string | null; email: string } | null;
}

export async function createReport(data: ReportInsert): Promise<ReportRow> {
  const supabase = await createClient();
  const { data: report, error } = await supabase
    .from("reports")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return report;
}

export async function getUserReports(userId: string): Promise<ReportRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getAllReports(filters?: {
  status?: string;
}): Promise<ReportWithUser[]> {
  const supabase = await createClient();
  let query = supabase
    .from("reports")
    .select("*, profiles:user_id(nickname, email)")
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ReportWithUser[];
}

export async function updateReportStatus(
  id: string,
  status: ReportStatus
): Promise<ReportRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
