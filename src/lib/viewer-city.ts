import "server-only";
import { cookies } from "next/headers";
import {
  cityBySlug,
  DEFAULT_CITY,
  VIEWER_CITY_COOKIE,
  type MissionCity,
} from "@/lib/cities";

export interface MissionAccess {
  /** Resolved viewer city. null only when we positively know they're outside
   *  every mission city; unknown defaults to Tbilisi (DEFAULT_CITY). */
  city: MissionCity | null;
  /** Show the Missions tab / chooser (Free Roam, Find a Doggo). */
  inMissionCity: boolean;
  /** Show the chunk-based map-domination mission (needs chunk data → Tbilisi). */
  showChunkMissions: boolean;
}

/** Read the viewer's mission access from the `sd_city` cookie (set client-side
 *  by LocationGate). Unknown → assume Tbilisi so existing users are unaffected. */
export async function getViewerMissionAccess(): Promise<MissionAccess> {
  const raw = (await cookies()).get(VIEWER_CITY_COOKIE)?.value;
  let city: MissionCity | null;
  if (!raw) city = DEFAULT_CITY; // unknown → assume Tbilisi
  else if (raw === "none") city = null; // positively outside all cities
  else city = cityBySlug(raw) ?? DEFAULT_CITY;

  return {
    city,
    inMissionCity: city !== null,
    showChunkMissions: !!city?.hasChunks,
  };
}
