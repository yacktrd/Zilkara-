"use client";

/* ============================================================================
 * FILE: app/register/page.tsx
 * ========================================================================== */

import React, { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type SignupResponse = {
  ok: boolean;
  error: string | null;
  warnings?: string[];
};

/* ============================================================================
 * 2. PAGE
 * ========================================================================== */

export default function RegisterPage() {
  const router = useRouter();
  const auth = useAuth();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 0 &&
      password.length >= 10 &&
      termsAccepted &&
      privacyAccepted &&
      !loading
    );
  }, [email, password, termsAccepted, privacyAccepted, loading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setError("Please complete all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/account/signup", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          display_name: displayName.trim() || null,
          terms_accepted: termsAccepted,
          privacy_accepted: privacyAccepted,
        }),
      });

      const payload = (await response.json()) as SignupResponse;

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "signup_failed");
        return;
      }

      await auth.refresh();

      router.push("/account");
      router.refresh();
    } catch {
      setError("signup_failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
        <div className="mb-8">
          <p className="mb-2 text-sm uppercase tracking-[0.3em] text-white/40">
            Xyvala Account
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Create account
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/55">
            Create your Xyvala account to access your private workspace, plan and
            future API access.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-white/70">
              Email
            </label>

            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
              placeholder="you@domain.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/70">
              Display name
            </label>

            <input
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/70">
              Password
            </label>

            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
              placeholder="Minimum 10 characters"
            />

            <p className="mt-2 text-xs text-white/35">
              Minimum 10 characters.
            </p>
          </div>

          <label className="flex items-start gap-3 text-sm text-white/55">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              className="mt-1"
            />
            <span>I accept the Xyvala terms of service.</span>
          </label>

          <label className="flex items-start gap-3 text-sm text-white/55">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(event) => setPrivacyAccepted(event.target.checked)}
              className="mt-1"
            />
            <span>I accept the Xyvala privacy policy.</span>
          </label>

          {error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/45">
          Already have an account?{" "}
          <a href="/login" className="text-white underline underline-offset-4">
            Sign in
          </a>
        </p>
      </section>
    </main>
  );
}
