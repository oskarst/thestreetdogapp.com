"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthField, PrimaryAuthButton } from "@/components/auth/auth-fields";
import { createClient } from "@/lib/supabase/client";

type Mode = "magic" | "password";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email) {
      setError(t("fillAllFields"));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // Magic-link sign-in is for existing accounts; new users register
        // (which logs them in immediately).
        shouldCreateUser: false,
      },
    });
    setLoading(false);

    if (otpError) {
      const lower = otpError.message.toLowerCase();
      if (lower.includes("rate limit")) {
        setError("Too many attempts. Please try again in a few minutes.");
        return;
      }
      // Don't reflect "no such user" etc. — show the sent state regardless
      // so the link request can't be used to enumerate accounts.
      console.warn("[login] magic link silent error:", otpError.message);
    }
    setMagicSent(true);
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError(t("fillAllFields"));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Generic message — never differentiate between "wrong password",
      // "no such user", etc., to prevent account enumeration.
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  const footer = (
    <>
      new operator?{" "}
      <Link
        href="/register"
        className="text-ink underline underline-offset-[3px] font-medium"
      >
        register
      </Link>
    </>
  );

  if (magicSent) {
    return (
      <AuthShell
        eyebrow="Link Sent"
        title="Check your email."
        description=""
        footer={footer}
      >
        <div className="card-soft p-5 flex items-start gap-3">
          <CheckCircle2 className="size-5 text-[var(--green-brand)] shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            {t("magicSentDesc", { email })}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setMagicSent(false);
            setMode("password");
          }}
          className="mt-4 w-full rounded-xl border border-rule-2 bg-card py-3 text-center text-sm font-medium text-ink hover:bg-muted transition-colors"
        >
          {t("usePassword")}
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Operator Sign-In"
      title="Welcome back."
      description={t("signInDescription")}
      footer={footer}
    >
      {mode === "magic" ? (
        <form onSubmit={handleMagic}>
          <AuthField
            label={t("email")}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          {error && <p className="text-sm text-destructive mb-2">{error}</p>}

          <PrimaryAuthButton type="submit" loading={loading}>
            {t("sendMagicLink")}
          </PrimaryAuthButton>

          <button
            type="button"
            onClick={() => switchMode("password")}
            className="mt-3 w-full rounded-xl border border-rule-2 bg-card py-3 text-center text-sm font-medium text-ink hover:bg-muted transition-colors"
          >
            {t("usePassword")}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePassword}>
          <AuthField
            label={t("email")}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <AuthField
            label={t("password")}
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            togglePassword
            hint={
              <Link href="/reset-password" className="hover:text-ink">
                {t("forgotPassword").toLowerCase()}
              </Link>
            }
          />

          {error && <p className="text-sm text-destructive mb-2">{error}</p>}

          <PrimaryAuthButton type="submit" loading={loading}>
            {t("signIn")}
          </PrimaryAuthButton>

          <button
            type="button"
            onClick={() => switchMode("magic")}
            className="mt-3 w-full rounded-xl border border-rule-2 bg-card py-3 text-center text-sm font-medium text-ink hover:bg-muted transition-colors"
          >
            {t("useMagicLink")}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
