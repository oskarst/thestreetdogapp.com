"use client";

import Link from "next/link";
import { BadgePlus, Home } from "lucide-react";
import { useTranslations } from "next-intl";
import { FavoriteButton } from "@/components/dog/favorite-button";

interface DogActionIconsProps {
  userId: string;
  dogId: string;
  isFavorited: boolean;
  /** Larger hit targets + slightly bigger icons for the dog detail header. */
  size?: "sm" | "md";
}

/**
 * Three-icon action row on dog cards / dog detail header:
 *   - Heart       → existing favourite toggle
 *   - BadgePlus   → /dog/{id}/report-health (flag injuries / illness)
 *   - Home        → /dog/{id}/adopt        (adoption info + vet contacts)
 *
 * Each button stops propagation so taps inside a clickable card don't fall
 * through to the row-level navigate-to-dog handler.
 */
export function DogActionIcons({
  userId,
  dogId,
  isFavorited,
  size = "sm",
}: DogActionIconsProps) {
  const t = useTranslations("dogActions");
  const iconClass = size === "md" ? "h-5 w-5" : "h-4.5 w-4.5";
  const btnClass =
    size === "md"
      ? "p-2 rounded-full transition-colors"
      : "p-1.5 rounded-full transition-colors";

  return (
    <div
      className="flex items-center gap-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      <FavoriteButton
        userId={userId}
        dogId={dogId}
        initialFavorited={isFavorited}
      />
      <Link
        href={`/dog/${dogId}/report-health`}
        prefetch={false}
        className={`${btnClass} text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950`}
        aria-label={t("reportHealth")}
        title={t("reportHealth")}
      >
        <BadgePlus className={iconClass} strokeWidth={1.75} />
      </Link>
      <Link
        href={`/dog/${dogId}/adopt`}
        prefetch={false}
        className={`${btnClass} text-muted-foreground hover:text-amber-brand hover:bg-amber-soft`}
        aria-label={t("adoptInfo")}
        title={t("adoptInfo")}
      >
        <Home className={iconClass} strokeWidth={1.75} />
      </Link>
    </div>
  );
}
