import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-cache";
import { getDogById } from "@/lib/db/dogs";
import { ReportHealthForm } from "@/components/dog/report-health-form";
import { PartnerClinicsList } from "@/components/dog/partner-clinics-list";
import { getTranslations } from "next-intl/server";

interface Params {
  params: Promise<{ id: string }>;
}

export default async function ReportHealthPage({ params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const dog = await getDogById(id);
  if (!dog) notFound();

  const t = await getTranslations("healthReport");
  const dogName = dog.names?.[0] ?? t("untitled");

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      <div>
        <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
          {t("eyebrow")}
        </div>
        <h1 className="text-[22px] font-semibold leading-tight">
          {t("title", { name: dogName })}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          {t("intro")}
        </p>
      </div>

      <PartnerClinicsList />

      <ReportHealthForm dogId={dog.id} dogName={dogName} />
    </div>
  );
}
