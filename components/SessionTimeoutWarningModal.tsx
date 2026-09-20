"use client";

import React from "react";
import { signOut } from "next-auth/react";
import { useSecurity } from "./SecurityContext";

export default function SessionTimeoutWarningModal() {
  const { isWarningOpen, warningCountdown, settings, resetInactivityTimer } = useSecurity();

  if (!isWarningOpen) return null;

  const totalWarning = Math.max(10, settings.warningSeconds);
  const progressPercent = Math.min(100, Math.max(0, (warningCountdown / totalWarning) * 100));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-warning-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-200 bg-white p-6 shadow-2xl shadow-amber-950/20 md:p-8">
        {/* Amber top alert bar */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-amber-500">
          <div
            className="h-full bg-rose-500 transition-all duration-1000 ease-linear"
            style={{ width: `${100 - progressPercent}%` }}
          />
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 ring-8 ring-amber-50">
            <svg
              className="h-7 w-7 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h3 id="session-warning-title" className="text-xl font-bold text-slate-900">
            Inactivity Timeout Warning
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            For security, your session is about to expire due to inactivity.
          </p>

          {/* Countdown Display */}
          <div className="my-6 flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50/80 px-6 py-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Auto-logout in
            </span>
            <span className="mt-1 font-mono text-4xl font-extrabold text-amber-700">
              {warningCountdown}s
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex w-full flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={resetInactivityTimer}
              className="flex-1 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 active:scale-[0.98]"
            >
              Stay Logged In
            </button>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
