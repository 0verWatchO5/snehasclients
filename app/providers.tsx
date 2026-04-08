"use client";

import { SessionProvider } from "next-auth/react";

// Session provider is required so client components can read auth state via useSession.
export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
