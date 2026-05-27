"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Top-bar nav indicator. Shows immediately when the user clicks an
 * internal link and disappears as soon as the route change resolves.
 *
 * Why this and not just loading.tsx: loading.tsx only kicks in after the
 * RSC stream begins, which on a fast network can be a noticeable beat
 * after the click. This bar fires on the click itself so the user gets
 * instant "your tap registered" feedback and stops over-clicking.
 *
 * Scope: covers any <a> the user clicks anywhere in the page. We don't
 * intercept programmatic router.push() calls — by convention those are
 * already gated on a button press with its own pending state (e.g. the
 * Find a Doggo "Picking a target…" spinner).
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [visible, setVisible] = useState(false);

  // Any URL change (pathname OR search params) means navigation completed.
  // Syncing local UI state with the router URL is exactly what effects
  // are for; the rule's cascading-render warning doesn't apply here
  // because this only re-renders twice per navigation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(false);
  }, [pathname, search]);

  useEffect(() => {
    function isInternal(href: string): boolean {
      if (href.startsWith("/")) return true;
      try {
        const u = new URL(href, window.location.origin);
        return u.origin === window.location.origin;
      } catch {
        return false;
      }
    }

    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      // Modified clicks open in a new tab — let the browser handle them.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }
      const target = e.target as Element | null;
      const link = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!link) return;
      // Skip download / target=_blank / anchor-only / non-navigational schemes.
      if (link.hasAttribute("download")) return;
      if (link.target && link.target !== "" && link.target !== "_self") return;
      const href = link.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      if (!isInternal(href)) return;
      // Same URL → no navigation will fire; don't show the bar.
      const resolved = new URL(href, window.location.href);
      if (
        resolved.pathname === window.location.pathname &&
        resolved.search === window.location.search
      ) {
        return;
      }
      setVisible(true);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none"
    >
      <div
        className="h-full bg-[var(--green-brand)] origin-left"
        style={{
          animation: "nav-progress 8s cubic-bezier(0.1, 0.9, 0.2, 1) forwards",
        }}
      />
    </div>
  );
}
