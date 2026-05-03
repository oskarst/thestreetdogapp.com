import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/section-label";
import { getMissionsView, PARENT_COLORS } from "@/lib/missions";
import { MissionsActiveActions } from "@/components/dog/missions-active-actions";
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
        <div className="rounded-2xl border border-[var(--green-brand)]/40 bg-green-soft p-4">
          <div className="flex items-center gap-4 mb-3">
            <div className="relative shrink-0">
              <div
                className="size-14 rounded-full grid place-items-center bg-[var(--green-brand)] text-white"
                style={{ boxShadow: "0 6px 14px rgba(34,197,94,0.32)" }}
              >
                <span className="text-2xl leading-none">🧭</span>
              </div>
              <span
                className="absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-green-soft"
                style={{
                  background:
                    PARENT_COLORS[active.colorIndex] ?? "var(--green-deep)",
                }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 leading-none">
                <span className="font-mono text-[40px] font-medium tracking-[-0.04em] text-[var(--green-deep)]">
                  {active.progress}
                </span>
                <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--green-deep)]/80">
                  / {active.target} subjects
                </span>
              </div>
              <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-[var(--green-deep)]/80 mt-1.5 truncate">
                {activeLabel}
              </div>
              <div className="flex items-center gap-1 mt-2">
                {Array.from({ length: active.target }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full flex-1",
                      i < active.progress
                        ? "bg-[var(--green-brand)]"
                        : "bg-[var(--green-brand)]/20"
                    )}
                  />
                ))}
              </div>
              <div className="font-mono text-[10px] tracking-[0.06em] text-[var(--green-deep)]/80 mt-2 flex items-center justify-between gap-2">
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
          href="/map?picker=1"
          className="relative block w-full overflow-hidden rounded-2xl no-underline text-background transition-transform active:scale-[0.99] hover:brightness-105"
          style={{
            background:
              "linear-gradient(135deg, var(--green-deep) 0%, var(--green-brand) 100%)",
            boxShadow:
              "0 10px 28px -8px rgba(34,197,94,0.55), 0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          {/* Decorative dotted grid suggesting "districts to explore" */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1.5px)",
              backgroundSize: "16px 16px",
              mask: "linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0))",
              WebkitMask:
                "linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0))",
            }}
          />
          <div className="relative px-5 py-4 flex items-center gap-4">
            <div
              className="grid place-items-center size-12 rounded-2xl shrink-0"
              style={{
                background: "rgba(255,255,255,0.18)",
                backdropFilter: "blur(2px)",
                border: "1px solid rgba(255,255,255,0.35)",
              }}
            >
              <span className="text-2xl leading-none">🧭</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] tracking-[0.32em] uppercase opacity-85">
                {t("title")}
              </div>
              <div className="text-[18px] font-semibold leading-tight mt-0.5">
                {t("startMission")}
              </div>
              <div className="font-mono text-[10.5px] tracking-[0.06em] opacity-85 mt-1">
                {t("pickerSubtitleMap")}
              </div>
            </div>
            <span
              className="grid place-items-center size-9 rounded-full shrink-0 font-mono text-base"
              style={{
                background: "rgba(255,255,255,0.95)",
                color: "var(--green-deep)",
                boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              }}
            >
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
