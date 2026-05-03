"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export function BottomTabs() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const tabs: { href: string; label: string; icon: IconName }[] = [
    { href: "/dashboard", label: t("dogs"), icon: "home" },
    { href: "/map", label: t("map"), icon: "pin" },
    { href: "/missions", label: t("missions"), icon: "flag" },
    { href: "/gallery", label: t("gallery"), icon: "image" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/92 backdrop-blur-md border-t border-rule pb-safe">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-lg no-underline transition-colors",
                "font-mono text-[9.5px] tracking-[0.16em] uppercase",
                isActive
                  ? "text-ink"
                  : "text-muted-foreground/60 hover:text-ink"
              )}
            >
              <Icon name={tab.icon} size={20} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
