"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, MapPin, Image } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomTabs() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const tabs = [
    { href: "/dashboard", label: t("dogs"), icon: Home },
    { href: "/map", label: t("map"), icon: MapPin },
    { href: "/gallery", label: t("gallery"), icon: Image },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border/50 shadow-[0_-1px_3px_rgba(0,0,0,0.05)] pb-safe">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-2 text-xs no-underline transition-colors",
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
