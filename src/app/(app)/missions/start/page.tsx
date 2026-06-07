import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth-cache";
import { Icon } from "@/components/ui/icon";

export default async function MissionsStartPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // The chooser is the missions hub: it lists the startable mission types.
  // We deliberately do NOT auto-redirect into an active Find Doggo here —
  // that bounced the back button from the find-doggo screen straight back
  // into the mission. The "Find a Doggo" card already resumes an active
  // target on tap. The daily directive's claim lives on the dashboard.
  const t = await getTranslations("missions");

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      <header>
        <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
          {t("chooserSubtitle")}
        </div>
        <h1 className="text-[28.6px] font-bold tracking-[-0.02em] leading-tight mt-1">
          {t("chooserTitle")}
        </h1>
      </header>

      <Link
        href="/missions/free-roam"
        className="card-soft block w-full px-4 py-4 no-underline text-inherit transition-colors hover:border-ink/30"
      >
        <div className="flex items-start gap-3">
          <div className="grid place-items-center size-12 rounded-2xl shrink-0 bg-green-brand text-background">
            <Icon name="paw" size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-green-deep">
              {t("freeRoamEyebrow")}
            </div>
            <div className="text-[17.6px] font-semibold leading-tight mt-1">
              {t("freeRoamCardTitle")}
            </div>
            <p className="text-[14.3px] text-muted-foreground leading-snug mt-1.5">
              {t("freeRoamCardBody")}
            </p>
          </div>
          <span className="font-mono text-lg text-muted-foreground shrink-0">
            ›
          </span>
        </div>
      </Link>

      <Link
        href="/map?picker=1"
        className="card-soft block w-full px-4 py-4 no-underline text-inherit transition-colors hover:border-ink/30"
      >
        <div className="flex items-start gap-3">
          <div className="grid place-items-center size-12 rounded-2xl shrink-0 bg-ink text-background">
            <Icon name="pin" size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
              {t("chooserMapTitle")}
            </div>
            <div className="text-[17.6px] font-semibold leading-tight mt-1">
              {t("openMapPicker")}
            </div>
            <p className="text-[14.3px] text-muted-foreground leading-snug mt-1.5">
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
            <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-amber-brand/80">
              {t("chooserFindTitle")}
            </div>
            <div className="text-[17.6px] font-semibold leading-tight mt-1">
              {t("finddoggoStart")}
            </div>
            <p className="text-[14.3px] text-muted-foreground leading-snug mt-1.5">
              {t("chooserFindBody")}
            </p>
            <p className="font-mono text-[11px] tracking-[0.06em] uppercase text-green-deep mt-1.5">
              {t("finddoggoReward")}
            </p>
          </div>
          <span className="font-mono text-lg text-amber-brand shrink-0">›</span>
        </div>
      </Link>
    </div>
  );
}
