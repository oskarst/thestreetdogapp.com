/**
 * Mission cities. The app works (registering dogs) anywhere in the world, but
 * gamified missions are city-scoped. A city is a "mission city" if missions are
 * offered there; only cities with `hasChunks` have the map-domination / chunk
 * missions (those need a chunk geojson — currently Tbilisi only). The others
 * still get Free Roam, Find a Doggo and the Daily Quest.
 *
 * To add map-domination to another city later: ship its `<slug>-chunks.geojson`
 * and flip `hasChunks` to true.
 */
export interface CityBBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface MissionCity {
  slug: string;
  name: string;
  /** [lat, lng] map centre. */
  center: [number, number];
  bbox: CityBBox;
  /** Chunk-based map-domination missions available for this city. */
  hasChunks: boolean;
}

export const MISSION_CITIES: MissionCity[] = [
  {
    slug: "tbilisi",
    name: "Tbilisi",
    center: [41.7151, 44.8271],
    bbox: { minLat: 41.6, maxLat: 41.88, minLon: 44.55, maxLon: 45.05 },
    hasChunks: true,
  },
  {
    slug: "kutaisi",
    name: "Kutaisi",
    center: [42.2679, 42.718],
    bbox: { minLat: 42.2, maxLat: 42.34, minLon: 42.62, maxLon: 42.82 },
    hasChunks: false,
  },
  {
    slug: "batumi",
    name: "Batumi",
    center: [41.6168, 41.6367],
    bbox: { minLat: 41.55, maxLat: 41.7, minLon: 41.55, maxLon: 41.73 },
    hasChunks: false,
  },
  {
    slug: "gyumri",
    name: "Gyumri",
    center: [40.7894, 43.8475],
    bbox: { minLat: 40.73, maxLat: 40.85, minLon: 43.78, maxLon: 43.91 },
    hasChunks: false,
  },
  {
    slug: "yerevan",
    name: "Yerevan",
    center: [40.1792, 44.4991],
    bbox: { minLat: 40.1, maxLat: 40.27, minLon: 44.38, maxLon: 44.62 },
    hasChunks: false,
  },
];

/** Tbilisi — the default when the viewer's city is unknown. */
export const DEFAULT_CITY = MISSION_CITIES[0];

/** Cookie the client writes and the server reads to gate mission UI. */
export const VIEWER_CITY_COOKIE = "sd_city";

export function cityForPoint(lat: number, lng: number): MissionCity | null {
  for (const c of MISSION_CITIES) {
    const b = c.bbox;
    if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLon && lng <= b.maxLon) {
      return c;
    }
  }
  return null;
}

export function cityBySlug(slug?: string | null): MissionCity | null {
  return MISSION_CITIES.find((c) => c.slug === slug) ?? null;
}

export function isInAnyMissionCity(lat: number, lng: number): boolean {
  return cityForPoint(lat, lng) !== null;
}

/** Slug for dogs whose coordinates fall outside every known city. */
export const OTHER_CITY_SLUG = "other";

/** All assignable city slugs: the known mission cities plus the catch-all. */
export const CITY_SLUGS: string[] = [
  ...MISSION_CITIES.map((c) => c.slug),
  OTHER_CITY_SLUG,
];

/**
 * City slug for a coordinate pair, used to group dogs. Returns a known
 * city slug, "other" when the point is outside every known city, or null
 * when coordinates are missing. Mirrors derive_city_slug() in migration
 * 037 — keep the two in sync if a city's bbox changes.
 */
export function citySlugForPoint(
  lat?: number | null,
  lng?: number | null
): string | null {
  if (lat == null || lng == null) return null;
  return cityForPoint(lat, lng)?.slug ?? OTHER_CITY_SLUG;
}

/** Human-readable label for a city slug. */
export function cityLabel(slug?: string | null): string {
  if (!slug) return "Unknown";
  if (slug === OTHER_CITY_SLUG) return "Other";
  const known = cityBySlug(slug);
  if (known) return known.name;
  // Dynamic city from reverse geocoding — title-case the slug parts.
  return slug
    .split("-")
    .map((s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s))
    .join(" ");
}
