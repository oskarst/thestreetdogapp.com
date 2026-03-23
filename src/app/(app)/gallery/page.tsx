import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DogGalleryCard } from "@/components/dog/dog-gallery-card";
import type { DogRow } from "@/types/database";

async function getDogsWithImages(): Promise<DogRow[]> {
  const supabase = await createClient();
  // Fetch dogs that have at least one image, ordered by newest first
  // images is a text[] column — filter where array length > 0
  const { data, error } = await supabase
    .from("dogs")
    .select("*")
    .not("images", "eq", "{}")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export default async function GalleryPage() {
  const dogs = await getDogsWithImages();

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-2">
        <Camera className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-bold">Dog Gallery</h1>
      </div>

      {dogs.length === 0 ? (
        <div className="rounded-xl bg-muted/50 p-8 text-center text-muted-foreground">
          <Camera className="mx-auto mb-2 h-8 w-8" />
          <p className="font-medium">No photos yet</p>
          <p className="text-sm">Be the first to snap a street dog!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {dogs.map((dog) => (
            <DogGalleryCard key={dog.id} dog={dog} />
          ))}
        </div>
      )}
    </div>
  );
}
