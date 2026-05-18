"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

/**
 * Primary "Add a dog" action rendered as the top row of the AppFooter.
 * Returns null on the /add-dog screen itself and on the mission-picker
 * map, otherwise renders a full-width pill that sits flush against the
 * BottomTabs below it.
 */
export function StickyAddDogButton() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pathname === "/add-dog") return null;
  if (pathname === "/map" && searchParams.get("picker") === "1") return null;

  return (
    <div className="px-3 pt-2 pb-1">
      <Link
        href="/add-dog"
        className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground font-bold hover:brightness-110 transition-all no-underline"
      >
        <Plus className="h-5 w-5" />
        <span className="text-sm">{t("addDog")}</span>
      </Link>
    </div>
  );
}
