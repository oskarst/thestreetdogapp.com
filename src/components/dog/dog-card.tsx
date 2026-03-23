"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "@/components/dog/favorite-button";
import type { DogRow } from "@/types/database";

interface DogCardProps {
  dog: DogRow;
  userId: string;
  isFavorited: boolean;
  isCaught: boolean;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function DogCard({ dog, userId, isFavorited, isCaught }: DogCardProps) {
  const router = useRouter();
  const name = dog.names?.[0] ?? "Unknown Dog";
  const imageUrl = dog.images?.[0] ?? null;
  const uncaught = !isCaught;

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/dog/${dog.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/dog/${dog.id}`);
      }}
      className={cn(
        "flex items-center gap-3 rounded-xl p-3 ring-1 ring-foreground/10 transition-colors hover:bg-muted/50 cursor-pointer",
        uncaught && "bg-muted/30 opacity-75"
      )}
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-muted-foreground">
            🐕
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-semibold text-foreground truncate">{name}</div>
        {dog.ear_tag_id && (
          <div className="text-xs text-muted-foreground">
            ID: {dog.ear_tag_id}
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          Last seen: {timeAgo(dog.last_sighting_date)}
        </div>
      </div>

      <div
        className="flex shrink-0 items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {uncaught ? (
          <Link
            href={`/dog/${dog.id}#map`}
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground no-underline hover:bg-primary/90"
          >
            <Search className="h-3.5 w-3.5" />
            Find!
          </Link>
        ) : (
          <>
            <Link
              href={`/dog/${dog.id}#map`}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              aria-label="View on map"
            >
              <MapPin className="h-5 w-5" />
            </Link>
            <FavoriteButton
              userId={userId}
              dogId={dog.id}
              initialFavorited={isFavorited}
            />
          </>
        )}
      </div>
    </div>
  );
}
