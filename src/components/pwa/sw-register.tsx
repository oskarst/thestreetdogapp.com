"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Reload the page once when a new service worker takes control. Combined
// with skipWaiting() + clients.claim() in sw.js, this ensures users see
// new code on their next page load instead of being stuck on whatever
// chunks the previous SW had cached.
let reloadedThisSession = false;

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        console.log("[SW] Registered, scope:", reg.scope);
        // Poll for updates on every navigation back into the tab.
        const onVisible = () => {
          if (document.visibilityState === "visible") reg.update();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
      })
      .catch((err) => {
        console.error("[SW] Registration failed:", err);
      });

    const onControllerChange = () => {
      if (reloadedThisSession) return;
      reloadedThisSession = true;
      // Soft reload — picks up the new chunks without showing the user a
      // hard navigation flash.
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );
    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };
  }, []);

  return null;
}

const PRECACHE_PAGES = ["/dashboard", "/add-dog", "/map", "/gallery"];

export function PrecachePages() {
  const router = useRouter();

  useEffect(() => {
    // Warm Next's route chunks via the router. Unlike a hidden iframe
    // this doesn't run the page's effects — no geolocation prompt, no
    // Supabase round-trips, no double-render — it just fetches the JS
    // chunks for each route. Once the SW's static-asset cache picks
    // them up, /add-dog navigates instantly even on a flaky link.
    PRECACHE_PAGES.forEach((path) => router.prefetch(path));

    // Also tell the SW to fetch+cache each shell HTML response, so
    // returning to one of these routes online survives a network blip.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.active?.postMessage({
          type: "PRECACHE_PAGES",
          pages: PRECACHE_PAGES,
        });
      });
    }
  }, [router]);

  return null;
}
