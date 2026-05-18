"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

/**
 * Full-width primary action that sits directly above the BottomTabs nav.
 * Hidden on the /add-dog screen itself and on the mission picker map.
 */
export function StickyAddDogButton() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pathname === "/add-dog") return null;
  if (pathname === "/map" && searchParams.get("picker") === "1") return null;

  return (
    <div
      className="fixed left-0 right-0 z-40 px-3 pb-2 pointer-events-none"
      style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))" }}
    >
      <Link
        href="/add-dog"
        className="pointer-events-auto flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3.5 text-primary-foreground font-bold shadow-lg hover:brightness-110 transition-all no-underline"
      >
        <Plus className="h-5 w-5" />
        <span className="text-sm">{t("addDog")}</span>
      </Link>
    </div>
  );
}
