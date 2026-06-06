"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Icon } from "@/components/ui/icon";
import { DogNameInput } from "@/components/dog/dog-name-input";

type Permission = "loading" | "allowed" | "denied";

export default function NameDogPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [dogImage, setDogImage] = useState<string | null>(null);
  const [permission, setPermission] = useState<Permission>("loading");

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      setPermission("denied");
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const [dogRes, spottedRes] = await Promise.all([
        supabase
          .from("dogs")
          .select("images, first_registered_by_id")
          .eq("id", id)
          .single(),
        supabase.rpc("has_user_spotted_dog", { p_dog_id: id }),
      ]);
      if (cancelled) return;
      if (dogRes.data?.images?.[0]) setDogImage(dogRes.data.images[0]);
      const isRegistrar = dogRes.data?.first_registered_by_id === user.id;
      const isSpotter = spottedRes.data === true;
      setPermission(isRegistrar || isSpotter ? "allowed" : "denied");
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user, userLoading]);

  if (userLoading || permission === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="px-4 py-6 max-w-md mx-auto space-y-5 text-center">
        <div className="grid place-items-center size-20 rounded-2xl bg-card border border-rule text-muted-foreground mx-auto">
          <Icon name="paw" size={32} />
        </div>
        <div>
          <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
            subject_{id.slice(0, 4).toUpperCase()}
          </div>
          <h1 className="text-[24.2px] font-bold tracking-[-0.02em] leading-tight">
            You can&apos;t name this dog
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Only the dog&apos;s registrar or someone who has spotted it can add
            a name.
          </p>
        </div>
        <Link
          href={`/dog/${id}`}
          className="inline-flex w-full items-center justify-center px-4 py-3 rounded-xl border border-rule-2 bg-card text-sm font-medium text-ink hover:bg-muted"
        >
          Back to subject
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-md mx-auto space-y-6">
      <div className="flex flex-col items-center">
        {dogImage ? (
          <div className="relative aspect-square w-32 rounded-2xl overflow-hidden border border-rule">
            <Image
              src={dogImage}
              alt="Dog"
              fill
              className="object-cover"
              sizes="128px"
            />
          </div>
        ) : (
          <div className="grid place-items-center size-32 rounded-2xl bg-card border border-rule text-muted-foreground">
            <Icon name="paw" size={48} />
          </div>
        )}
      </div>

      <div className="text-center">
        <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
          subject_{id.slice(0, 4).toUpperCase()}
        </div>
        <h1 className="text-[24.2px] font-bold tracking-[-0.02em] leading-tight">
          Name this dog
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          So other researchers can recognize them.
        </p>
      </div>

      <div className="space-y-3">
        <DogNameInput dogId={id} redirectAfterSave={`/dog/${id}`} />
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full font-mono text-[12.1px] tracking-[0.16em] uppercase text-muted-foreground hover:text-ink py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
