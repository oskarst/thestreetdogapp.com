"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Shield, Flag, Heart, LogOut, UserPen, KeyRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import dynamic from "next/dynamic";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggleItem } from "@/components/theme/theme-toggle-item";
import { createClient } from "@/lib/supabase/client";

// TourButton owns driver.js + tour state. Loading it dynamically keeps
// driver.js out of the shared TopNav chunk; the button only mounts on
// /dashboard anyway, so non-dashboard navigations don't even fetch it.
const TourButton = dynamic(
  () => import("@/components/tour/tour-button").then((m) => m.TourButton),
  { ssr: false, loading: () => null }
);

interface TopNavProps {
  user: {
    id: string;
    email: string;
    nickname: string;
    role: "user" | "rescuer" | "admin";
  };
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
  "/support": "support",
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

export function TopNav({ user }: TopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const t = useTranslations("nav");

  const initial = user.nickname.charAt(0).toUpperCase();
  const section = sectionFor(pathname);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-rule">
      <div className="flex items-center justify-between px-4 h-14">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 no-underline"
        >
          <Image
            src="/logo.png"
            alt="Street Dog"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
            priority
          />
          <span className="font-mono text-[12.1px] font-semibold tracking-[0.16em] uppercase text-ink">
            Street-Dog
            <span className="font-medium text-muted-foreground ml-1">
              // {section}
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1 shrink-0">
          {pathname === "/dashboard" && <TourButton userId={user.id} />}
          <LanguageSwitcher />

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 bg-muted text-ink hover:bg-rule transition-colors outline-none cursor-pointer">
              <span className="grid size-[22px] place-items-center rounded-full bg-ink text-background font-mono text-[12.1px] font-medium">
                {initial}
              </span>
              <span className="font-mono text-[12.1px] font-medium tracking-[0.04em] max-w-[100px] truncate">
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
              <DropdownMenuItem onClick={() => router.push("/support")}>
                <Heart className="mr-2 h-4 w-4 text-red-500" />
                {t("supportAndDonate")}
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
