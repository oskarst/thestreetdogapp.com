"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export function useFavorite(
  userId: string,
  dogId: string,
  initialFavorited: boolean
) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  function toggle() {
    const prev = isFavorited;
    setIsFavorited(!prev);

    startTransition(async () => {
      try {
        if (prev) {
          const { error } = await supabase
            .from("favorites")
            .delete()
            .eq("user_id", userId)
            .eq("dog_id", dogId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("favorites")
            .insert({ user_id: userId, dog_id: dogId });
          if (error) throw error;
        }
      } catch {
        setIsFavorited(prev);
      }
    });
  }

  return { isFavorited, isPending, toggle };
}
