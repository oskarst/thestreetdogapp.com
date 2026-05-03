import { redirect } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth-cache";
import { getMissionsProgress } from "@/lib/missions";
import { SectionLabel } from "@/components/ui/section-label";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

function localizedName(
  locale: string,
  m: { name_en: string; name_ka: string; name_ru: string }
): string {
  if (locale === "ka") return m.name_ka;
  if (locale === "ru") return m.name_ru;
  return m.name_en;
}

export default async function MissionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [t, locale, missions] = await Promise.all([
    getTranslations("missions"),
    getLocale(),
    getMissionsProgress(),
  ]);

  const totalCompleted = missions.filter((m) => m.completed).length;

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      <header>
        <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
          {t("subtitle")}
        </div>
        <h1 className="text-[26px] font-bold tracking-[-0.02em] leading-tight mt-1">
          {t("title")}
        </h1>
      </header>

      <SectionLabel meta={`${totalCompleted} / ${missions.length}`}>
        {t("raionsLabel")}
      </SectionLabel>

      <div className="grid grid-cols-2 gap-2.5">
        {missions.map((m) => {
          const ratio =
            m.totalDogs === 0 ? 0 : Math.min(1, m.mySpotted / m.totalDogs);
          const ready = m.totalDogs > 0 && m.mySpotted >= m.totalDogs;
          const empty = m.totalDogs === 0;

          return (
            <Link
              key={m.slug}
              href={`/map?mission=${m.slug}`}
              className={cn(
                "card-soft p-3 flex flex-col gap-2 no-underline text-inherit transition-colors hover:border-ink/30",
                m.completed && "bg-green-soft border-[var(--green-brand)]/40",
                empty && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-[14px] leading-tight">
                  {localizedName(locale, m)}
                </div>
                {m.completed ? (
                  <Icon
                    name="medal"
                    size={16}
                    className="text-[var(--green-brand)] shrink-0"
                  />
                ) : ready ? (
                  <span className="size-1.5 rounded-full bg-[var(--green-brand)] shrink-0 mt-1.5 animate-pulse" />
                ) : null}
              </div>

              <div>
                <div className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground mb-1.5 flex justify-between">
                  <span>
                    <b className="text-ink font-medium">{m.mySpotted}</b> /{" "}
                    {m.totalDogs}
                  </span>
                  <span>+{m.rewardXp} xp</span>
                </div>
                <div className="relative h-1 bg-rule-2 rounded overflow-hidden">
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded transition-all",
                      m.completed
                        ? "bg-[var(--green-deep)]"
                        : ready
                          ? "bg-[var(--green-brand)]"
                          : "bg-ink/40"
                    )}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              </div>

              <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground mt-auto">
                {m.completed
                  ? t("statusCompleted")
                  : ready
                    ? t("statusReady")
                    : empty
                      ? t("statusEmpty")
                      : t("statusInProgress")}
              </div>
            </Link>
          );
        })}
      </div>

      <p className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground px-1 leading-relaxed">
        {t("howItWorks")}
      </p>
    </div>
  );
}
