import { getTranslations } from "next-intl/server";

/**
 * Static partner-clinic list with first-aid pointers, rendered above the
 * health-report textarea and on the adoption info page.
 *
 * TODO(content): swap the placeholder clinics for real partners. Each
 * entry is `t("clinic{n}Name")` + `t("clinic{n}Phone")` + `t("clinic{n}Addr")`
 * so the structure can stay stable across en/ka/ru.
 */
export async function PartnerClinicsList() {
  const t = await getTranslations("partnerClinics");

  const clinics = [1, 2, 3].map((n) => ({
    name: t(`clinic${n}Name`),
    phone: t(`clinic${n}Phone`),
    addr: t(`clinic${n}Addr`),
    // Optional per-clinic note (e.g. "24h", "Speaks English, Farsi"). The
    // tag fallback returns the key itself when missing — translation files
    // currently always set it but treat absence as no-note for safety.
    note: t.has(`clinic${n}Note`) ? t(`clinic${n}Note`) : "",
  }));

  return (
    <section className="rounded-2xl border border-rule bg-card p-4 space-y-3">
      <div>
        <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
          {t("eyebrow")}
        </div>
        <p className="text-sm leading-relaxed text-ink">{t("intro")}</p>
      </div>

      <ul className="space-y-2">
        {clinics.map((c, i) => (
          <li
            key={i}
            className="rounded-xl border border-rule bg-background px-3 py-2.5"
          >
            <div className="font-medium text-[14px] text-ink leading-tight">
              {c.name}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] tracking-[0.04em] text-muted-foreground">
              <a
                href={`tel:${c.phone.replace(/\s+/g, "")}`}
                className="text-ink underline underline-offset-2 hover:text-amber-brand"
              >
                {c.phone}
              </a>
              <span>·</span>
              <span>{c.addr}</span>
            </div>
            {c.note && (
              <div className="mt-1 font-mono text-[10.5px] tracking-[0.04em] text-amber-brand/90">
                {c.note}
              </div>
            )}
          </li>
        ))}
      </ul>

      <details className="text-sm">
        <summary className="cursor-pointer text-ink font-medium">
          {t("firstAidTitle")}
        </summary>
        <div className="mt-2 text-muted-foreground leading-relaxed whitespace-pre-line">
          {t("firstAidBody")}
        </div>
      </details>
    </section>
  );
}
