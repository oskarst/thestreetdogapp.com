"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Shield, Flag, LogOut, UserPen, KeyRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggleItem } from "@/components/theme/theme-toggle-item";
import { Icon } from "@/components/ui/icon";
import { createClient } from "@/lib/supabase/client";

interface TopNavProps {
  user: {
    id: string;
    email: string;
    nickname: string;
    role: "user" | "rescuer" | "admin";
  };
  shortId: string;
  streakDays: number;
}

const SECTION_NAMES: Record<string, string> = {
  "/dashboard": "home",
  "/map": "map",
  "/gallery": "pack",
  "/add-dog": "add",
  "/dog": "subject",
  "/dog-caught": "result",
  "/change-nickname": "settings",
  "/change-password": "settings",
  "/report": "report",
  "/admin": "admin",
};

function sectionFor(pathname: string): string {
  for (const prefix of Object.keys(SECTION_NAMES)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return SECTION_NAMES[prefix];
    }
  }
  return "app";
}

export function TopNav({ user, shortId, streakDays }: TopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const t = useTranslations("nav");
  const tDash = useTranslations("dashboard");

  const initial = user.nickname.charAt(0).toUpperCase();
  const section = sectionFor(pathname);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-rule">
      <div className="flex items-center justify-between px-4 py-2 gap-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 no-underline min-w-0"
        >
          <Image
            src="/logo.png"
            alt="Street Dog"
            width={32}
            height={32}
            className="h-8 w-8 object-contain shrink-0"
            priority
          />
          <span className="flex flex-col leading-tight min-w-0">
            <span className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-ink">
              Street-Dog
              <span className="font-medium text-muted-foreground ml-1">
                // {section}
              </span>
            </span>
            <span className="flex items-center gap-1.5 mt-0.5 font-mono text-[9.5px] tracking-[0.06em]">
              <span
                className="size-1.5 rounded-full bg-[var(--green-brand)] shrink-0"
                style={{ animation: "pulse-dot 1.8s ease-in-out infinite" }}
              />
              <span className="text-green-deep">{tDash("statusOnDuty")}</span>
              <span className="text-muted-foreground/60 truncate">
                {shortId}
              </span>
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1 shrink-0">
          {streakDays > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-soft text-amber-brand font-mono text-[10px] font-medium tracking-[0.04em]">
              <Icon name="fire" size={12} />
              {streakDays}d
            </span>
          )}
          <LanguageSwitcher />

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 bg-muted text-ink hover:bg-rule transition-colors outline-none cursor-pointer">
              <span className="grid size-[22px] place-items-center rounded-full bg-ink text-background font-mono text-[11px] font-medium">
                {initial}
              </span>
              <span className="font-mono text-[11px] font-medium tracking-[0.04em] max-w-[100px] truncate">
                {user.nickname}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => router.push("/change-nickname")}>
                <UserPen className="mr-2 h-4 w-4" />
                {t("changeNickname")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/change-password")}>
                <KeyRound className="mr-2 h-4 w-4" />
                {t("changePassword")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/report")}>
                <Flag className="mr-2 h-4 w-4" />
                {t("reportProblem")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <ThemeToggleItem label={t("toggleTheme")} />
              {user.role === "admin" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/admin")}>
                    <Shield className="mr-2 h-4 w-4" />
                    {t("adminPanel")}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                variant="destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
