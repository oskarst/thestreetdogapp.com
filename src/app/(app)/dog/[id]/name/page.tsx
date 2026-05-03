"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Icon } from "@/components/ui/icon";

export default function NameDogPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dogImage, setDogImage] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("dogs")
      .select("images")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data?.images?.[0]) setDogImage(data.images[0]);
        setImageLoaded(true);
      });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !user) return;

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: dog, error: fetchErr } = await supabase
        .from("dogs")
        .select("names")
        .eq("id", id)
        .single();
      if (fetchErr) throw fetchErr;

      const currentNames: string[] = dog?.names ?? [];
      const updatedNames = [...currentNames, trimmed];

      const { error: updateErr } = await supabase
        .from("dogs")
        .update({ names: updatedNames })
        .eq("id", id);
      if (updateErr) throw updateErr;

      router.push(`/dog/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save name");
      setSubmitting(false);
    }
  }

  if (userLoading || !imageLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
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
        <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
          subject_{id.slice(0, 4).toUpperCase()}
        </div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em] leading-tight">
          Name this dog
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          So other operators can recognize them.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name…"
          className="w-full rounded-xl border border-rule-2 bg-card px-3.5 py-3 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:border-ink"
          maxLength={50}
          required
          autoFocus
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-ink text-background text-[15px] font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <span className="font-mono text-[var(--green-brand)] font-medium">
            &gt;
          </span>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save name"
          )}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="w-full font-mono text-[11px] tracking-[0.16em] uppercase text-muted-foreground hover:text-ink py-2"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
