import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth-cache";
import { getUserSightings } from "@/lib/db/sightings";
import {
  isDailyQuestComplete,
  isDailyQuestClaimedToday,
} from "@/lib/dashboard";
import { DailyQuest } from "@/components/dog/daily-quest";
import { Icon } from "@/components/ui/icon";

export default async function MissionsStartPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // The chooser is the missions hub: always show both options (Find a
  // Doggo / map mission). We deliberately do NOT auto-redirect into an
  // active Find Doggo here — that bounced the back button from the
  // find-doggo screen straight back into the mission. The "Find a Doggo"
  // card below already resumes an active target on tap.
  const [t, sightings, profile] = await Promise.all([
    getTranslations("missions"),
    getUserSightings(user.id),
    getCurrentProfile(),
  ]);

  // Daily quest ("spot 1 dog today") lives here as a daily mission.
  const questComplete = isDailyQuestComplete(sightings);
  const questClaimedToday = isDailyQuestClaimedToday(
    profile?.quest_last_claimed_date
  );

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      <header>
        <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
          {t("chooserSubtitle")}
        </div>
        <h1 className="text-[26px] font-bold tracking-[-0.02em] leading-tight mt-1">
          {t("chooserTitle")}
        </h1>
      </header>

      <DailyQuest complete={questComplete} claimedToday={questClaimedToday} />

      <Link
        href="/map?picker=1"
        className="card-soft block w-full px-4 py-4 no-underline text-inherit transition-colors hover:border-ink/30"
      >
        <div className="flex items-start gap-3">
          <div className="grid place-items-center size-12 rounded-2xl shrink-0 bg-ink text-background">
            <Icon name="pin" size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
              {t("chooserMapTitle")}
            </div>
            <div className="text-[16px] font-semibold leading-tight mt-1">
              {t("openMapPicker")}
            </div>
            <p className="text-[13px] text-muted-foreground leading-snug mt-1.5">
              {t("chooserMapBody")}
            </p>
          </div>
          <span className="font-mono text-lg text-muted-foreground shrink-0">
            ›
          </span>
        </div>
      </Link>

      <Link
        href="/missions/find-doggo"
        className="card-soft block w-full px-4 py-4 no-underline text-inherit transition-colors hover:border-ink/30"
      >
        <div className="flex items-start gap-3">
          <div className="grid place-items-center size-12 rounded-2xl shrink-0 bg-amber-brand text-amber-soft">
            <Icon name="dog" size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-amber-brand/80">
              {t("chooserFindTitle")}
            </div>
            <div className="text-[16px] font-semibold leading-tight mt-1">
              {t("finddoggoStart")}
            </div>
            <p className="text-[13px] text-muted-foreground leading-snug mt-1.5">
              {t("chooserFindBody")}
            </p>
            <p className="font-mono text-[10px] tracking-[0.06em] uppercase text-green-deep mt-1.5">
              {t("finddoggoReward")}
            </p>
          </div>
          <span className="font-mono text-lg text-amber-brand shrink-0">›</span>
        </div>
      </Link>
    </div>
  );
}
