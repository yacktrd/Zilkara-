"use client";

/* ============================================================================
 * FILE: components/auth/auth-provider.tsx
 * ========================================================================== */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  PublicAccount,
  PublicAccountSession,
} from "@/lib/xyvala/accounts/account-contract";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type AccountMeResponse = {
  ok: boolean;
  account: PublicAccount | null;
  session: PublicAccountSession | null;
  warnings: string[];
  error: string | null;
};

export type AuthState = {
  account: PublicAccount | null;
  session: PublicAccountSession | null;

  loading: boolean;
  authenticated: boolean;

  warnings: string[];
  error: string | null;
};

export type AuthContextValue = AuthState & {
  refresh: () => Promise<void>;
  clear: () => void;
};

type AuthProviderProps = {
  children: ReactNode;
};

/* ============================================================================
 * 2. CONTEXT
 * ========================================================================== */

const AuthContext = createContext<AuthContextValue | null>(null);

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function normalizeWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      ),
    ),
  ];
}

function emptyAuthState(): AuthState {
  return {
    account: null,
    session: null,

    loading: false,
    authenticated: false,

    warnings: [],
    error: null,
  };
}

function responseToAuthState(payload: AccountMeResponse): AuthState {
  if (!payload.ok || !payload.account || !payload.session) {
    return {
      account: null,
      session: null,

      loading: false,
      authenticated: false,

      warnings: normalizeWarnings(payload.warnings),
      error: payload.error ?? "account_session_unavailable",
    };
  }

  return {
    account: payload.account,
    session: payload.session,

    loading: false,
    authenticated: true,

    warnings: normalizeWarnings(payload.warnings),
    error: null,
  };
}

/* ============================================================================
 * 4. PROVIDER
 * ========================================================================== */

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(() => ({
    ...emptyAuthState(),
    loading: true,
  }));

  const clear = useCallback(() => {
    setState(emptyAuthState());
  }, []);

  const refresh = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const response = await fetch("/api/account/me", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: {
          accept: "application/json",
        },
      });

      const payload = (await response.json()) as AccountMeResponse;

      setState(responseToAuthState(payload));
    } catch {
      setState({
        ...emptyAuthState(),
        warnings: ["auth_provider_refresh_failed"],
        error: "auth_provider_refresh_failed",
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      refresh,
      clear,
    }),
    [state, refresh, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ============================================================================
 * 5. HOOK
 * ========================================================================== */

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
