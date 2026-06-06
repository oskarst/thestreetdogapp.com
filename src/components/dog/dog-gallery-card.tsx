import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import type { DogListRow } from "@/types/database";

interface DogGalleryCardProps {
  dog: DogListRow;
}

function relativeDay(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(ms / 3600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "y'day";
  if (days < 30) return `${days}d`;
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DogGalleryCard({ dog }: DogGalleryCardProps) {
  const name = dog.names?.[0] ?? "Unnamed Dog";
  const imageUrl = dog.thumbnail ?? dog.images?.[0] ?? null;

  return (
    <Link
      href={`/dog/${dog.id}`}
      prefetch={false}
      className="group relative block aspect-square overflow-hidden rounded-xl bg-rule-2 no-underline transition-transform duration-200 hover:scale-[1.01]"
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 50vw, 33vw"
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-white/20">
          <Icon name="paw" size={64} />
        </div>
      )}

      <span className="absolute top-2 right-2 rounded-full bg-black/65 px-2 py-0.5 font-mono text-[10.5px] font-medium tracking-[0.06em] text-white backdrop-blur-sm">
        {relativeDay(dog.last_sighting_date ?? dog.created_at)}
      </span>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2.5 pt-7 pb-2.5 text-white">
        <p className="truncate text-[14.3px] font-bold leading-tight">{name}</p>
        {dog.ear_tag_id && (
          <p className="font-mono text-[10.5px] tracking-[0.06em] text-white/70 mt-0.5">
            id {dog.ear_tag_id}
          </p>
        )}
      </div>
    </Link>
  );
}
