import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-cache";
import { getDogById } from "@/lib/db/dogs";
import { DogEditForm } from "@/components/dog/dog-edit-form";

interface Params {
  params: Promise<{ id: string }>;
}

export default async function EditDogPage({ params }: Params) {
  const { id } = await params;
  const [user, dog] = await Promise.all([getCurrentUser(), getDogById(id)]);
  if (!user) redirect("/login");
  if (!dog) notFound();

  // Only the registrar (the user who first added the dog) can edit it.
  const isOwner = dog.first_registered_by_id === user.id;
  const dogName = dog.names?.[0] ?? "this dog";

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      <div>
        <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
          Edit · Your dog
        </div>
        <h1 className="text-[24.2px] font-semibold leading-tight">
          Edit {dogName}
        </h1>
      </div>

      {isOwner ? (
        <DogEditForm dogId={dog.id} initialEarTag={dog.ear_tag_id ?? null} />
      ) : (
        <div className="card-soft p-5 text-center space-y-3">
          <p className="text-sm text-ink">
            Only the person who registered this dog can edit it.
          </p>
          <p className="text-sm text-muted-foreground">
            Spotted wrong info? Use{" "}
            <Link
              href={`/dog/${dog.id}/report`}
              className="text-ink underline underline-offset-2"
            >
              Report bad data
            </Link>{" "}
            instead.
          </p>
          <Link
            href={`/dog/${dog.id}`}
            className="inline-block rounded-full px-4 py-2 text-[13.2px] font-mono font-medium tracking-[0.06em] uppercase bg-ink text-background no-underline hover:brightness-110 transition-all"
          >
            Back to dog
          </Link>
        </div>
      )}
    </div>
  );
}
