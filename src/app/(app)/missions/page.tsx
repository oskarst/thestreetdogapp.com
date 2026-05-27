import { redirect } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth-cache";
import { getMissionsView, PARENT_COLORS } from "@/lib/missions";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { MissionStartButton } from "@/components/dog/missions-picker-row";

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

  // Group chunks by parent raion, preserving the colour for the section header.
  const byParent: Record<
    string,
    {
      parentSlug: string;
      parentName: string;
      colorIndex: number;
      items: typeof list;
    }
  > = {};
  for (const m of list) {
    if (!byParent[m.parentSlug]) {
      byParent[m.parentSlug] = {
        parentSlug: m.parentSlug,
        parentName: localizedParent(locale, m),
        colorIndex: m.colorIndex,
        items: [],
      };
    }
    byParent[m.parentSlug].items.push(m);
  }
  const parents = Object.values(byParent).sort((a, b) =>
    a.parentName.localeCompare(b.parentName)
  );

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

      <Link
        href="/missions/start"
        className="card-soft block w-full px-4 py-3 no-underline text-inherit transition-colors hover:border-ink/30"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-[14px] leading-tight">
              {t("chooserTitle")}
            </div>
            <div className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground mt-0.5">
              {t("chooserSubtitle")}
            </div>
          </div>
          <span className="font-mono text-[var(--green-brand)] text-lg shrink-0">
            ›
          </span>
        </div>
      </Link>

      <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground px-1 flex justify-between">
        <span>{t("raionsLabel")}</span>
        <span>
          {completedCount} / {list.length}
        </span>
      </div>

      {parents.map((p) => {
        const color = PARENT_COLORS[p.colorIndex] ?? "#1a1612";
        const sectionDone = p.items.filter(
          (i) => i.status === "completed"
        ).length;
        return (
          <section key={p.parentSlug}>
            <div className="flex items-center gap-2 px-1 mb-1.5">
              <span
                className="size-3 rounded-sm shrink-0"
                style={{ background: color }}
              />
              <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-ink">
                {p.parentName}
              </span>
              <span className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground ml-auto">
                {sectionDone} / {p.items.length}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {p.items.map((m) => {
                const isActive = m.status === "active";
                const isCompleted = m.status === "completed";
                return (
                  <div
                    key={m.slug}
                    className={cn(
                      "card-soft p-2.5 flex items-center justify-between gap-2",
                      isCompleted &&
                        "bg-green-soft border-[var(--green-brand)]/40",
                      isActive && "border-ink/40"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[13px] leading-tight">
                        {m.parentNameEn === m.parentNameEn // placeholder
                          ? `${p.parentName} ${m.index}`
                          : m.index}
                      </div>
                      <div
                        className={cn(
                          "font-mono text-[9px] tracking-[0.16em] uppercase mt-0.5",
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
                        size={16}
                        className="text-[var(--green-brand)] shrink-0"
                      />
                    ) : isActive ? (
                      <span className="font-mono text-[10px] tracking-[0.06em] text-ink shrink-0">
                        {active && (
                          <>
                            <b className="font-medium">{active.progress}</b>/
                            {active.target}
                          </>
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
          </section>
        );
      })}

      <p className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground px-1 leading-relaxed">
        {t("howItWorks")}
      </p>
    </div>
  );
}
