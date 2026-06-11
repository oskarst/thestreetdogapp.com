"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod/v4";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthField, PrimaryAuthButton } from "@/components/auth/auth-fields";
import { createClient } from "@/lib/supabase/client";

const registerSchema = z.object({
  email: z.email("Please enter a valid email address."),
  nickname: z
    .string()
    .min(2, "Nickname must be at least 2 characters.")
    .max(100, "Nickname must be under 100 characters."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    nickname: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

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

    if (!agreed) {
      setErrors({ terms: "Please accept the Terms & Conditions to continue." });
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { nickname: form.nickname },
      },
    });

    if (error) {
      const lower = error.message.toLowerCase();
      if (lower.includes("rate limit")) {
        setErrors({
          form: "Too many attempts. Please try again in a few minutes.",
        });
      } else if (
        lower.includes("already registered") ||
        lower.includes("already been registered") ||
        lower.includes("user already")
      ) {
        // Surface the one error worth surfacing: the email is taken, so
        // there's nothing for the user to do here but sign in instead.
        setErrors({
          form: "That email is already registered. Try signing in instead.",
        });
      } else {
        setErrors({ form: "Something went wrong. Please try again." });
      }
      setLoading(false);
      return;
    }

    // Easiest possible signup: no email-confirmation gate. When Supabase
    // email confirmation is OFF, signUp returns a live session and the user
    // is already logged in. If it's ON (no session returned), fall back to
    // an explicit password sign-in so the user still lands logged in.
    if (!data.session) {
      await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
    }

    // The auth trigger creates the profile row with id + email only, so the
    // chosen nickname has to be written back here (RLS allows the user to
    // update their own nickname). Best-effort: a failure here shouldn't block
    // an otherwise-successful signup.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ nickname: form.nickname })
        .eq("id", user.id);
    }

    router.push("/dashboard");
  }

  return (
    <AuthShell
      eyebrow="Operator Onboarding"
      title="Join the pack."
      description="Sign up to log street dogs in your city and climb the leaderboard."
      footer={
        <>
          already a researcher?{" "}
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

        <label className="flex items-start gap-2.5 mb-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => {
              setAgreed(e.target.checked);
              setErrors((prev) => ({ ...prev, terms: "", form: "" }));
            }}
            className="mt-0.5 size-4 shrink-0 accent-[var(--green-brand)]"
          />
          <span className="text-[13px] leading-snug text-muted-foreground">
            I agree to the{" "}
            <Link
              href="/terms"
              target="_blank"
              className="text-ink underline underline-offset-[3px] font-medium"
            >
              Terms &amp; Conditions
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy-policy"
              target="_blank"
              className="text-ink underline underline-offset-[3px] font-medium"
            >
              Privacy Policy
            </Link>
            , including how my data is shared and that I take part at my own
            risk.
          </span>
        </label>

        {errors.terms && (
          <p className="text-sm text-destructive mb-2">{errors.terms}</p>
        )}

        {errors.form && (
          <p className="text-sm text-destructive mb-2">{errors.form}</p>
        )}

        <PrimaryAuthButton type="submit" loading={loading}>
          Create operator
        </PrimaryAuthButton>
      </form>
    </AuthShell>
  );
}
