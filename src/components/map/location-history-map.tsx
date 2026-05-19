"use client";

import dynamic from "next/dynamic";

export const LocationHistoryMap = dynamic(
  () => import("./location-history-map-inner"),
  { ssr: false }
);
