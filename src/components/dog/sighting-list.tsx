import type { SightingWithUser } from "@/lib/db/sightings";
import { Badge } from "@/components/ui/badge";

function timeAgo(dateStr: string): string {
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

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface SightingListProps {
  sightings: SightingWithUser[];
}

export function SightingList({ sightings }: SightingListProps) {
  if (sightings.length === 0) {
    return (
      <div className="rounded-xl border border-border p-4 text-center text-sm text-muted-foreground">
        No sightings yet
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="text-sm font-semibold">Recent Sightings</h3>
      </div>
      <div className="divide-y divide-border">
        {sightings.map((s) => {
          const nickname = s.profiles?.nickname ?? "Anonymous";
          return (
            <div key={s.id} className="px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                    {getInitials(nickname)}
                  </div>
                  <span className="text-sm font-medium">{nickname}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {timeAgo(s.timestamp)}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-[10px]">
                  {formatCharacter(s.character)}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  Size {s.size}/10
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {s.gender.charAt(0).toUpperCase() + s.gender.slice(1)}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {s.age.charAt(0).toUpperCase() + s.age.slice(1)}
                </Badge>
              </div>
              {s.notes && (
                <p className="text-xs text-muted-foreground">{s.notes}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
