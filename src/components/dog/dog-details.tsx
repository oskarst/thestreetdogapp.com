import type { DogRow, DogCharacter } from "@/types/database";
import { Icon } from "@/components/ui/icon";
import { SectionLabel } from "@/components/ui/section-label";
import { CharacterIcon } from "@/components/dog/character-icon";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}mo`;
}

function formatCharacter(char: string): string {
  return char.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface DogDetailsProps {
  dog: DogRow;
  totalSightings: number;
  totalCatchers: number;
  registeredByNickname: string | null;
  caughtByYou: boolean;
}

export function DogDetails({
  dog,
  totalSightings,
  totalCatchers,
  registeredByNickname,
  caughtByYou,
}: DogDetailsProps) {
  const name = dog.names?.[0] ?? "Unnamed Dog";
  const altNames = dog.names?.slice(1) ?? [];
  const created = new Date(dog.created_at);
  const createdStr = `${created.getFullYear()}.${String(
    created.getMonth() + 1
  ).padStart(2, "0")}.${String(created.getDate()).padStart(2, "0")}`;

  return (
    <div className="space-y-3">
      <div className="px-1">
        <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-1.5 flex items-center gap-2 flex-wrap">
          <span>subject_{dog.id.slice(0, 4).toUpperCase()}</span>
          {caughtByYou && (
            <span className="text-green-deep bg-green-soft px-1.5 py-0.5 rounded font-medium">
              caught by you
            </span>
          )}
          {!caughtByYou && (
            <span className="text-muted-foreground bg-rule px-1.5 py-0.5 rounded">
              uncaught
            </span>
          )}
        </div>
        <h1 className="text-[26px] font-bold tracking-[-0.02em] leading-tight">
          {name}
        </h1>
        {altNames.length > 0 && (
          <p className="text-sm text-muted-foreground mt-0.5">
            also known as {altNames.join(", ")}
          </p>
        )}
        {dog.ear_tag_id ? (
          <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-rule-2 bg-card px-2.5 py-1.5">
            <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground">
              ear_tag
            </span>
            <span className="font-mono text-[15px] font-semibold tracking-[0.04em] text-ink">
              {dog.ear_tag_id}
            </span>
          </div>
        ) : (
          <div className="mt-2 font-mono text-[11px] tracking-[0.06em] text-muted-foreground">
            no ear tag
          </div>
        )}
        <div className="font-mono text-[11px] tracking-[0.06em] text-muted-foreground mt-2">
          first seen {createdStr}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-px bg-rule rounded-xl overflow-hidden">
        <StatCell value={totalSightings} label="Spottings" />
        <StatCell value={totalCatchers} label="Catchers" />
        <StatCell label="Last seen" valueText={timeAgo(dog.last_sighting_date)} />
      </div>

      {registeredByNickname && (
        <div className="font-mono text-[11px] tracking-[0.04em] text-muted-foreground px-1">
          first registered by{" "}
          <span className="text-ink font-medium">
            {registeredByNickname}
          </span>
        </div>
      )}

      {/* Profile rows */}
      <div>
        <SectionLabel meta="aggregated">Profile</SectionLabel>
        <div className="space-y-2">
          {dog.character && (
            <ProfileRow
              icon={
                <CharacterIcon
                  character={dog.character as DogCharacter}
                  size={16}
                />
              }
              label="Character"
              value={formatCharacter(dog.character)}
            />
          )}
          {dog.size != null && (
            <ProfileRow
              icon={<Icon name="target" size={14} />}
              label="Size"
              value={`${dog.size} / 10`}
            />
          )}
          {dog.gender && (
            <ProfileRow
              icon={<Icon name="paw" size={14} />}
              label="Gender"
              value={formatLabel(dog.gender)}
            />
          )}
          {dog.age && (
            <ProfileRow
              icon={<Icon name="fire" size={14} />}
              label="Age"
              value={formatLabel(dog.age)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCell({
  value,
  valueText,
  label,
}: {
  value?: number;
  valueText?: string;
  label: string;
}) {
  return (
    <div className="bg-card text-center py-3">
      <div className="font-mono text-[22px] font-medium leading-none tracking-[-0.02em]">
        {valueText ?? value}
      </div>
      <div className="font-mono text-[9px] tracking-[0.16em] uppercase text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[28px_90px_1fr] gap-2.5 items-center bg-card rounded-xl px-3 py-2.5">
      <div className="size-7 rounded-lg bg-background grid place-items-center text-ink-soft">
        {icon}
      </div>
      <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground">
        {label}
      </span>
      <span className="text-[13px] font-semibold text-right">{value}</span>
    </div>
  );
}
