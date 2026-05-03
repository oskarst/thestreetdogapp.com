"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  AuthField,
  PrimaryAuthButton,
  AuthDivider,
} from "@/components/auth/auth-fields";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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
      // "no such user", "email not confirmed" etc., to prevent account
      // enumeration via login error responses. Real reasons are logged
      // server-side by Supabase.
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <AuthShell
      eyebrow="Operator Sign-In"
      title="Welcome back."
      description={t("signInDescription")}
      footer={
        <>
          new operator?{" "}
          <Link
            href="/register"
            className="text-ink underline underline-offset-[3px] font-medium"
          >
            register
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
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

        {error && (
          <p className="text-sm text-destructive mb-2">{error}</p>
        )}

        <PrimaryAuthButton type="submit" loading={loading}>
          {t("signIn")}
        </PrimaryAuthButton>
      </form>

      <AuthDivider>{t("or")}</AuthDivider>

      <GoogleAuthButton />
    </AuthShell>
  );
}
