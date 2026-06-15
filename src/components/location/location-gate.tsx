"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  cityBySlug,
  cityForPoint,
  DEFAULT_CITY,
  VIEWER_CITY_COOKIE,
} from "@/lib/cities";

interface ViewerLocation {
  /** Resolved city slug, or null when positively outside every mission city. */
  citySlug: string | null;
  inMissionCity: boolean;
  showChunkMissions: boolean;
  /** [lat, lng] map centre for the viewer's city (Tbilisi fallback). */
  center: [number, number];
}

const Ctx = createContext<ViewerLocation>({
  citySlug: DEFAULT_CITY.slug,
  inMissionCity: true,
  showChunkMissions: true,
  center: DEFAULT_CITY.center,
});

export const useViewerLocation = () => useContext(Ctx);

/**
 * Detects which mission city (if any) the viewer is in and exposes it to the
 * tree, so mission UI can be hidden outside the supported cities. To avoid an
 * unexpected permission prompt, it only auto-detects when geolocation is
 * *already granted* (the map / add-dog flows are where users grant it). On a
 * change it writes the `sd_city` cookie and refreshes so server components
 * (dashboard missions, route guards) re-evaluate.
 */
export function LocationGate({
  initialCitySlug,
  children,
}: {
  initialCitySlug: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [citySlug, setCitySlug] = useState<string | null>(initialCitySlug);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;

    (async () => {
      // Only proceed if geolocation is already granted — never prompt here.
      try {
        const perm = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });
        if (perm.state !== "granted") return;
      } catch {
        return; // Permissions API unsupported → don't risk a prompt.
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          const city = cityForPoint(pos.coords.latitude, pos.coords.longitude);
          const slug = city ? city.slug : "none";
          setCitySlug(city ? city.slug : null);
          const current = document.cookie.match(/(?:^|; )sd_city=([^;]*)/)?.[1];
          if (current !== slug) {
            document.cookie = `${VIEWER_CITY_COOKIE}=${slug}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
            router.refresh();
          }
        },
        () => {},
        { maximumAge: 5 * 60 * 1000, timeout: 8000 }
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const city = citySlug ? cityBySlug(citySlug) : null;
  return (
    <Ctx.Provider
      value={{
        citySlug,
        inMissionCity: citySlug !== null,
        showChunkMissions: !!city?.hasChunks,
        center: city?.center ?? DEFAULT_CITY.center,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
