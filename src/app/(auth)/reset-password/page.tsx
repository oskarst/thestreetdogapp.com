"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  AuthField,
  PrimaryAuthButton,
} from "@/components/auth/auth-fields";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/auth/callback` }
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setSuccess(true);
  }

  if (success) {
    return (
      <AuthShell
        eyebrow="Reset Sent"
        title="Email sent."
        description=""
        footer={
          <Link
            href="/login"
            className="text-ink underline underline-offset-[3px] font-medium"
          >
            back to login
          </Link>
        }
      >
        <div className="card-soft p-5 flex items-start gap-3">
          <CheckCircle2 className="size-5 text-[var(--green-brand)] shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            If an account exists for{" "}
            <span className="font-medium text-ink">{email}</span>, you&apos;ll
            receive a password reset link shortly.
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Operator Recovery"
      title="Reset password."
      description="Enter your email to receive a reset link."
      footer={
        <>
          remember your password?{" "}
          <Link
            href="/login"
            className="text-ink underline underline-offset-[3px] font-medium"
          >
            sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <AuthField
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          autoComplete="email"
          error={error}
        />
        <PrimaryAuthButton type="submit" loading={loading}>
          Send reset link
        </PrimaryAuthButton>
      </form>
    </AuthShell>
  );
}
