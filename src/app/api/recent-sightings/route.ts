import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Public-but-keyed feed of recent sightings.
 *
 * Consumed by the marketing site at thestreetdogapp.com via a server-side
 * PHP proxy that holds the shared API key. The browser never calls this
 * route directly.
 *
 * Caching: Cache-Control gives Vercel's edge a 24h window with a 24h
 * stale-while-revalidate margin, so each cache miss costs at most one
 * fresh Supabase round-trip per day. The PHP proxy caches on its end too.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ITEM_LIMIT = 12;
const FIRST_RECORD_WINDOW_MS = 60_000;

type SightingRow = {
  id: string;
  dog_id: string;
  image_url: string | null;
  timestamp: string;
  character: string | null;
  latitude: number | null;
  longitude: number | null;
  profiles: { nickname: string | null } | null;
  dogs: { names: string[] | null; created_at: string } | null;
};

function roundCoord(n: number | null): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.round(n * 10) / 10;
}

export async function GET(request: Request) {
  const expectedKey = process.env.RECENT_SIGHTINGS_API_KEY;
  if (!expectedKey) {
    return NextResponse.json(
      { error: "Endpoint not configured" },
      { status: 503 }
    );
  }

  const providedKey = request.headers.get("x-api-key");
  if (!providedKey || providedKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("sightings")
      .select(
        "id, dog_id, image_url, timestamp, character, latitude, longitude, profiles:user_id(nickname), dogs:dog_id(names, created_at)"
      )
      .order("timestamp", { ascending: false })
      .limit(ITEM_LIMIT);

    if (error) throw error;

    const rows = (data ?? []) as unknown as SightingRow[];

    const items = rows.map((s) => {
      const dogCreatedAt = s.dogs?.created_at
        ? new Date(s.dogs.created_at).getTime()
        : 0;
      const sightedAt = s.timestamp ? new Date(s.timestamp).getTime() : 0;
      const isFirstRecord =
        dogCreatedAt > 0 &&
        sightedAt > 0 &&
        Math.abs(sightedAt - dogCreatedAt) < FIRST_RECORD_WINDOW_MS;

      const dogName =
        Array.isArray(s.dogs?.names) && s.dogs.names.length
          ? String(s.dogs.names[0])
          : null;

      return {
        id: s.id,
        dog_id: s.dog_id,
        dog_name: dogName,
        image_url: s.image_url,
        sighted_at: s.timestamp,
        contributor: s.profiles?.nickname || "anonymous",
        condition: isFirstRecord ? "New record" : "Re-sighted",
        character: s.character,
        latitude: roundCoord(s.latitude),
        longitude: roundCoord(s.longitude),
      };
    });

    return NextResponse.json(
      { items, generated_at: new Date().toISOString() },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    console.error("[GET /api/recent-sightings]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
