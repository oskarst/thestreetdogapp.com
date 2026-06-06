import { getTranslations } from "next-intl/server";
import { Building2, ExternalLink, Phone } from "lucide-react";

/**
 * Static partner-organisations list (municipal agency, NGOs, shelters).
 * Mirrors PartnerClinicsList in shape so the two stack naturally on the
 * adopt info page and the health-report page.
 *
 * TODO(content): confirm DogHome's official website / hotline before
 * removing the placeholder href.
 */
export async function PartnerOrgsList() {
  const t = await getTranslations("partnerOrgs");

  const orgs = [1, 2].map((n) => ({
    name: t(`org${n}Name`),
    type: t(`org${n}Type`),
    mission: t(`org${n}Mission`),
    phone: t.has(`org${n}Phone`) ? t(`org${n}Phone`) : "",
    website: t.has(`org${n}Website`) ? t(`org${n}Website`) : "",
    note: t.has(`org${n}Note`) ? t(`org${n}Note`) : "",
  }));

  return (
    <section className="rounded-2xl border border-rule bg-card p-4 space-y-3">
      <div>
        <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
          {t("eyebrow")}
        </div>
        <p className="text-sm leading-relaxed text-ink">{t("intro")}</p>
      </div>

      <ul className="space-y-2">
        {orgs.map((o, i) => (
          <li
            key={i}
            className="rounded-xl border border-rule bg-background px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                  <div className="font-medium text-[15.4px] text-ink leading-tight">
                    {o.name}
                  </div>
                </div>
                <div className="mt-0.5 font-mono text-[11px] tracking-[0.04em] uppercase text-muted-foreground">
                  {o.type}
                </div>
                <p className="mt-1.5 text-[14.3px] leading-snug text-ink/85">
                  {o.mission}
                </p>
                {(o.phone || o.note) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[12.1px] tracking-[0.04em] text-muted-foreground">
                    {o.phone && (
                      <a
                        href={`tel:${o.phone.replace(/\s+/g, "")}`}
                        className="inline-flex items-center gap-1 text-ink underline underline-offset-2 hover:text-amber-brand"
                      >
                        <Phone className="size-3" />
                        {o.phone}
                      </a>
                    )}
                    {o.phone && o.note && <span>·</span>}
                    {o.note && <span>{o.note}</span>}
                  </div>
                )}
              </div>
              {o.website && (
                <a
                  href={o.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${t("openWebsite")} — ${o.name}`}
                  className="shrink-0 grid place-items-center size-9 rounded-full bg-muted text-ink hover:bg-amber-brand hover:text-amber-soft transition-colors"
                >
                  <ExternalLink className="size-4" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
