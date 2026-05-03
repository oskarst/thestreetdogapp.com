"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SettingsForm,
  SettingsField,
} from "@/components/forms/settings-form";
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
    <SettingsForm
      eyebrow="Profile · Nickname"
      title="Change nickname"
      description="Your callsign in the operator log."
      onSubmit={handleSubmit}
      submitLabel="Save"
      loading={loading}
      error={error}
    >
      <SettingsField
        label="New Nickname"
        type="text"
        value={nickname}
        onChange={(e) => {
          setNickname(e.target.value);
          setError("");
        }}
        placeholder="marta_k"
        autoFocus
      />
    </SettingsForm>
  );
}
