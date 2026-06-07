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
      // Land on the change-password screen after the link logs them in, so
      // they actually set a new password instead of dropping on /dashboard.
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/change-password`,
      }
    );

    // Always show the generic success state — never differentiate between
    // "user not found", "rate limit hit", or "email sent". Reflects the
    // standard "if an account exists for this email, you'll get a link"
    // pattern so attackers can't enumerate accounts by trying reset.
    if (resetError) {
      const lower = resetError.message.toLowerCase();
      if (lower.includes("rate limit")) {
        setError("Too many reset attempts. Please try again in a few minutes.");
        setLoading(false);
        return;
      }
      // Any other error — log server-side, show success.
      console.warn("[reset-password] silent error:", resetError.message);
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
