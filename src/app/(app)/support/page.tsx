import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Heart, Mail, Megaphone, PawPrint } from "lucide-react";

const CONTACT_EMAIL = "hello@developers-alliance.com";

export default async function SupportPage() {
  const t = await getTranslations("support");

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      <Link
        href="/dashboard"
        prefetch={false}
        className="inline-flex items-center gap-1.5 font-mono text-[12.1px] tracking-[0.06em] uppercase text-muted-foreground hover:text-ink transition-colors no-underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("backToDashboard")}
      </Link>

      <section className="card-soft p-5">
        <div className="flex items-start gap-3">
          <div className="grid place-items-center size-10 rounded-full bg-red-50 text-red-600 shrink-0">
            <Heart className="size-5" />
          </div>
          <div>
            <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
              {t("eyebrow")}
            </div>
            <h1 className="text-[22px] font-semibold leading-tight text-ink">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              {t("intro")}
            </p>
          </div>
        </div>
      </section>

      <section className="card-soft p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-amber-brand" />
          <h2 className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
            {t("contactLabel")}
          </h2>
        </div>
        <p className="text-sm text-ink leading-relaxed">{t("contactBody")}</p>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
            t("emailSubject")
          )}`}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-background font-mono text-[13.2px] font-medium tracking-[0.06em] uppercase hover:brightness-110 transition-all no-underline"
        >
          <Mail className="size-4" />
          {CONTACT_EMAIL}
        </a>
      </section>

      <section className="card-soft p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Heart className="size-4 text-red-500" />
          <h2 className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
            {t("donateLabel")}
          </h2>
        </div>
        <p className="text-sm text-ink leading-relaxed">{t("donateBody")}</p>
        <p className="text-[13.2px] text-muted-foreground leading-relaxed">
          {t("donateUsage")}
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
            t("donateSubject")
          )}`}
          className="inline-flex items-center gap-2 rounded-full bg-amber-brand px-4 py-2.5 text-amber-soft font-mono text-[13.2px] font-medium tracking-[0.06em] uppercase hover:brightness-110 transition-all no-underline"
        >
          {t("donateCta")}
        </a>
      </section>

      <section className="card-soft p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone className="size-4 text-[var(--green-deep)]" />
          <h2 className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
            {t("collabLabel")}
          </h2>
        </div>
        <p className="text-sm text-ink leading-relaxed whitespace-pre-line">
          {t("collabBody")}
        </p>
      </section>

      <section className="rounded-2xl border border-amber-brand/40 bg-amber-soft p-4">
        <div className="flex items-start gap-3">
          <PawPrint className="size-5 text-amber-brand shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-[15.4px] text-amber-brand leading-tight">
              {t("helpInPlaceTitle")}
            </h3>
            <p className="text-[14.3px] text-amber-brand/90 leading-snug mt-1">
              {t("helpInPlaceBody")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
