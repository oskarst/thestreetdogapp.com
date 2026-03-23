"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { User, Shield, Flag, LogOut, UserPen, KeyRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { createClient } from "@/lib/supabase/client";

interface TopNavProps {
  user: {
    id: string;
    email: string;
    nickname: string;
    role: "user" | "rescuer" | "admin";
  };
}

export function TopNav({ user }: TopNavProps) {
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations("nav");

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-border/50 shadow-sm">
      <div className="flex items-center justify-between px-4 h-14">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-primary font-bold text-lg no-underline"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <Image src="/logo.png" alt="Street Dog" width={32} height={32} className="h-8 w-8 object-contain" />
          <span>Street Dog</span>
        </Link>

        <div className="flex items-center gap-1">
          <LanguageSwitcher />

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-lg px-2.5 h-7 text-sm font-medium hover:bg-muted transition-colors outline-none cursor-pointer">
              <User className="h-4 w-4" />
              <span className="max-w-[100px] truncate">
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
