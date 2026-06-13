import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import {
  getMissionsView,
  getQuadrantDomination,
  PARENT_COLORS,
} from "@/lib/missions";
import { MissionsActiveActions } from "@/components/dog/missions-active-actions";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

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
 *  - active mission: name, X / 5 progress bar, daily cap indicator,
 *    open-on-map + cancel buttons.
 *  - no active mission: CTA "Start a mission" → opens the picker (sheet
 *    of available raions).
 *
 * "Available" excludes already-completed raions.
 */
export async function MissionsBlock() {
  const [t, locale, view, domination] = await Promise.all([
    getTranslations("missions"),
    getLocale(),
    getMissionsView(),
    getQuadrantDomination(),
  ]);

  const { list, active } = view;
  const activeDominator = active ? domination[active.slug]?.nickname : null;
  const completedCount = list.filter((m) => m.status === "completed").length;
  const allCompleted = completedCount === list.length;

  const activeLabel = active
    ? `${localizedParent(locale, active)} ${active.index}`
    : "";

  return (
    <section data-tour-id="missions-block">
      {active ? (
        <div className="card-soft p-4">
          <div className="flex items-center gap-4 mb-3">
            <div className="relative shrink-0">
              <div className="size-14 rounded-full grid place-items-center bg-ink text-background">
                <Icon name="target" size={28} />
              </div>
              <span
                className="absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-background"
                style={{
                  background:
                    PARENT_COLORS[active.colorIndex] ?? "var(--green-deep)",
                }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 leading-none">
                <span className="font-mono text-[44px] font-medium tracking-[-0.04em] text-ink">
                  {active.progress}
                </span>
                <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
                  / {active.target} subjects
                </span>
              </div>
              <div className="font-mono text-[11px] tracking-[0.16em] uppercase text-muted-foreground mt-1.5 truncate">
                {activeLabel}
              </div>
              <div className="flex items-center gap-1 mt-2">
                {Array.from({ length: active.target }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full flex-1",
                      i < active.progress ? "bg-ink" : "bg-rule-2"
                    )}
                  />
                ))}
              </div>
              <div className="font-mono text-[11px] tracking-[0.06em] text-muted-foreground mt-2 flex items-center justify-between gap-2">
                <span>
                  {active.awardsToday >= active.dailyCap
                    ? t("dailyCapReached", { cap: active.dailyCap })
                    : t("dailyCounter", {
                        today: active.awardsToday,
                        cap: active.dailyCap,
                      })}
                </span>
                <span>{t("completionReward", { xp: active.completionXp })}</span>
              </div>
              <div className="font-mono text-[11px] tracking-[0.06em] text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Icon name="medal" size={12} className="text-green-deep" />
                {activeDominator ? (
                  <span>
                    Dominated by{" "}
                    <span className="text-ink font-medium">
                      {activeDominator}
                    </span>{" "}
                    · take it over
                  </span>
                ) : (
                  <span>Unclaimed — be the first to dominate</span>
                )}
              </div>
            </div>
          </div>

          <MissionsActiveActions slug={active.slug} />
        </div>
      ) : allCompleted ? (
        <div className="card-soft p-4 text-center">
          <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
            {t("allCompletedLabel")}
          </div>
          <p className="text-sm">{t("allCompletedBody")}</p>
        </div>
      ) : (
        <Link
          href="/missions/start"
          className="block w-full px-5 py-4 rounded-2xl no-underline bg-amber-brand text-amber-soft transition-all hover:brightness-105 active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className="grid place-items-center size-12 rounded-2xl shrink-0 bg-amber-soft/20 text-amber-soft">
              <Icon name="target" size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[11px] tracking-[0.32em] uppercase text-amber-soft/80">
                {t("title")}
              </div>
              <div className="text-[19.8px] font-semibold leading-tight mt-0.5 text-amber-soft">
                {t("startMission")}
              </div>
              <div className="font-mono text-[11.6px] tracking-[0.06em] text-amber-soft/80 mt-1">
                {t("pickerSubtitleMap")}
              </div>
            </div>
            <span className="font-mono text-lg text-amber-soft/90 shrink-0">
              ›
            </span>
          </div>
        </Link>
      )}
    </section>
  );
}
