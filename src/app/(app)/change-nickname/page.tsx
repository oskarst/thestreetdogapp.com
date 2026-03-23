"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ChangeNicknamePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nickname.trim();

    if (trimmed.length < 2) {
      setError("Nickname must be at least 2 characters.");
      return;
    }
    if (trimmed.length > 100) {
      setError("Nickname must be under 100 characters.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ nickname: trimmed })
      .eq("id", user.id);

    if (updateError) {
      setError("Failed to update nickname. Please try again.");
      setLoading(false);
      return;
    }

    toast.success("Nickname updated!");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h1 className="text-2xl font-bold tracking-tight mb-6">
        Change Nickname
      </h1>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="nickname">New Nickname</Label>
          <Input
            id="nickname"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setError("");
            }}
            placeholder="Enter new nickname"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Save
        </Button>
      </form>
    </div>
  );
}
