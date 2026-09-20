"use client";

import { SessionProvider } from "next-auth/react";
import { SecurityProvider } from "@/components/SecurityContext";
import SessionTimeoutWarningModal from "@/components/SessionTimeoutWarningModal";
import SecuritySettingsModal from "@/components/SecuritySettingsModal";

// Session provider is required so client components can read auth state via useSession.
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SecurityProvider>
        {children}
        <SessionTimeoutWarningModal />
        <SecuritySettingsModal />
      </SecurityProvider>
    </SessionProvider>
  );
}

