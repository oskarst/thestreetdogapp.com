import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  Dog,
  MapPin,
  Flag,
  Settings,
  ArrowLeft,
} from "lucide-react";

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/dogs", label: "Dogs", icon: Dog },
  { href: "/admin/sightings", label: "Sightings", icon: MapPin },
  { href: "/admin/reports", label: "Reports", icon: Flag },
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
          <span className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-ink">
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
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-mono text-[11px] tracking-[0.06em] uppercase text-muted-foreground transition-colors hover:bg-muted hover:text-ink"
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-rule p-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 font-mono text-[11px] tracking-[0.06em] uppercase text-muted-foreground hover:bg-muted hover:text-ink"
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
          <span className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase">
            Admin
          </span>
          <nav className="ml-auto flex items-center gap-0.5 overflow-x-auto">
            {sidebarLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-ink"
                title={link.label}
              >
                <link.icon className="size-4" />
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
