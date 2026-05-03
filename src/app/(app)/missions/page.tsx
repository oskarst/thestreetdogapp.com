import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth-cache";
import { getMissionsView } from "@/lib/missions";
import { SectionLabel } from "@/components/ui/section-label";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { MissionStartButton } from "@/components/dog/missions-picker-row";

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

  const [t, locale, view] = await Promise.all([
    getTranslations("missions"),
    getLocale(),
    getMissionsView(),
  ]);

  const { list, active } = view;
  const completedCount = list.filter((m) => m.status === "completed").length;

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

      <SectionLabel meta={`${completedCount} / ${list.length}`}>
        {t("raionsLabel")}
      </SectionLabel>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {list.map((m) => {
          const isActive = m.status === "active";
          const isCompleted = m.status === "completed";

          return (
            <div
              key={m.slug}
              className={cn(
                "card-soft p-3.5 flex items-center justify-between gap-3",
                isCompleted && "bg-green-soft border-[var(--green-brand)]/40",
                isActive && "border-ink/40"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[14px] leading-tight truncate">
                  {localizedName(locale, m)}
                </div>
                <div
                  className={cn(
                    "font-mono text-[10px] tracking-[0.16em] uppercase mt-1",
                    isCompleted
                      ? "text-green-deep"
                      : isActive
                        ? "text-ink"
                        : "text-muted-foreground"
                  )}
                >
                  {isCompleted
                    ? t("statusCompleted")
                    : isActive
                      ? t("statusActive")
                      : t("statusAvailable")}
                </div>
              </div>

              {isCompleted ? (
                <Icon
                  name="medal"
                  size={20}
                  className="text-[var(--green-brand)] shrink-0"
                />
              ) : isActive ? (
                <span className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground shrink-0">
                  {active && (
                    <span>
                      <b className="text-ink font-medium">{active.progress}</b>{" "}
                      / {active.target}
                    </span>
                  )}
                </span>
              ) : (
                <MissionStartButton
                  slug={m.slug}
                  label={t("startButton")}
                  disabled={!!active}
                />
              )}
            </div>
          );
        })}
      </div>

      <p className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground px-1 leading-relaxed">
        {t("howItWorks")}
      </p>
    </div>
  );
}
