"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Optimistic favourite toggle with a ref-based lock and an idempotent
 * upsert. Earlier version used useTransition + plain insert, which had
 * three problems:
 *   1. useTransition's `isPending` flips false as soon as the async
 *      callback yields, so the button re-enabled mid-flight and let a
 *      second tap fire while the first was still in motion.
 *   2. plain insert hit a 23505 unique-violation whenever the row
 *      already existed (multi-tab, stale optimistic state, etc.) and
 *      the catch silently rolled back the UI — leaving the DB favourited
 *      but the heart empty.
 *   3. no re-entry guard meant a fast double-tap could run an INSERT and
 *      a DELETE in indeterminate order.
 *
 * Now: inFlight ref serialises toggles, isPending tracks the whole
 * async lifecycle, upsert(onConflict) makes the insert idempotent, and
 * the delete is already a no-op when the row is gone.
 */
export function useFavorite(
  userId: string,
  dogId: string,
  initialFavorited: boolean
) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isPending, setIsPending] = useState(false);
  const inFlight = useRef(false);
  const supabase = createClient();

  async function toggle() {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsPending(true);

    const prev = isFavorited;
    const next = !prev;
    setIsFavorited(next);

    try {
      if (next) {
        const { error } = await supabase
          .from("favorites")
          .upsert(
            { user_id: userId, dog_id: dogId },
            { onConflict: "user_id,dog_id", ignoreDuplicates: true }
          );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("dog_id", dogId);
        if (error) throw error;
      }
    } catch (err) {
      console.error("[favorite] toggle failed:", err);
      setIsFavorited(prev);
    } finally {
      inFlight.current = false;
      setIsPending(false);
    }
  }

  return { isFavorited, isPending, toggle };
}
