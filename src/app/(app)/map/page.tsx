"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { DogRow } from "@/types/database";

const DogMap = dynamic(() => import("@/components/map/dog-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  const [dogs, setDogs] = useState<DogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDogs() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("dogs")
        .select("*")
        .not("last_latitude", "is", null)
        .not("last_longitude", "is", null);

      if (error) {
        console.error("Failed to fetch dogs for map:", error);
      } else {
        setDogs(data ?? []);
      }
      setLoading(false);
    }

    fetchDogs();
  }, []);

  if (loading) {
    return (
      <div
        className="w-full flex items-center justify-center bg-gray-50"
        style={{ height: "calc(100vh - 56px - 64px)" }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading dogs...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full relative z-0"
      style={{ height: "calc(100vh - 56px - 64px)" }}
    >
      <DogMap dogs={dogs} />
    </div>
  );
}
