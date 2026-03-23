"use client";

import { useEffect } from "react";

const PRECACHE_PAGES = ["/dashboard", "/add-dog", "/map", "/gallery"];

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[SW] Registered, scope:", reg.scope);

          // Pre-cache key pages after SW is ready
          navigator.serviceWorker.ready.then((registration) => {
            registration.active?.postMessage({
              type: "PRECACHE_PAGES",
              pages: PRECACHE_PAGES,
            });
          });
        })
        .catch((err) => {
          console.error("[SW] Registration failed:", err);
        });
    }
  }, []);

  return null;
}
