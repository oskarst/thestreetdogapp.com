import { getTranslations } from "next-intl/server";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth-cache";
import { Icon } from "@/components/ui/icon";
import { SectionLabel } from "@/components/ui/section-label";
import { GalleryFilters } from "@/components/dog/gallery-filters";
import type { DogListRow } from "@/types/database";

// The gallery is the full-catalogue view, so the cap matches the map's
// marker budget (2000). Only 12 cards render at a time (GalleryFilters
// paginates with "Load more"); the rest of the capped set lives in memory
// to back client-side filter/search across the whole catalogue. The row
// payload is trimmed (minimal columns + first image only), so 2000 rows on
// the wire is comparable to the map's marker query. Server-side search
// across the full table is the next step once the catalog outgrows 2000.
const GALLERY_LIMIT = 2000;
const GALLERY_CACHE_SECONDS = 60;

/**
 * Gallery dogs query — non-user-specific (same payload for every viewer),
 * so we can share one cached payload across all concurrent dashboard
 * renders. Uses the admin client so the cache function isn't tied to a
 * particular user's session cookies (those would change per-request and
 * defeat the cache key). RLS isn't relevant here either — the data is
 * already publicly readable on the dogs table.
 *
 * 60s TTL is the freshness contract: a new dog or updated thumbnail
 * appears on gallery within a minute of its first sighting. Tag-based
 * on-demand revalidation isn't used here — Next 16's revalidateTag is
 * restricted to Server Actions, and a route-handler invalidation hack
 * isn't worth the complexity for a 60-second staleness window.
 *
 * Image field is trimmed to the first element only — the gallery card
 * reads `dog.thumbnail ?? dog.images?.[0]`, so additional URLs are dead
 * weight on the wire.
 */
const getGalleryDogs = unstable_cache(
  async (): Promise<DogListRow[]> => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("dogs")
      .select(
        "id,ear_tag_id,names,images,last_sighting_date,created_at,first_registered_by_id"
      )
      .eq("status", "approved")
      .is("deleted_at", null)
      .not("images", "eq", "{}")
      .order("created_at", { ascending: false })
      .limit(GALLERY_LIMIT);

    if (error) throw error;
    return ((data ?? []) as DogListRow[]).map((d) => ({
      ...d,
      images: d.images?.length ? [d.images[0]] : [],
    }));
  },
  ["gallery-dogs"],
  { revalidate: GALLERY_CACHE_SECONDS, tags: ["gallery-dogs"] }
);

export default async function GalleryPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const userId = user?.id ?? "";
  const t = await getTranslations("gallery");

  // Single parallel round-trip: the cached dog list plus the two
  // user-specific id sets (caught + favorites). Batched into one Promise.all
  // so the per-user queries fire concurrently rather than serially.
  const [dogs, caughtRes, favsRes] = await Promise.all([
    getGalleryDogs(),
    userId
      ? supabase.rpc("get_my_caught_dog_ids")
      : Promise.resolve({ data: [], error: null }),
    userId
      ? supabase.from("favorites").select("dog_id").eq("user_id", userId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const caughtIds = new Set(
    ((caughtRes.data ?? []) as { dog_id: string }[]).map((r) => r.dog_id)
  );
  const favIds = new Set(
    (favsRes.data ?? []).map((r: { dog_id: string }) => r.dog_id)
  );

  return (
    <div className="px-4 py-4 space-y-3">
      <SectionLabel meta={t("subjects", { n: dogs.length })}>
        {t("title")}
      </SectionLabel>

      {dogs.length === 0 ? (
        <div className="rounded-xl bg-card p-8 text-center text-muted-foreground border border-rule">
          <Icon
            name="paw"
            size={32}
            className="mx-auto mb-2 text-muted-foreground"
          />
          <p className="font-medium">{t("noPhotos")}</p>
        </div>
      ) : (
        <GalleryFilters
          dogs={dogs}
          caughtIds={Array.from(caughtIds)}
          favIds={Array.from(favIds)}
        />
      )}
    </div>
  );
}
