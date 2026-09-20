"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

interface LockoutStatus {
  allowed: boolean;
  isBlacklisted: boolean;
  lockedUntil?: string;
  remainingMinutes?: number;
  consecutiveFailures: number;
  lockTier: number;
  message?: string;
}

function LoginForm() {
  const isDev = process.env.NODE_ENV === "development";
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  const { status } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockoutStatus, setLockoutStatus] = useState<LockoutStatus | null>(null);

  const [seedKey, setSeedKey] = useState("");
  const [seedUsername, setSeedUsername] = useState("admin");
  const [seedPassword, setSeedPassword] = useState("admin123");
  const [seedMessage, setSeedMessage] = useState("");
  const [seedLoading, setSeedLoading] = useState(false);

  // Check IP lockout/blacklist status on load
  async function checkStatus() {
    try {
      const res = await fetch("/api/auth/status");
      if (res.ok) {
        const data: LockoutStatus = await res.json();
        setLockoutStatus(data);
        if (!data.allowed && data.message) {
          setError(data.message);
        }
      }
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    checkStatus();
  }, []);

  // Redirect callback keeps authenticated users out of the public login page.
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/admin");
    }
  }, [status, router]);

  // Submits credential login and routes authenticated users to the admin workspace.
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (lockoutStatus && !lockoutStatus.allowed) {
      setError(lockoutStatus.message || "Login temporarily locked.");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      redirect: false,
      username,
      password,
    });

    if (result?.ok) {
      router.push("/admin");
    } else {
      // Refresh lockout status to get exact remaining attempts or lockout tier
      try {
        const res = await fetch("/api/auth/status");
        if (res.ok) {
          const updated: LockoutStatus = await res.json();
          setLockoutStatus(updated);
          setError(
            updated.message ||
              result?.error ||
              "Login failed. Check username and password."
          );
        } else {
          setError("Login failed. Check username and password.");
        }
      } catch {
        setError("Login failed. Check username and password.");
      }
    }

    setLoading(false);
  }

  // Creates an initial local admin in development using the protected seed endpoint.
  async function onSeedAdmin(e: FormEvent) {
    e.preventDefault();
    setSeedMessage("");
    setSeedLoading(true);

    try {
      const response = await fetch("/api/dev/seed-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-seed-key": seedKey,
        },
        body: JSON.stringify({
          username: seedUsername,
          password: seedPassword,
        }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Failed to initialize admin");
      }

      setSeedMessage(payload.message || "Admin initialized");
      setUsername(seedUsername);
      setPassword(seedPassword);
    } catch (err) {
      setSeedMessage(err instanceof Error ? err.message : "Failed to initialize admin");
    } finally {
      setSeedLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl border border-teal-100 bg-white/95 p-8 shadow-xl shadow-teal-900/10 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Sneha Medicare Database
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Admin Login</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to access customer records and policy operations.
        </p>

        {/* Security Alert: Inactivity Timeout */}
        {reason === "inactivity" && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-900">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <span className="font-bold">Inactivity Auto-Logout:</span> Your session expired after 5 minutes of inactivity for security. Please sign in again.
            </div>
          </div>
        )}

        {/* Security Alert: Active Lockout / Blacklist */}
        {lockoutStatus && !lockoutStatus.allowed && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <div>
              <span className="font-bold">
                {lockoutStatus.isBlacklisted ? "Access Denied:" : "Account Locked:"}
              </span>{" "}
              {lockoutStatus.message}
            </div>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              id="username"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-teal-500 focus:bg-white"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={Boolean(lockoutStatus?.isBlacklisted)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-teal-500 focus:bg-white"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={Boolean(lockoutStatus?.isBlacklisted)}
              required
            />
          </div>
          <button
            disabled={Boolean(
              loading ||
                lockoutStatus?.isBlacklisted ||
                (lockoutStatus && !lockoutStatus.allowed)
            )}
            className="w-full rounded-xl bg-teal-700 px-4 py-2.5 font-medium text-white transition hover:bg-teal-800 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        {error && !lockoutStatus?.isBlacklisted ? (
          <p className="mt-4 rounded-xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-800">
            {error}
          </p>
        ) : null}

        {isDev ? (
          <details className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">
              Initialize Admin (Dev Only)
            </summary>
            <form className="mt-4 space-y-3" onSubmit={onSeedAdmin}>
              <div className="space-y-1.5">
                <label htmlFor="seed-key" className="text-xs font-medium text-slate-700">
                  Seed Key
                </label>
                <input
                  id="seed-key"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-teal-500"
                  placeholder="SEED_ADMIN_KEY from .env"
                  value={seedKey}
                  onChange={(e) => setSeedKey(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="seed-username" className="text-xs font-medium text-slate-700">
                    Admin Username
                  </label>
                  <input
                    id="seed-username"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-teal-500"
                    value={seedUsername}
                    onChange={(e) => setSeedUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="seed-password" className="text-xs font-medium text-slate-700">
                    Admin Password
                  </label>
                  <input
                    id="seed-password"
                    type="password"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-teal-500"
                    value={seedPassword}
                    onChange={(e) => setSeedPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button
                disabled={seedLoading}
                className="w-full rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
              >
                {seedLoading ? "Initializing..." : "Initialize Admin"}
              </button>
              {seedMessage ? (
                <p className="rounded-xl bg-cyan-100 px-3 py-2 text-sm text-cyan-800">{seedMessage}</p>
              ) : null}
            </form>
          </details>
        ) : null}
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center text-slate-600">Loading...</main>}>
      <LoginForm />
    </Suspense>
  );
}
