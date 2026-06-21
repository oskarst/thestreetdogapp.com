import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  Dog,
  Clock,
  MapPin,
  Flag,
  BadgePlus,
  Settings,
  ArrowLeft,
} from "lucide-react";

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/dogs", label: "Dogs", icon: Dog },
  { href: "/admin/dogs/pending", label: "Pending dogs", icon: Clock },
  { href: "/admin/sightings", label: "Sightings", icon: MapPin },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/health-reports", label: "Health reports", icon: BadgePlus },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  // Unresolved-work badges in the sidebar. Service-role client (the viewer is
  // already confirmed admin); head+exact gives counts without pulling rows.
  const admin = createAdminClient();
  const [reportsRes, healthRes, pendingRes] = await Promise.all([
    admin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .neq("status", "resolved"),
    admin
      .from("health_reports")
      .select("id", { count: "exact", head: true })
      .neq("status", "resolved"),
    admin
      .from("dogs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .is("deleted_at", null),
  ]);
  const badgeCounts: Record<string, number> = {
    "/admin/reports": reportsRes.count ?? 0,
    "/admin/health-reports": healthRes.count ?? 0,
    "/admin/dogs/pending": pendingRes.count ?? 0,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-rule bg-card">
        <div className="flex h-14 items-center gap-2.5 border-b border-rule px-4">
          <Image
            src="/logo.png"
            alt=""
            width={28}
            height={28}
            className="size-7 object-contain"
          />
          <span className="font-mono text-[12.1px] font-semibold tracking-[0.16em] uppercase text-ink">
            Street-Dog
            <span className="font-medium text-muted-foreground ml-1">
              // admin
            </span>
          </span>
        </div>
        <nav className="flex flex-col gap-0.5 p-2 flex-1">
          {sidebarLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-mono text-[12.1px] tracking-[0.06em] uppercase text-muted-foreground transition-colors hover:bg-muted hover:text-ink"
            >
              <link.icon className="size-4" />
              {link.label}
              {(badgeCounts[link.href] ?? 0) > 0 && (
                <span className="ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {badgeCounts[link.href]}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="border-t border-rule p-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 font-mono text-[12.1px] tracking-[0.06em] uppercase text-muted-foreground hover:bg-muted hover:text-ink"
          >
            <ArrowLeft className="size-3.5" />
            Back to app
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center gap-2 border-b border-rule bg-card px-4 md:hidden">
          <Image
            src="/logo.png"
            alt=""
            width={28}
            height={28}
            className="size-7 object-contain"
          />
          <span className="font-mono text-[12.1px] font-semibold tracking-[0.16em] uppercase">
            Admin
          </span>
          <nav className="ml-auto flex items-center gap-0.5 overflow-x-auto">
            {sidebarLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-ink"
                title={
                  (badgeCounts[link.href] ?? 0) > 0
                    ? `${link.label} (${badgeCounts[link.href]})`
                    : link.label
                }
              >
                <link.icon className="size-4" />
                {(badgeCounts[link.href] ?? 0) > 0 && (
                  <span className="absolute right-0.5 top-0.5 size-2 rounded-full bg-amber-500 ring-2 ring-card" />
                )}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
