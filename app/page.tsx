"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const isDev = process.env.NODE_ENV === "development";
  const router = useRouter();
  const { status } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seedKey, setSeedKey] = useState("");
  const [seedUsername, setSeedUsername] = useState("admin");
  const [seedPassword, setSeedPassword] = useState("admin123");
  const [seedMessage, setSeedMessage] = useState("");
  const [seedLoading, setSeedLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/admin");
    }
  }, [status, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      redirect: false,
      username,
      password,
    });

    if (result?.ok) {
      router.push("/admin");
    } else {
      setError("Login failed. Check username and password.");
    }

    setLoading(false);
  }

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
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Insurance Workspace</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Admin Login</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to access customer records and policy operations.</p>

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
              required
            />
          </div>
          <button
            disabled={loading}
            className="w-full rounded-xl bg-teal-700 px-4 py-2.5 font-medium text-white transition hover:bg-teal-800 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        {error ? <p className="mt-4 rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

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
