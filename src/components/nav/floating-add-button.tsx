"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

export function FloatingAddButton() {
  const t = useTranslations("nav");

  return (
    <Link
      href="/add-dog"
      className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground font-bold shadow-lg hover:shadow-xl hover:brightness-110 transition-all no-underline"
    >
      <Plus className="h-5 w-5" />
      <span className="text-sm">{t("addDog")}</span>
    </Link>
  );
}
