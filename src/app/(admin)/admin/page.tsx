import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/admin-header";
import { SectionLabel } from "@/components/ui/section-label";

interface RecentSighting {
  id: string;
  timestamp: string;
  profiles: { nickname: string | null; email: string } | null;
  dogs: { ear_tag_id: string | null; names: string[] } | null;
}

export default async function AdminDashboardPage() {
  const admin = createAdminClient();

  const [usersRes, dogsRes, sightingsRes, reportsRes, recentRes] =
    await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("dogs").select("id", { count: "exact", head: true }),
      admin.from("sightings").select("id", { count: "exact", head: true }),
      admin
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      admin
        .from("sightings")
        .select(
          "id, timestamp, profiles:user_id(nickname, email), dogs:dog_id(ear_tag_id, names)"
        )
        .order("timestamp", { ascending: false })
        .limit(10),
    ]);

  const stats: { label: string; value: number; mult?: string }[] = [
    { label: "Users", value: usersRes.count ?? 0 },
    { label: "Dogs", value: dogsRes.count ?? 0 },
    { label: "Sightings", value: sightingsRes.count ?? 0 },
    { label: "Open Reports", value: reportsRes.count ?? 0 },
  ];

  const recent = (recentRes.data ?? []) as unknown as RecentSighting[];

  return (
    <div>
      <AdminHeader
        eyebrow="Admin · Overview"
        title="Mainframe dashboard"
        meta={`updated ${new Date().toLocaleTimeString()}`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="card-soft p-4">
            <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground">
              {s.label}
            </div>
            <div className="font-mono text-[28px] font-medium leading-none tracking-[-0.02em] mt-2">
              {String(s.value).padStart(2, "0")}
            </div>
          </div>
        ))}
      </div>

      <SectionLabel meta={`last ${recent.length}`}>Recent Activity</SectionLabel>
      <div className="card-soft p-0 overflow-hidden">
        {recent.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No recent sightings.
          </p>
        ) : (
          <div className="divide-y divide-rule">
            {recent.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <div className="min-w-0 truncate">
                  <span className="font-medium text-ink">
                    {s.profiles?.nickname ?? s.profiles?.email ?? "Unknown"}
                  </span>
                  <span className="text-muted-foreground"> spotted </span>
                  <span className="font-medium text-ink">
                    {s.dogs?.names?.[0] ??
                      s.dogs?.ear_tag_id ??
                      "Unknown dog"}
                  </span>
                </div>
                <time className="shrink-0 font-mono text-[11px] tracking-[0.04em] text-muted-foreground">
                  {new Date(s.timestamp).toLocaleDateString()}
                </time>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
