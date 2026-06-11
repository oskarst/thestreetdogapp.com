import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-cache";
import { getDogById } from "@/lib/db/dogs";
import { ReportDataForm } from "@/components/dog/report-data-form";

interface Params {
  params: Promise<{ id: string }>;
}

export default async function ReportDataPage({ params }: Params) {
  const { id } = await params;
  const [user, dog] = await Promise.all([getCurrentUser(), getDogById(id)]);
  if (!user) redirect("/login");
  if (!dog) notFound();

  const dogName = dog.names?.[0] ?? "this dog";

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      <div>
        <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
          Report · Bad data
        </div>
        <h1 className="text-[24.2px] font-semibold leading-tight">
          Report bad data for {dogName}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Spotted something wrong — a wrong tag number, a duplicate, the wrong
          photo or location? Let us know and an admin will take a look.
        </p>
      </div>

      <ReportDataForm dogId={dog.id} dogName={dogName} />
    </div>
  );
}
