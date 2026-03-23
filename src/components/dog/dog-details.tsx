import type { DogRow } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Tag, Star } from "lucide-react";

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

function formatCharacter(char: string): string {
  return char.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface DogDetailsProps {
  dog: DogRow;
  totalSightings: number;
  registeredByNickname: string | null;
}

export function DogDetails({
  dog,
  totalSightings,
  registeredByNickname,
}: DogDetailsProps) {
  const name = dog.names?.[0] ?? "Unknown Dog";
  const altNames = dog.names?.slice(1) ?? [];

  return (
    <div className="rounded-xl border border-border p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">{name}</h1>
        {altNames.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Also known as: {altNames.join(", ")}
          </p>
        )}
      </div>

      {registeredByNickname && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-sm">
          <Star className="h-4 w-4 text-blue-500 shrink-0" />
          <div>
            <span className="font-medium">First discovered by:</span>{" "}
            {registeredByNickname}
            <br />
            <span className="text-xs text-muted-foreground">
              {new Date(dog.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      )}

      {dog.ear_tag_id && (
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline" className="font-mono">
            {dog.ear_tag_id}
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Character</span>
          <div className="mt-0.5">
            {dog.character ? (
              <Badge variant="secondary">
                {formatCharacter(dog.character)}
              </Badge>
            ) : (
              <span className="text-muted-foreground">N/A</span>
            )}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Size</span>
          <div className="mt-0.5">
            {dog.size != null ? (
              <Badge variant="secondary">{dog.size}/10</Badge>
            ) : (
              <span className="text-muted-foreground">N/A</span>
            )}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Gender</span>
          <div className="mt-0.5">
            {dog.gender ? (
              <Badge variant="secondary">
                {dog.gender.charAt(0).toUpperCase() + dog.gender.slice(1)}
              </Badge>
            ) : (
              <span className="text-muted-foreground">N/A</span>
            )}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Age</span>
          <div className="mt-0.5">
            {dog.age ? (
              <Badge variant="secondary">
                {dog.age.charAt(0).toUpperCase() + dog.age.slice(1)}
              </Badge>
            ) : (
              <span className="text-muted-foreground">N/A</span>
            )}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Total Sightings</span>
          <div className="mt-0.5 font-medium">{totalSightings}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Last Seen</span>
          <div className="mt-0.5 font-medium">
            {timeAgo(dog.last_sighting_date)}
          </div>
        </div>
      </div>
    </div>
  );
}
