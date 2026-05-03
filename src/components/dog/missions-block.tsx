import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/section-label";
import { getMissionsView, PARENT_COLORS } from "@/lib/missions";
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
        <div
          className="relative rounded-2xl bg-card p-4 overflow-hidden"
          style={{
            border: `1px solid ${PARENT_COLORS[active.colorIndex] ?? "var(--ink)"}`,
            boxShadow: `0 8px 24px -10px ${PARENT_COLORS[active.colorIndex] ?? "rgba(26,22,18,0.4)"}66, 0 2px 8px rgba(0,0,0,0.06)`,
          }}
        >
          {/* Coloured accent strip on the left edge */}
          <span
            aria-hidden
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{ background: PARENT_COLORS[active.colorIndex] ?? "var(--ink)" }}
          />
          <div className="flex items-baseline justify-between gap-2 mb-2 pl-1">
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground flex items-center gap-1.5">
                <span
                  className="size-1.5 rounded-full"
                  style={{
                    background:
                      PARENT_COLORS[active.colorIndex] ?? "var(--green-brand)",
                    animation: "pulse-dot 1.6s ease-in-out infinite",
                  }}
                />
                {t("activeLabel")}
              </div>
              <div className="text-[18px] font-semibold leading-tight truncate mt-0.5">
                {activeLabel}
              </div>
            </div>
            <span className="font-mono text-[12px] tracking-[0.04em] text-muted-foreground shrink-0">
              <b className="text-ink font-medium text-[16px]">{active.progress}</b>{" "}
              / {active.target}
            </span>
          </div>

          <div className="relative h-1.5 bg-rule-2 rounded overflow-hidden mb-3">
            <div
              className="absolute inset-y-0 left-0 rounded transition-all"
              style={{
                width: `${Math.min(100, (active.progress / active.target) * 100)}%`,
                background:
                  PARENT_COLORS[active.colorIndex] ?? "var(--green-brand)",
                boxShadow: `0 0 8px ${PARENT_COLORS[active.colorIndex] ?? "var(--green-brand)"}88`,
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
