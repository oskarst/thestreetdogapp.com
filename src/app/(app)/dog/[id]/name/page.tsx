"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";

export default function NameDogPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dogImage, setDogImage] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Fetch dog image on mount
  const [fetched, setFetched] = useState(false);
  if (!fetched) {
    setFetched(true);
    const supabase = createClient();
    supabase
      .from("dogs")
      .select("images")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data?.images?.[0]) {
          setDogImage(data.images[0]);
        }
        setImageLoaded(true);
      });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !user) return;

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      // Fetch current names
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
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-md mx-auto space-y-6">
      {dogImage && (
        <div className="relative aspect-square w-32 mx-auto rounded-xl overflow-hidden bg-muted">
          <Image
            src={dogImage}
            alt="Dog"
            fill
            className="object-cover"
            sizes="128px"
          />
        </div>
      )}

      <div className="text-center">
        <h1 className="text-lg font-bold">Name this dog</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Give this dog a name so others can recognize it
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name..."
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          maxLength={50}
          required
        />

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Saving..." : "Save Name"}
        </button>
      </form>

      <button
        onClick={() => router.back()}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
