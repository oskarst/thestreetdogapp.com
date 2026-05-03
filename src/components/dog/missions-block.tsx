import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/section-label";
import { getMissionsView } from "@/lib/missions";
import { MissionsActiveActions } from "@/components/dog/missions-active-actions";

function localizedParent(
  locale: string,
  m: {
    parentNameEn: string;
    parentNameKa: string;
    parentNameRu: string;
  }
): string {
  if (locale === "ka") return m.parentNameKa;
  if (locale === "ru") return m.parentNameRu;
  return m.parentNameEn;
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
  const completedCount = list.filter((m) => m.status === "completed").length;
  const allCompleted = completedCount === list.length;

  const activeLabel = active
    ? `${localizedParent(locale, active)} ${active.index}`
    : "";

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
                {activeLabel}
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
      ) : allCompleted ? (
        <div className="card-soft p-4 text-center">
          <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
            {t("allCompletedLabel")}
          </div>
          <p className="text-sm">{t("allCompletedBody")}</p>
        </div>
      ) : (
        <Link
          href="/map?picker=1"
          className="card-soft w-full px-4 py-3.5 flex items-center justify-between gap-3 no-underline text-inherit transition-colors hover:border-ink/30 active:scale-[0.99]"
        >
          <div>
            <div className="font-semibold text-[14px] leading-tight">
              {t("startMission")}
            </div>
            <div className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground mt-0.5">
              {t("pickerSubtitleMap")}
            </div>
          </div>
          <span className="font-mono text-[var(--green-brand)] text-lg shrink-0">
            ›
          </span>
        </Link>
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
