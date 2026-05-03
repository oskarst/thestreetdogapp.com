import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/section-label";
import { getMissionsView } from "@/lib/missions";
import { MissionsPicker } from "@/components/dog/missions-picker";
import { MissionsActiveActions } from "@/components/dog/missions-active-actions";

function localizedName(
  locale: string,
  m: { name_en: string; name_ka: string; name_ru: string }
): string {
  if (locale === "ka") return m.name_ka;
  if (locale === "ru") return m.name_ru;
  return m.name_en;
}

/**
 * Renders below Achievements on the dashboard. Two states:
 *  - active mission: name, X / 20 progress bar, daily cap indicator,
 *    open-on-map + cancel buttons.
 *  - no active mission: CTA "Start a mission" → opens the picker (sheet
 *    of available raions).
 *
 * "Available" excludes already-completed raions.
 */
export async function MissionsBlock() {
  const [t, locale, view] = await Promise.all([
    getTranslations("missions"),
    getLocale(),
    getMissionsView(),
  ]);

  const { list, active } = view;
  const available = list.filter((m) => m.status === "available");
  const completedCount = list.filter((m) => m.status === "completed").length;

  const localized = (slug: string) => {
    const m = list.find((x) => x.slug === slug);
    return m ? localizedName(locale, m) : slug;
  };

  return (
    <section>
      <SectionLabel meta={`${completedCount} / ${list.length}`}>
        {t("title")}
      </SectionLabel>

      {active ? (
        <div className="card-soft p-4">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
                {t("activeLabel")}
              </div>
              <div className="text-[16px] font-semibold leading-tight truncate mt-0.5">
                {localized(active.slug)}
              </div>
            </div>
            <span className="font-mono text-[11px] tracking-[0.04em] text-muted-foreground shrink-0">
              <b className="text-ink font-medium">{active.progress}</b> /{" "}
              {active.target}
            </span>
          </div>

          <div className="relative h-1 bg-rule-2 rounded overflow-hidden mb-3">
            <div
              className="absolute inset-y-0 left-0 bg-[var(--green-brand)] rounded transition-all"
              style={{
                width: `${Math.min(100, (active.progress / active.target) * 100)}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground">
              {active.awardsToday >= active.dailyCap
                ? t("dailyCapReached", { cap: active.dailyCap })
                : t("dailyCounter", {
                    today: active.awardsToday,
                    cap: active.dailyCap,
                  })}
            </span>
            <span className="font-mono text-[10px] tracking-[0.06em] text-amber-brand">
              {t("completionReward", { xp: active.completionXp })}
            </span>
          </div>

          <MissionsActiveActions slug={active.slug} />
        </div>
      ) : available.length === 0 ? (
        <div className="card-soft p-4 text-center">
          <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
            {t("allCompletedLabel")}
          </div>
          <p className="text-sm">{t("allCompletedBody")}</p>
        </div>
      ) : (
        <MissionsPicker
          available={available.map((m) => ({
            slug: m.slug,
            name: localizedName(locale, m),
          }))}
          startCta={t("startMission")}
          pickPrompt={t("pickRaion")}
          subtitle={t("pickerSubtitle")}
        />
      )}

      <div className="mt-2 flex justify-end">
        <Link
          href="/missions"
          className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground hover:text-ink no-underline transition-colors"
        >
          {t("seeAll")} →
        </Link>
      </div>
    </section>
  );
}
