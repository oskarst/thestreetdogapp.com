import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/ui/icon";
import { SectionLabel } from "@/components/ui/section-label";
import { GalleryFilters } from "@/components/dog/gallery-filters";
import { DOG_LIST_COLUMNS } from "@/types/database";
import type { DogListRow } from "@/types/database";

async function getDogsWithImages(): Promise<DogListRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dogs")
    .select(DOG_LIST_COLUMNS)
    .not("images", "eq", "{}")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DogListRow[];
}

export default async function GalleryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  const [dogs, sightingsRes, favsRes] = await Promise.all([
    getDogsWithImages(),
    userId
      ? supabase.from("sightings").select("dog_id").eq("user_id", userId)
      : Promise.resolve({ data: [], error: null }),
    userId
      ? supabase.from("favorites").select("dog_id").eq("user_id", userId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const caughtIds = new Set(
    (sightingsRes.data ?? []).map((r: { dog_id: string }) => r.dog_id)
  );
  const favIds = new Set(
    (favsRes.data ?? []).map((r: { dog_id: string }) => r.dog_id)
  );

  return (
    <div className="px-4 py-4 space-y-3">
      <SectionLabel meta={`${dogs.length} subjects`}>The Pack</SectionLabel>

      {dogs.length === 0 ? (
        <div className="rounded-xl bg-card p-8 text-center text-muted-foreground border border-rule">
          <Icon
            name="paw"
            size={32}
            className="mx-auto mb-2 text-muted-foreground"
          />
          <p className="font-medium">No photos yet</p>
          <p className="font-mono text-[11px] tracking-[0.04em] mt-1">
            Be the first to log a street dog.
          </p>
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
