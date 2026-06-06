"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface Tab {
  href: string;
  label: string;
  icon: IconName;
  /** Custom predicate so e.g. /map?picker=1 lights "Missions" tab not "Map". */
  isMatch?: (pathname: string, params: URLSearchParams) => boolean;
}

export function BottomTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("nav");

  const tabs: Tab[] = [
    { href: "/dashboard", label: t("dogs"), icon: "home" },
    {
      href: "/map",
      label: t("map"),
      icon: "pin",
      isMatch: (p, q) =>
        (p === "/map" || p.startsWith("/map/")) && q.get("picker") !== "1",
    },
    {
      // Missions tab opens the mission-type chooser (Find a Doggo / map
      // mission), not the map picker or the district list directly.
      href: "/missions/start",
      label: t("missions"),
      icon: "flag",
      isMatch: (p, q) =>
        p.startsWith("/missions") || (p === "/map" && q.get("picker") === "1"),
    },
    { href: "/gallery", label: t("gallery"), icon: "image" },
  ];

  return (
    <nav className="flex items-center justify-around h-16">
      {tabs.map((tab) => {
        const isActive = tab.isMatch
          ? tab.isMatch(pathname, searchParams)
          : pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-lg no-underline transition-colors",
              "font-mono text-[10.5px] tracking-[0.16em] uppercase",
              isActive ? "text-ink" : "text-muted-foreground/60 hover:text-ink"
            )}
          >
            <Icon name={tab.icon} size={20} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
