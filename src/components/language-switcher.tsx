"use client";

import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const languages = [
  { code: "en", label: "English", short: "EN" },
  { code: "ka", label: "\u10E5\u10D0\u10E0\u10D7\u10E3\u10DA\u10D8", short: "KA" },
  { code: "ru", label: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", short: "RU" },
] as const;

function getCurrentLocale(): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]*)/);
  return match ? match[1] : "en";
}

export function LanguageSwitcher() {
  const router = useRouter();
  const current = getCurrentLocale();
  const currentLang = languages.find((l) => l.code === current) ?? languages[0];

  function handleSelect(code: string) {
    document.cookie = `NEXT_LOCALE=${code};path=/;max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-lg px-2.5 h-7 text-sm font-medium hover:bg-muted transition-colors outline-none cursor-pointer">
        <Globe className="h-4 w-4" />
        <span className="font-medium">{currentLang.short}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className={current === lang.code ? "font-bold bg-accent" : ""}
          >
            <span className="font-semibold mr-2">{lang.short}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
