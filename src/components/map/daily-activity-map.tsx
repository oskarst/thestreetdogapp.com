"use client";

import dynamic from "next/dynamic";

// Inner component lives in its own module so webpack/Turbopack actually
// code-splits the leaflet import. Previously the inner was in this file
// and `dynamic(() => Promise.resolve(Inner))` kept everything in the
// parent's chunk — leaflet shipped on /dog/[id] regardless.
export const DailyActivityMap = dynamic(
  () => import("./daily-activity-map-inner"),
  { ssr: false }
);
