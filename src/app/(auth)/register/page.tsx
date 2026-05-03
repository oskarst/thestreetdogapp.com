"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod/v4";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  AuthField,
  PrimaryAuthButton,
  AuthDivider,
} from "@/components/auth/auth-fields";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { createClient } from "@/lib/supabase/client";

const registerSchema = z
  .object({
    email: z.email("Please enter a valid email address."),
    nickname: z
      .string()
      .min(2, "Nickname must be at least 2 characters.")
      .max(100, "Nickname must be under 100 characters."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: "",
    nickname: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "", form: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = registerSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { nickname: form.nickname },
      },
    });

    if (error) {
      // Don't reflect the raw Supabase error: "User already registered"
      // is the same enumeration vector as login error reflection. Show
      // the success state regardless — duplicate-email registrations
      // silently no-op (Supabase still mails the original account if
      // it exists, which is the right behavior for password reset
      // attempts disguised as registration).
      const lower = error.message.toLowerCase();
      if (lower.includes("rate limit")) {
        setErrors({
          form: "Too many attempts. Please try again in a few minutes.",
        });
        setLoading(false);
        return;
      }
      // For all other errors, treat as success — Supabase has already
      // routed the verification email to the right place.
    }

    setLoading(false);
    setSuccess(true);
  }

  if (success) {
    return (
      <AuthShell
        eyebrow="Confirmation Sent"
        title="Check your email."
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
            We sent a confirmation link to{" "}
            <span className="font-medium text-ink">{form.email}</span>. Verify
            your email to activate the operator account.
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Operator Onboarding"
      title="Join the pack."
      description="Sign up to log street dogs in your city and climb the leaderboard."
      footer={
        <>
          already an operator?{" "}
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
          label="Nickname"
          type="text"
          placeholder="marta_k"
          value={form.nickname}
          onChange={(e) => update("nickname", e.target.value)}
          autoComplete="username"
          error={errors.nickname}
        />
        <AuthField
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          autoComplete="email"
          error={errors.email}
        />
        <AuthField
          label="Password"
          type="password"
          placeholder="Min. 8 characters"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          autoComplete="new-password"
          togglePassword
          error={errors.password}
        />
        <AuthField
          label="Confirm password"
          type="password"
          placeholder="Repeat password"
          value={form.confirmPassword}
          onChange={(e) => update("confirmPassword", e.target.value)}
          autoComplete="new-password"
          togglePassword
          error={errors.confirmPassword}
        />

        {errors.form && (
          <p className="text-sm text-destructive mb-2">{errors.form}</p>
        )}

        <PrimaryAuthButton type="submit" loading={loading}>
          Create operator
        </PrimaryAuthButton>
      </form>

      <AuthDivider>or</AuthDivider>

      <GoogleAuthButton />
    </AuthShell>
  );
}
