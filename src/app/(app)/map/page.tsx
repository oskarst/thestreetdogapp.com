"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { DogRow } from "@/types/database";

const DogMap = dynamic(() => import("@/components/map/dog-map"), {
  ssr: false,
  loading: () => <MapLoading message="Loading map…" />,
});

function MapLoading({ message }: { message: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-[3px] border-rule-2 border-t-ink" />
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
          {message}
        </p>
      </div>
    </div>
  );
}

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
        className="w-full"
        style={{ height: "calc(100vh - 56px - 64px)" }}
      >
        <MapLoading message="Loading subjects…" />
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
