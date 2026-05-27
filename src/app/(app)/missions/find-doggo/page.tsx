import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth-cache";
import { getActiveFindDoggo } from "@/lib/finddoggo";
import { FindDoggoStart } from "@/components/dog/finddoggo-start";
import { FindDoggoActions } from "@/components/dog/finddoggo-actions";

function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default async function FindDoggoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [t, target] = await Promise.all([
    getTranslations("missions"),
    getActiveFindDoggo(),
  ]);

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      <header>
        <Link
          href="/missions"
          className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground hover:text-ink no-underline transition-colors"
        >
          ← {t("finddoggoBack")}
        </Link>
        <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mt-2">
          {t("finddoggoSubtitle")}
        </div>
        <h1 className="text-[26px] font-bold tracking-[-0.02em] leading-tight mt-1">
          {t("finddoggoTitle")}
        </h1>
      </header>

      {!target ? (
        <FindDoggoStart />
      ) : (
        <>
          <section className="card-soft overflow-hidden p-0">
            {target.primaryImage ? (
              <div className="relative w-full aspect-[4/3] bg-rule-2">
                <Image
                  src={target.primaryImage}
                  alt={target.names[0] ?? t("finddoggoUnnamed")}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              </div>
            ) : (
              <div className="w-full aspect-[4/3] bg-rule-2 grid place-items-center">
                <span className="text-6xl opacity-40">🐕</span>
              </div>
            )}

            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-amber-brand inline-flex items-center gap-1.5">
                    <span
                      className="size-1.5 rounded-full bg-amber-brand"
                      style={{
                        animation: "pulse-dot 1.8s ease-in-out infinite",
                      }}
                    />
                    {t("finddoggoHuntingLabel")}
                  </div>
                  <div className="text-[18px] font-semibold leading-tight mt-1 truncate">
                    {target.names[0] ?? t("finddoggoUnnamed")}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground">
                    {t("finddoggoEartag")}
                  </div>
                  <div className="font-mono text-[14px] font-medium text-ink mt-0.5">
                    {target.earTagId ?? t("finddoggoNoTag")}
                  </div>
                </div>
              </div>

              {target.lastSightingDate && (
                <div className="font-mono text-[11px] tracking-[0.04em] text-muted-foreground">
                  {t("finddoggoLastSeen")}: {formatDateShort(target.lastSightingDate)}
                </div>
              )}
            </div>
          </section>

          <section className="card-soft p-4">
            <div className="font-mono text-[10px] font-medium tracking-[0.22em] uppercase text-ink mb-3">
              {t("finddoggoSightings")}
            </div>
            {target.recentSightings.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                {t("finddoggoNoSightings")}
              </p>
            ) : (
              <ul className="divide-y divide-rule">
                {target.recentSightings.map((s) => (
                  <li
                    key={s.id}
                    className="py-2 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-[12px] text-ink">
                        {formatDateShort(s.timestamp)}
                      </div>
                      <div className="font-mono text-[10px] tracking-[0.04em] text-muted-foreground mt-0.5">
                        {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                      </div>
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
                      target="_blank"
                      rel="noopener"
                      className="shrink-0 font-mono text-[10px] tracking-[0.06em] uppercase text-muted-foreground hover:text-ink no-underline"
                    >
                      map ›
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <FindDoggoActions dogId={target.dogId} />
        </>
      )}
    </div>
  );
}
