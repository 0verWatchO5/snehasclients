"use client";

import React from "react";
import { useSecurity } from "./SecurityContext";

export default function SecurityHeaderBadge() {
  const { settings, setIsSettingsModalOpen, secondsUntilTimeout } = useSecurity();

  const minutesRemaining = Math.ceil(secondsUntilTimeout / 60);

  return (
    <button
      type="button"
      onClick={() => setIsSettingsModalOpen(true)}
      title="Open Security Settings & Defense Center"
      className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50/80 px-3 py-2 text-xs font-semibold text-teal-900 transition hover:border-teal-300 hover:bg-teal-100/90 active:scale-[0.98]"
    >
      <svg className="h-4 w-4 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
      <span>Security</span>
      {settings.showActivityBadge && settings.inactivityEnabled && (
        <span className="ml-1 rounded-md bg-teal-200/80 px-1.5 py-0.5 text-[10px] font-bold text-teal-800">
          {minutesRemaining}m idle
        </span>
      )}
    </button>
  );
}
