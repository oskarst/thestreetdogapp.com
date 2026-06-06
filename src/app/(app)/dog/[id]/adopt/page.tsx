import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-cache";
import { getDogById } from "@/lib/db/dogs";
import { PartnerClinicsList } from "@/components/dog/partner-clinics-list";
import { PartnerOrgsList } from "@/components/dog/partner-orgs-list";

interface Params {
  params: Promise<{ id: string }>;
}

export default async function AdoptPage({ params }: Params) {
  const { id } = await params;
  const [user, dog] = await Promise.all([getCurrentUser(), getDogById(id)]);
  if (!user) redirect("/login");
  if (!dog) notFound();

  const t = await getTranslations("adopt");
  const dogName = dog.names?.[0] ?? t("untitled");
  const image = dog.images?.[0];
  const steps = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      <Link
        href={`/dog/${id}`}
        className="inline-flex items-center gap-1.5 font-mono text-[12.1px] tracking-[0.06em] uppercase text-muted-foreground hover:text-ink transition-colors no-underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("backToDog")}
      </Link>

      <section className="card-soft p-4 flex items-center gap-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          {image ? (
            <Image
              src={image}
              alt={dogName}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-3xl">
              🐕
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
            {t("eyebrow")}
          </div>
          <h1 className="text-[19.8px] font-semibold leading-tight">
            {t("title", { name: dogName })}
          </h1>
          {dog.ear_tag_id && (
            <div className="font-mono text-[11.6px] tracking-[0.04em] text-muted-foreground mt-1">
              {t("earTagLabel")} · {dog.ear_tag_id}
            </div>
          )}
        </div>
      </section>

      <section className="card-soft p-4 space-y-3">
        <h2 className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
          {t("stepsLabel")}
        </h2>
        <ol className="space-y-3">
          {steps.map((n) => (
            <li key={n} className="flex gap-3">
              <span className="grid place-items-center size-7 shrink-0 rounded-full bg-ink text-background font-mono text-[13.2px] font-medium">
                {n}
              </span>
              <div className="flex-1 pt-0.5">
                <div className="font-semibold text-[15.4px] leading-tight text-ink">
                  {t(`step${n}Title`)}
                </div>
                <p className="text-[14.3px] text-muted-foreground leading-snug mt-1 whitespace-pre-line">
                  {t(`step${n}Body`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <PartnerClinicsList />

      <PartnerOrgsList />

      <section className="rounded-2xl border border-amber-brand/40 bg-amber-soft p-4">
        <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-amber-brand/80 mb-1">
          {t("docsLabel")}
        </div>
        <p className="text-sm text-amber-brand leading-relaxed whitespace-pre-line">
          {t("docsBody")}
        </p>
      </section>
    </div>
  );
}
