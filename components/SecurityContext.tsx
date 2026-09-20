"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { signOut, useSession } from "next-auth/react";

export interface SecuritySettingsData {
  inactivityTimeoutMinutes: number;
  warningSeconds: number;
  inactivityEnabled: boolean;
  screenPrivacyBlur: boolean;
  maskSensitiveData: boolean;
  maxSessionHours: number;
  showActivityBadge: boolean;
}

interface SecurityContextValue {
  settings: SecuritySettingsData;
  isLoading: boolean;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  isWarningOpen: boolean;
  warningCountdown: number;
  isPrivacyBlurred: boolean;
  unblurScreen: () => void;
  resetInactivityTimer: () => void;
  updateSettings: (newSettings: Partial<SecuritySettingsData>) => Promise<boolean>;
  toggleMaskSensitiveData: () => void;
  refreshSettings: () => Promise<void>;
  secondsUntilTimeout: number;
}

const DEFAULT_SETTINGS: SecuritySettingsData = {
  inactivityTimeoutMinutes: 5,
  warningSeconds: 30,
  inactivityEnabled: true,
  screenPrivacyBlur: true,
  maskSensitiveData: true,
  maxSessionHours: 8,
  showActivityBadge: true,
};

const SecurityContext = createContext<SecurityContextValue | null>(null);

const STORAGE_ACTIVE_KEY = "sneha_last_active_timestamp";
const STORAGE_SETTINGS_KEY = "sneha_security_settings_cache";

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [settings, setSettings] = useState<SecuritySettingsData>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isWarningOpen, setIsWarningOpen] = useState<boolean>(false);
  const [warningCountdown, setWarningCountdown] = useState<number>(30);
  const [secondsUntilTimeout, setSecondsUntilTimeout] = useState<number>(300);
  const [isPrivacyBlurred, setIsPrivacyBlurred] = useState<boolean>(false);

  const lastActiveRef = useRef<number>(Date.now());
  const lastSyncRef = useRef<number>(0);

  // Fetch security settings from server
  const refreshSettings = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch("/api/settings/security");
      if (res.ok) {
        const data = await res.json();
        const merged: SecuritySettingsData = {
          inactivityTimeoutMinutes: data.inactivityTimeoutMinutes ?? 5,
          warningSeconds: data.warningSeconds ?? 30,
          inactivityEnabled: data.inactivityEnabled ?? true,
          screenPrivacyBlur: data.screenPrivacyBlur ?? true,
          maskSensitiveData: data.maskSensitiveData ?? true,
          maxSessionHours: data.maxSessionHours ?? 8,
          showActivityBadge: data.showActivityBadge ?? true,
        };
        setSettings(merged);
        localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(merged));
      }
    } catch (err) {
      console.error("Failed to load security settings:", err);
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  // Load cached settings immediately on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (cached) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(cached) });
      }
    } catch {
      // Ignore JSON parse errors
    }
  }, []);

  // Sync settings when authenticated
  useEffect(() => {
    if (status === "authenticated") {
      refreshSettings();
    } else {
      setIsLoading(false);
    }
  }, [status, refreshSettings]);

  // Activity updater - resets timer and updates storage (debounced)
  const resetInactivityTimer = useCallback(() => {
    const now = Date.now();
    lastActiveRef.current = now;
    setIsWarningOpen(false);

    // Sync to localStorage every 3 seconds to avoid disk churn
    if (now - lastSyncRef.current > 3000) {
      lastSyncRef.current = now;
      try {
        localStorage.setItem(STORAGE_ACTIVE_KEY, String(now));
      } catch {
        // Storage might be unavailable
      }
    }
  }, []);

  const unblurScreen = useCallback(() => {
    setIsPrivacyBlurred(false);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // Update settings in database and state
  const updateSettings = useCallback(
    async (partial: Partial<SecuritySettingsData>) => {
      try {
        const res = await fetch("/api/settings/security", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(partial),
        });

        if (res.ok) {
          const updated = await res.json();
          const merged: SecuritySettingsData = {
            inactivityTimeoutMinutes: updated.inactivityTimeoutMinutes ?? settings.inactivityTimeoutMinutes,
            warningSeconds: updated.warningSeconds ?? settings.warningSeconds,
            inactivityEnabled: updated.inactivityEnabled ?? settings.inactivityEnabled,
            screenPrivacyBlur: updated.screenPrivacyBlur ?? settings.screenPrivacyBlur,
            maskSensitiveData: updated.maskSensitiveData ?? settings.maskSensitiveData,
            maxSessionHours: updated.maxSessionHours ?? settings.maxSessionHours,
            showActivityBadge: updated.showActivityBadge ?? settings.showActivityBadge,
          };
          setSettings(merged);
          localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(merged));
          resetInactivityTimer();
          return true;
        }
        return false;
      } catch (err) {
        console.error("Failed to update security settings:", err);
        return false;
      }
    },
    [settings, resetInactivityTimer]
  );

  const toggleMaskSensitiveData = useCallback(() => {
    const nextVal = !settings.maskSensitiveData;
    updateSettings({ maskSensitiveData: nextVal });
  }, [settings.maskSensitiveData, updateSettings]);

  // Activity listeners across browser window
  useEffect(() => {
    if (status !== "authenticated") return;

    const onActivity = () => {
      resetInactivityTimer();
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_ACTIVE_KEY && e.newValue) {
        const parsed = Number(e.newValue);
        if (parsed > lastActiveRef.current) {
          lastActiveRef.current = parsed;
          setIsWarningOpen(false);
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resetInactivityTimer();
      } else if (document.visibilityState === "hidden" && settings.screenPrivacyBlur) {
        setIsPrivacyBlurred(true);
      }
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "focus"];
    events.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Initial touch
    resetInactivityTimer();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, onActivity));
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [status, settings.screenPrivacyBlur, resetInactivityTimer]);

  // Heartbeat interval checking elapsed idle time
  useEffect(() => {
    if (status !== "authenticated") return;

    const interval = setInterval(() => {
      const now = Date.now();

      // Check cross-tab activity in localStorage
      try {
        const stored = localStorage.getItem(STORAGE_ACTIVE_KEY);
        if (stored) {
          const storedNum = Number(stored);
          if (storedNum > lastActiveRef.current) {
            lastActiveRef.current = storedNum;
          }
        }
      } catch {
        // Ignore
      }

      const idleSeconds = Math.floor((now - lastActiveRef.current) / 1000);

      // Screen privacy blur on 2 minutes of idle time
      if (settings.screenPrivacyBlur && idleSeconds >= 120 && !isPrivacyBlurred) {
        setIsPrivacyBlurred(true);
      }

      if (!settings.inactivityEnabled) {
        setIsWarningOpen(false);
        return;
      }

      const timeoutLimitSeconds = Math.max(60, settings.inactivityTimeoutMinutes * 60);
      const remainingSeconds = Math.max(0, timeoutLimitSeconds - idleSeconds);
      setSecondsUntilTimeout(remainingSeconds);

      const warningThreshold = Math.max(10, settings.warningSeconds);

      // Auto logout when timeout limit reached
      if (idleSeconds >= timeoutLimitSeconds) {
        clearInterval(interval);
        try {
          localStorage.removeItem(STORAGE_ACTIVE_KEY);
        } catch {
          // Ignore
        }
        signOut({ callbackUrl: "/?reason=inactivity" });
        return;
      }

      // Show countdown warning during warning window
      if (remainingSeconds <= warningThreshold) {
        setIsWarningOpen(true);
        setWarningCountdown(remainingSeconds);
      } else {
        setIsWarningOpen(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, settings.inactivityEnabled, settings.inactivityTimeoutMinutes, settings.warningSeconds, settings.screenPrivacyBlur, isPrivacyBlurred]);

  const value: SecurityContextValue = {
    settings,
    isLoading,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isWarningOpen,
    warningCountdown,
    isPrivacyBlurred,
    unblurScreen,
    resetInactivityTimer,
    updateSettings,
    toggleMaskSensitiveData,
    refreshSettings,
    secondsUntilTimeout,
  };

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error("useSecurity must be used within a SecurityProvider");
  }
  return context;
}
