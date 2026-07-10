"use client";

/* ============================================================================
 * FILE: app/login/page.tsx
 * ========================================================================== */

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type LoginResponse = {
  ok: boolean;
  error: string | null;
  warnings?: string[];
};

/* ============================================================================
 * 2. PAGE
 * ========================================================================== */

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/account/login", {
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
        }),
      });

      const payload = (await response.json()) as LoginResponse;

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "login_failed");
        return;
      }

      await auth.refresh();

      router.push("/account");
      router.refresh();
    } catch {
      setError("login_failed");
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
            Sign in
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/55">
            Access your Xyvala account, API access and private workspace.
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
              Password
            </label>

            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
              placeholder="••••••••••"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/45">
          No account yet?{" "}
          <a href="/register" className="text-white underline underline-offset-4">
            Create one
          </a>
        </p>
      </section>
    </main>
  );
}
