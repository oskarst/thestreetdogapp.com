"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavorite } from "@/hooks/use-favorite";

interface FavoriteButtonProps {
  userId: string;
  dogId: string;
  initialFavorited: boolean;
}

export function FavoriteButton({
  userId,
  dogId,
  initialFavorited,
}: FavoriteButtonProps) {
  const { isFavorited, isPending, toggle } = useFavorite(
    userId,
    dogId,
    initialFavorited
  );

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      disabled={isPending}
      className={cn(
        "p-1.5 rounded-full transition-colors",
        isFavorited
          ? "text-red-500 hover:text-red-600"
          : "text-muted-foreground hover:text-red-400"
      )}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={cn("h-5 w-5", isFavorited && "fill-current")}
      />
    </button>
  );
}
