"use client";

import { useRef, useState } from "react";
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
  // Synchronous guard against a double-submit (a second click/Enter or a fast
  // re-render) firing a second signUp — the first creates the account, the
  // second would error "already registered" for a brand-new email.
  const submitting = useRef(false);

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

    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);

    const supabase = createClient();

    function fail(message: string) {
      setErrors({ form: message });
      submitting.current = false;
      setLoading(false);
    }

    // Everything below is network I/O. Wrap it so a flaky connection (a thrown
    // fetch error on any call) surfaces a retryable error instead of leaving
    // the button stuck spinning with the submit guard latched — the root of
    // the "registration is flaky" reports.
    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { nickname: form.nickname },
        },
      });

      let session = signUpData?.session ?? null;

      if (error) {
        const lower = error.message.toLowerCase();
        if (lower.includes("rate limit")) {
          return fail("Too many attempts. Please try again in a few minutes.");
        }
        const taken =
          lower.includes("already registered") ||
          lower.includes("already been registered") ||
          lower.includes("user already");
        if (!taken) {
          return fail("Something went wrong. Please try again.");
        }
        // "Already registered" on a brand-new email is almost always a
        // double-submit or a network retry of THIS user's own signup — the
        // first request already created the account. Try to sign in with the
        // password they just entered: if it works the account is theirs and we
        // continue; if not, it's a genuinely different existing account.
        const { data: signinData, error: signinErr } =
          await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.password,
          });
        if (signinErr) {
          return fail(
            "That email is already registered. Try signing in instead."
          );
        }
        session = signinData.session;
      }

      // Confirmation-OFF returns a session straight from signUp. If there
      // isn't one (e.g. email confirmation is enabled), the account exists but
      // can't be used yet — tell them to confirm rather than bouncing to a
      // dashboard that would just redirect back to login.
      if (!session) {
        submitting.current = false;
        setLoading(false);
        setErrors({
          form: "Account created. Check your email to confirm it, then sign in.",
        });
        return;
      }

      // The auth trigger creates the profile row with id + email only, so the
      // chosen nickname is written back here (RLS allows updating your own).
      // Best-effort: a failure here shouldn't block an otherwise-good signup.
      await supabase
        .from("profiles")
        .update({ nickname: form.nickname })
        .eq("id", session.user.id);

      router.push("/dashboard");
    } catch {
      fail("Network problem. Please check your connection and try again.");
    }
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
          <div className="mb-2">
            <p className="text-sm text-destructive">{errors.form}</p>
            {errors.form.includes("already registered") && (
              <p className="text-sm text-muted-foreground mt-1">
                <Link
                  href="/login"
                  className="text-ink underline underline-offset-[3px] font-medium"
                >
                  Sign in
                </Link>{" "}
                or{" "}
                <Link
                  href="/reset-password"
                  className="text-ink underline underline-offset-[3px] font-medium"
                >
                  reset your password
                </Link>
                .
              </p>
            )}
          </div>
        )}

        <PrimaryAuthButton type="submit" loading={loading}>
          Create operator
        </PrimaryAuthButton>
      </form>
    </AuthShell>
  );
}
