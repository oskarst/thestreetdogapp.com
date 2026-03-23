"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <div className="grid gap-6">
        <div className="flex flex-col items-center gap-2">
          <CheckCircle2 className="size-10 text-green-600" />
          <h1 className="text-2xl font-bold tracking-tight">Email Sent</h1>
          <p className="text-center text-sm text-muted-foreground">
            If an account exists for{" "}
            <span className="font-medium text-foreground">{email}</span>, you
            will receive a password reset link.
          </p>
        </div>
        <div className="text-center">
          <Link
            href="/login"
            className="text-sm font-medium underline underline-offset-4 hover:text-green-700"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col items-center gap-2">
        <Image src="/logo-full.png" alt="The Street Dog App" width={300} height={300} className="w-[200px] h-[200px] object-contain" />
        <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email to receive a reset link
        </p>
      </div>

      <div className="grid gap-4 rounded-xl border bg-card p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              autoComplete="email"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <Button type="submit" size="lg" className="h-10" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Send Reset Link
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-4 hover:text-green-700"
        >
          Back to login
        </Link>
      </p>
    </div>
  );
}
