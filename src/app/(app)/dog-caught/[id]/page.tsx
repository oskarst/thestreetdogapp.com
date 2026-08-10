import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-cache";
import { getDogById } from "@/lib/db/dogs";
import { Icon } from "@/components/ui/icon";
import { SectionLabel } from "@/components/ui/section-label";
import { DogNameInput } from "@/components/dog/dog-name-input";
import { CorrectTagPanel } from "@/components/dog/correct-tag-panel";

interface DogCaughtPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    points?: string;
    catchType?: string;
    sightingId?: string;
    missionXp?: string;
    missionProgress?: string;
    missionTarget?: string;
    missionCompleted?: string;
    missionFinishXp?: string;
  }>;
}

// Rebalanced scale (migrations 027/031): Pioneer 100, Tracker 65,
// sighting 35, welfare bonus 15. The `points` query param carries the
// authoritative value; `bonus` here is the welfare/find extra beyond the
// base sighting, kept in sync for reference.
const CATCH_LABELS: Record<string, { eyebrow: string; bonus: number }> = {
  new: { eyebrow: "+ pioneer find", bonus: 65 }, // 100 base − 35 sighting
  first_catch: { eyebrow: "+ tracker find", bonus: 30 }, // 65 base − 35 sighting
  repeat: { eyebrow: "+ field find", bonus: 0 },
  untagged: { eyebrow: "+ untagged find", bonus: 15 }, // 35 sighting + 15 welfare
};

export default async function DogCaughtPage({
  params,
  searchParams,
}: DogCaughtPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const points = parseInt(sp.points ?? "1", 10);
  const catchType = sp.catchType ?? "repeat";
  const sightingId = sp.sightingId ?? null;
  // Only entries that matched an EXISTING dog (first catch / repeat) could
  // have been mis-attached by a typed tag; a typo is the only way a tag can
  // "already exist". Offer the correction for exactly those.
  const canCorrectTag =
    Boolean(sightingId) &&
    (catchType === "first_catch" || catchType === "repeat");
  const missionXp = sp.missionXp ? parseInt(sp.missionXp, 10) : 0;
  const missionProgress = sp.missionProgress
    ? parseInt(sp.missionProgress, 10)
    : 0;
  const missionTarget = sp.missionTarget ? parseInt(sp.missionTarget, 10) : 0;
  const missionCompleted = sp.missionCompleted === "1";
  const missionFinishXp = sp.missionFinishXp
    ? parseInt(sp.missionFinishXp, 10)
    : 0;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const dog = await getDogById(id).catch(() => null);
  const heroImage = dog?.images?.[0] ?? null;

  const labels = CATCH_LABELS[catchType] ?? CATCH_LABELS.repeat;

  return (
    <div className="flex flex-col">
      {/* Hero photo with green flash overlay — tap to open the dog profile. */}
      <Link
        href={`/dog/${id}`}
        aria-label="View dog profile"
        className="relative block aspect-[4/3] w-full bg-gradient-to-br from-[#b89876] via-[#8b6b48] to-[#5d4528] overflow-hidden"
      >
        {heroImage && (
          <Image
            src={heroImage}
            alt={dog?.names?.[0] ?? "Found dog"}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(0deg, rgba(34,197,94,0.4) 0%, transparent 50%)",
          }}
        />
        <span className="absolute top-3.5 left-1/2 -translate-x-1/2 rounded-full border border-white/25 bg-black/50 backdrop-blur-sm px-3 py-1.5 font-mono text-[11px] tracking-[0.22em] uppercase text-white">
          {labels.eyebrow}
        </span>
        <span className="absolute top-3.5 right-3.5 inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/50 backdrop-blur-sm px-2.5 py-1.5 font-mono text-[10.5px] tracking-[0.16em] uppercase text-white">
          view ›
        </span>
        <div className="reward-pop absolute bottom-3.5 left-4 font-mono text-[70.4px] font-medium leading-none tracking-[-0.03em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
          +{points}
          <span className="text-lg tracking-[0.16em] uppercase ml-1 align-[12px] opacity-85">
            XP
          </span>
        </div>
      </Link>

      {/* Body */}
      <div className="px-4 pt-4 pb-6 max-w-lg w-full mx-auto">
        <h1 className="text-3xl font-bold tracking-[-0.02em] leading-none">
          {dog?.names?.[0] ?? "New Subject"}
        </h1>
        {dog?.ear_tag_id && (
          <div className="font-mono text-[12.1px] tracking-[0.06em] text-muted-foreground mt-1">
            id {dog.ear_tag_id}
          </div>
        )}
        {catchType === "new" && (
          <div className="font-mono text-[12.1px] tracking-[0.06em] text-muted-foreground mt-1">
            first registered by you
          </div>
        )}
        {catchType === "untagged" && (
          <div className="font-mono text-[12.1px] tracking-[0.06em] text-muted-foreground mt-1">
            untagged · field sighting
          </div>
        )}

        <div className="mt-5">
          <SectionLabel meta="scoring.rpc">Reward Breakdown</SectionLabel>
          <div className="card-soft p-0 overflow-hidden">
            <BreakdownRow
              seq={0}
              label={
                catchType === "new"
                  ? "Pioneer base"
                  : catchType === "first_catch"
                    ? "Tracker base"
                    : catchType === "untagged"
                      ? "Untagged base"
                      : "Field base"
              }
              value={`+${Math.max(points - 0, 1)} pt`}
            />
            {missionXp > 0 && (
              <BreakdownRow
                seq={1}
                label={
                  missionCompleted
                    ? `Mission ${missionProgress}/${missionTarget} · passed`
                    : `Mission ${missionProgress}/${missionTarget}`
                }
                value={`+${missionXp} XP`}
              />
            )}
            {missionCompleted && missionFinishXp > 0 && (
              <BreakdownRow
                seq={2}
                label="Completion bonus"
                value={`+${missionFinishXp} XP`}
              />
            )}
            <div
              className="reward-row flex justify-between items-baseline px-3.5 py-3 pt-3"
              style={{ animationDelay: "0.75s" }}
            >
              <span className="font-mono text-[12.1px] uppercase tracking-[0.16em] text-muted-foreground">
                Total earned
              </span>
              <span className="font-mono text-[24.2px] font-medium tracking-[-0.02em] text-ink">
                +{points + missionXp + (missionCompleted ? missionFinishXp : 0)}{" "}
                pt
              </span>
            </div>
          </div>
        </div>

        {missionCompleted && (
          <div
            className="reward-pop mt-3 rounded-xl border border-[var(--green-brand)]/40 bg-green-soft p-3 text-center"
            style={{ animationDelay: "0.95s" }}
          >
            <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-green-deep">
              Mission Passed
            </div>
            <div className="text-[15.4px] font-semibold text-ink mt-0.5">
              Raion cleared — pick another from the dashboard
            </div>
          </div>
        )}

        {catchType === "new" && !dog?.names?.length && (
          <div className="mt-6">
            <SectionLabel meta="optional">Name this subject</SectionLabel>
            <DogNameInput dogId={id} autoFocus={false} />
          </div>
        )}

        {catchType === "first_catch" && (
          <div className="mt-6">
            <SectionLabel
              meta={
                dog?.names?.length
                  ? `also known as ${dog.names.slice(0, 2).join(", ")}`
                  : "optional"
              }
            >
              Suggest a name
            </SectionLabel>
            <DogNameInput dogId={id} autoFocus={false} />
          </div>
        )}

        {catchType === "untagged" && (
          <div className="mt-3 rounded-xl border border-rule-2 bg-card p-3 text-center">
            <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
              Untagged
            </div>
            <div className="text-[14.3px] text-ink mt-1 leading-snug">
              No ear tag — logged as a field sighting, not a catalogued subject.
            </div>
          </div>
        )}

        {canCorrectTag && sightingId && (
          <CorrectTagPanel sightingId={sightingId} currentDogId={id} />
        )}

        <div className="flex flex-col gap-2.5 mt-6">
          <Link
            href={`/dog/${id}`}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-ink text-background text-[16.5px] font-semibold transition-transform active:scale-[0.98]"
          >
            <span className="font-mono text-[var(--green-brand)] font-medium">
              &gt;
            </span>
            <Icon name="paw" size={18} className="opacity-90" />
            View subject
          </Link>
          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-rule-2 bg-card text-sm font-medium text-ink hover:bg-muted transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  seq = 0,
}: {
  label: string;
  value: string;
  /** Position in the staggered entrance sequence. */
  seq?: number;
}) {
  return (
    <div
      className="reward-row flex justify-between items-baseline px-3.5 py-2.5 border-b border-dashed border-rule font-mono text-[13.2px] tracking-[0.04em]"
      style={{ animationDelay: `${0.35 + seq * 0.12}s` }}
    >
      <span className="text-ink uppercase tracking-[0.1em] font-medium">
        {label}
      </span>
      <span className="text-green-deep">{value}</span>
    </div>
  );
}
