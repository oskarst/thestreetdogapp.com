"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, CheckCircle2 } from "lucide-react";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      const msg = error.message.toLowerCase().includes("rate limit")
        ? "Too many attempts. Please try again in a few minutes."
        : error.message;
      setErrors({ form: msg });
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
          <h1 className="text-2xl font-bold tracking-tight">Check Your Email</h1>
          <p className="text-center text-sm text-muted-foreground">
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{form.email}</span>.
            Please verify your email to continue.
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
        <h1 className="text-2xl font-bold tracking-tight">Create Account</h1>
        <p className="text-sm text-muted-foreground">
          Join the Street Dog community
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
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              type="text"
              placeholder="Your nickname"
              value={form.nickname}
              onChange={(e) => update("nickname", e.target.value)}
              autoComplete="username"
            />
            {errors.nickname && (
              <p className="text-sm text-destructive">{errors.nickname}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repeat password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {errors.form && (
            <p className="text-sm text-destructive">{errors.form}</p>
          )}

          <Button type="submit" size="lg" className="h-10" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Create Account
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-4 hover:text-green-700"
        >
          Login
        </Link>
      </p>
    </div>
  );
}
