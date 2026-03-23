import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Dog, MapPin, Flag } from "lucide-react";

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
        .select("id, timestamp, profiles:user_id(nickname, email), dogs:dog_id(ear_tag_id, names)")
        .order("timestamp", { ascending: false })
        .limit(10),
    ]);

  const stats = [
    {
      label: "Total Users",
      value: usersRes.count ?? 0,
      icon: Users,
    },
    {
      label: "Total Dogs",
      value: dogsRes.count ?? 0,
      icon: Dog,
    },
    {
      label: "Total Sightings",
      value: sightingsRes.count ?? 0,
      icon: MapPin,
    },
    {
      label: "Open Reports",
      value: reportsRes.count ?? 0,
      icon: Flag,
    },
  ];

  const recent = (recentRes.data ?? []) as unknown as RecentSighting[];

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-xl font-semibold">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-muted-foreground">
                  {s.label}
                </CardTitle>
                <s.icon className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent sightings.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium">
                      {s.profiles?.nickname ?? s.profiles?.email ?? "Unknown"}
                    </span>
                    <span className="text-muted-foreground"> spotted </span>
                    <span className="font-medium">
                      {s.dogs?.names?.[0] ??
                        s.dogs?.ear_tag_id ??
                        "Unknown dog"}
                    </span>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {new Date(s.timestamp).toLocaleDateString()}
                  </time>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
