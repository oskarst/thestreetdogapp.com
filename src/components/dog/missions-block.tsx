import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/section-label";
import { getMissionsView, PARENT_COLORS } from "@/lib/missions";
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
    <section data-tour-id="missions-block">
      <SectionLabel meta={`${completedCount} / ${list.length}`}>
        {t("title")}
      </SectionLabel>

      {active ? (
        <div className="rounded-2xl border border-amber-brand/40 bg-amber-soft p-4">
          <div className="flex items-center gap-4 mb-3">
            <div className="relative shrink-0">
              <div
                className="size-14 rounded-full grid place-items-center bg-amber-brand text-amber-soft"
                style={{ boxShadow: "0 6px 14px rgba(176, 122, 44, 0.25)" }}
              >
                <Icon name="target" size={28} />
              </div>
              <span
                className="absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-amber-soft"
                style={{
                  background:
                    PARENT_COLORS[active.colorIndex] ?? "var(--green-deep)",
                }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 leading-none">
                <span className="font-mono text-[40px] font-medium tracking-[-0.04em] text-amber-brand">
                  {active.progress}
                </span>
                <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-amber-brand/80">
                  / {active.target} subjects
                </span>
              </div>
              <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-amber-brand/80 mt-1.5 truncate">
                {activeLabel}
              </div>
              <div className="flex items-center gap-1 mt-2">
                {Array.from({ length: active.target }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full flex-1",
                      i < active.progress
                        ? "bg-amber-brand"
                        : "bg-amber-brand/20"
                    )}
                  />
                ))}
              </div>
              <div className="font-mono text-[10px] tracking-[0.06em] text-amber-brand/80 mt-2 flex items-center justify-between gap-2">
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
            </div>
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
          href="/missions/start"
          className="relative block w-full overflow-hidden rounded-2xl border border-amber-brand/40 bg-amber-soft no-underline text-amber-brand transition-transform active:scale-[0.99] hover:brightness-95"
        >
          <div className="relative px-5 py-4 flex items-center gap-4">
            <div className="grid place-items-center size-12 rounded-2xl shrink-0 bg-amber-brand text-amber-soft">
              <Icon name="target" size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-amber-brand/80">
                {t("title")}
              </div>
              <div className="text-[18px] font-semibold leading-tight mt-0.5">
                {t("startMission")}
              </div>
              <div className="font-mono text-[10.5px] tracking-[0.06em] text-amber-brand/80 mt-1">
                {t("pickerSubtitleMap")}
              </div>
            </div>
            <span className="grid place-items-center size-9 rounded-full shrink-0 font-mono text-base bg-amber-brand text-amber-soft">
              ▸
            </span>
          </div>
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
