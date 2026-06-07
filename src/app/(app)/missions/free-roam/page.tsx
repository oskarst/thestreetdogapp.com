import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth-cache";

export default async function FreeRoamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const t = await getTranslations("missions");

  const points: { label: string; xp: string }[] = [
    { label: t("freeRoamPtSighting"), xp: "+10" },
    { label: t("freeRoamPtUnique"), xp: "+20" },
    { label: t("freeRoamPtDiscover"), xp: "+30" },
    { label: t("freeRoamPtDaily"), xp: "+15" },
    { label: t("freeRoamPtTag"), xp: "+5" },
  ];

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      <header>
        <Link
          href="/missions/start"
          className="font-mono text-[11px] tracking-[0.16em] uppercase text-muted-foreground hover:text-ink no-underline transition-colors"
        >
          ← {t("finddoggoBack")}
        </Link>
        <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mt-2">
          {t("freeRoamSubtitle")}
        </div>
        <h1 className="text-[28.6px] font-bold tracking-[-0.02em] leading-tight mt-1">
          {t("freeRoamTitle")}
        </h1>
      </header>

      <p className="text-[15px] leading-relaxed text-ink-soft">
        {t("freeRoamIntro")}
      </p>

      <section className="card-soft p-4 space-y-3">
        <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
          {t("freeRoamPointsTitle")}
        </div>
        <ul className="space-y-2">
          {points.map((p) => (
            <li
              key={p.label}
              className="flex items-center justify-between gap-3 border-b border-rule last:border-0 pb-2 last:pb-0"
            >
              <span className="text-[14.3px] text-ink">{p.label}</span>
              <span className="font-mono text-[13.2px] font-semibold text-green-deep shrink-0">
                {p.xp} XP
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[12.1px] leading-snug text-muted-foreground">
          {t("freeRoamFootnote")}
        </p>
      </section>

      <Link
        href="/add-dog"
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-ink text-background text-[16.5px] font-semibold no-underline transition-transform active:scale-[0.98]"
      >
        <span className="font-mono text-[var(--green-brand)] font-medium">
          &gt;
        </span>
        {t("freeRoamCta")}
      </Link>
    </div>
  );
}
