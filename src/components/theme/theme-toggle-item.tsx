"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

const STORAGE_KEY = "ui-theme";

function readPref(): "dark" | "light" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Single dropdown item that flips the html .dark class and persists to
 * localStorage. The actual class is set BEFORE hydration via a tiny
 * inline script in app/layout.tsx so there's no flash on cold load.
 */
export function ThemeToggleItem({ label }: { label?: string }) {
  const [theme, setTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    setTheme(readPref());
  }, []);

  function toggle(e: Event | React.SyntheticEvent) {
    e.preventDefault?.();
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable in some private modes; ignore.
    }
    setTheme(next);
  }

  return (
    <DropdownMenuItem onSelect={(e) => toggle(e)}>
      {theme === "dark" ? (
        <Sun className="mr-2 h-4 w-4" />
      ) : (
        <Moon className="mr-2 h-4 w-4" />
      )}
      {label ?? (theme === "dark" ? "Light mode" : "Dark mode")}
    </DropdownMenuItem>
  );
}
