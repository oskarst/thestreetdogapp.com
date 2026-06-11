import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-cache";
import { getDogById } from "@/lib/db/dogs";
import { createClient } from "@/lib/supabase/server";
import { DogEditForm } from "@/components/dog/dog-edit-form";

interface Params {
  params: Promise<{ id: string }>;
}

export default async function EditDogPage({ params }: Params) {
  const { id } = await params;
  const [user, dog] = await Promise.all([getCurrentUser(), getDogById(id)]);
  if (!user) redirect("/login");
  if (!dog) notFound();

  // Editing the shared dog record is open to catchers: the registrar, or
  // anyone who has logged a sighting of this dog (same rule as naming).
  const isRegistrar = dog.first_registered_by_id === user.id;
  let isSpotter = false;
  if (!isRegistrar) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("has_user_spotted_dog", {
      p_dog_id: id,
    });
    isSpotter = data === true;
  }
  const dogName = dog.names?.[0] ?? "this dog";

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      <div>
        <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
          Edit · Dog details
        </div>
        <h1 className="text-[24.2px] font-semibold leading-tight">
          Edit {dogName}
        </h1>
      </div>

      {isRegistrar || isSpotter ? (
        <>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Correct this dog&apos;s details. To change its name, use{" "}
            <Link
              href={`/dog/${dog.id}/name`}
              className="text-ink underline underline-offset-2"
            >
              Name this dog
            </Link>
            .
          </p>
          <DogEditForm
            dogId={dog.id}
            initial={{
              character: dog.character ?? null,
              size: dog.size ?? null,
              gender: dog.gender ?? null,
              age: dog.age ?? null,
            }}
          />
        </>
      ) : (
        <div className="card-soft p-5 text-center space-y-3">
          <p className="text-sm text-ink">
            Only people who have caught this dog can edit its details.
          </p>
          <p className="text-sm text-muted-foreground">
            Log a sighting first, then you can help keep its data accurate.
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
