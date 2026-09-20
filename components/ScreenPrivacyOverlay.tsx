"use client";

import React from "react";
import { useSecurity } from "./SecurityContext";

export default function ScreenPrivacyOverlay({ children }: { children: React.ReactNode }) {
  const { isPrivacyBlurred, unblurScreen, settings } = useSecurity();

  if (!settings.screenPrivacyBlur || !isPrivacyBlurred) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="pointer-events-none select-none filter blur-md transition duration-300">
        {children}
      </div>
      <div
        onClick={unblurScreen}
        className="fixed inset-0 z-40 flex cursor-pointer items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md"
      >
        <div className="max-w-sm rounded-3xl border border-white/20 bg-white/95 p-6 text-center shadow-2xl backdrop-blur">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-800">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
              />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900">Privacy Shield Active</h3>
          <p className="mt-1 text-xs text-slate-600">
            Records are hidden to prevent shoulder surfing.
          </p>
          <button
            type="button"
            onClick={unblurScreen}
            className="mt-4 w-full rounded-xl bg-teal-700 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-800"
          >
            Click to Unmask Screen
          </button>
        </div>
      </div>
    </div>
  );
}
