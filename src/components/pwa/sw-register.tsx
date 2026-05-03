"use client";

import { useEffect } from "react";

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
  useEffect(() => {
    // Tell the SW to fetch+cache each shell HTML response so returning
    // to one of these routes online survives a network blip. We *don't*
    // call router.prefetch here — its RSC fetches hit middleware/auth
    // and Safari intermittently throws "access control" on the response,
    // plus the prefetch cache is keyed pre-locale-change and serves
    // stale-locale UI if the user switches language afterwards.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.active?.postMessage({
          type: "PRECACHE_PAGES",
          pages: PRECACHE_PAGES,
        });
      });
    }
  }, []);

  return null;
}
