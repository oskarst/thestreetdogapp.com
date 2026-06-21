import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { citySlugForPoint, OTHER_CITY_SLUG } from "@/lib/cities";

const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";
const GEOCODE_TIMEOUT_MS = 4000;

/** "Tbilisi" -> "tbilisi", "San Francisco" -> "san-francisco". */
export function slugifyCity(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** ~1.1km grid cell key, so nearby sightings share one cache entry. */
export function gridCell(lat: number, lng: number): string {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

/**
 * Reverse-geocode a coordinate to a city via Nominatim (OpenStreetMap).
 * Returns null on any failure (network, timeout, no city in the result) so
 * the caller can fall back. Nominatim requires a descriptive User-Agent.
 */
export async function reverseGeocodeCity(
  lat: number,
  lng: number
): Promise<{ slug: string; name: string } | null> {
  try {
    const url = `${NOMINATIM_REVERSE}?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "StreetDogApp/1.0 (https://thestreetdogapp.com)",
        "Accept-Language": "en",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { address?: Record<string, string> };
    const a = data.address ?? {};
    const name =
      a.city || a.town || a.village || a.municipality || a.county || null;
    if (!name) return null;
    return { slug: slugifyCity(name), name };
  } catch {
    return null;
  }
}

/**
 * Resolve a coordinate to a city slug for storing on a dog. Order:
 *   1. grid-cell cache (no external call on hit)
 *   2. Nominatim reverse geocode (cached on success)
 *   3. bbox fallback (citySlugForPoint), never cached so it retries later
 * Never throws — dog creation must not break on a geocoding hiccup.
 */
export async function resolveCitySlug(
  admin: SupabaseClient,
  lat: number,
  lng: number
): Promise<string> {
  const cell = gridCell(lat, lng);

  try {
    const { data: cached } = await admin
      .from("geo_city_cache")
      .select("city_slug")
      .eq("cell", cell)
      .maybeSingle();
    if (cached?.city_slug) return cached.city_slug as string;
  } catch {
    /* cache read failed — fall through to live geocode */
  }

  const geo = await reverseGeocodeCity(lat, lng);
  if (geo) {
    try {
      await admin
        .from("geo_city_cache")
        .upsert(
          { cell, city_slug: geo.slug, city_name: geo.name },
          { onConflict: "cell", ignoreDuplicates: true }
        );
    } catch {
      /* cache write failed — non-fatal, we still return the slug */
    }
    return geo.slug;
  }

  return citySlugForPoint(lat, lng) ?? OTHER_CITY_SLUG;
}
