import Link from "next/link";
import Image from "next/image";
import { Camera } from "lucide-react";
import type { DogRow } from "@/types/database";

interface DogGalleryCardProps {
  dog: DogRow;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DogGalleryCard({ dog }: DogGalleryCardProps) {
  const name = dog.names?.[0] ?? "Unknown Dog";
  const imageUrl = dog.images?.[0] ?? null;

  return (
    <Link
      href={`/dog/${dog.id}`}
      className="group relative block aspect-square overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10 no-underline transition-transform duration-200 hover:scale-[1.02]"
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, 33vw"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <Camera className="h-10 w-10" />
        </div>
      )}

      {/* Date badge */}
      <div className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
        {formatDate(dog.last_sighting_date ?? dog.created_at)}
      </div>

      {/* Name overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        {dog.ear_tag_id && (
          <p className="text-[11px] text-white/70">ID: {dog.ear_tag_id}</p>
        )}
      </div>
    </Link>
  );
}
