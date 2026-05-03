"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SettingsForm,
  SettingsField,
} from "@/components/forms/settings-form";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    toast.success("Password updated!");
    router.push("/dashboard");
  }

  return (
    <SettingsForm
      eyebrow="Security · Password"
      title="Change password"
      description="Pick something you'll remember on patrol."
      onSubmit={handleSubmit}
      submitLabel="Save"
      loading={loading}
      error={error}
    >
      <SettingsField
        label="New password"
        type="password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError("");
        }}
        placeholder="Min. 8 characters"
        autoComplete="new-password"
        togglePassword
        autoFocus
      />
      <SettingsField
        label="Confirm password"
        type="password"
        value={confirm}
        onChange={(e) => {
          setConfirm(e.target.value);
          setError("");
        }}
        placeholder="Repeat password"
        autoComplete="new-password"
        togglePassword
      />
    </SettingsForm>
  );
}
