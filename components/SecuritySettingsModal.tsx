"use client";

import React, { useEffect, useState } from "react";
import { useSecurity } from "./SecurityContext";

interface LockoutRecord {
  _id: string;
  ip: string;
  username?: string;
  consecutiveFailures: number;
  lockedUntil?: string | null;
  lockTier: number;
  isBlacklisted: boolean;
  blacklistReason?: string;
  lastAttemptAt: string;
}

interface AuditLogRecord {
  _id: string;
  ip: string;
  username: string;
  status: "SUCCESS" | "FAILED" | "LOCKED" | "BLACKLISTED" | "PASSWORD_CHANGED";
  userAgent?: string;
  details?: string;
  timestamp: string;
}

export default function SecuritySettingsModal() {
  const {
    settings,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    updateSettings,
  } = useSecurity();

  const [activeTab, setActiveTab] = useState<
    "session" | "privacy" | "brute-force" | "password" | "audit"
  >("session");

  // Form states for Session tab
  const [inactivityMinutes, setInactivityMinutes] = useState<number>(settings.inactivityTimeoutMinutes);
  const [warningSecs, setWarningSecs] = useState<number>(settings.warningSeconds);
  const [inactivityEnabled, setInactivityEnabled] = useState<boolean>(settings.inactivityEnabled);
  const [showBadge, setShowBadge] = useState<boolean>(settings.showActivityBadge);
  const [saveSuccess, setSaveSuccess] = useState<string>("");
  const [saveError, setSaveError] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form states for Privacy tab
  const [screenPrivacyBlur, setScreenPrivacyBlur] = useState<boolean>(settings.screenPrivacyBlur);
  const [maskSensitiveData, setMaskSensitiveData] = useState<boolean>(settings.maskSensitiveData);

  // States for Brute Force tab
  const [lockoutRecords, setLockoutRecords] = useState<LockoutRecord[]>([]);
  const [lockoutLoading, setLockoutLoading] = useState<boolean>(false);
  const [manualIp, setManualIp] = useState<string>("");
  const [manualReason, setManualReason] = useState<string>("");
  const [defenseMessage, setDefenseMessage] = useState<string>("");

  // States for Change Password tab
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [pwdLoading, setPwdLoading] = useState<boolean>(false);
  const [pwdMessage, setPwdMessage] = useState<string>("");
  const [pwdError, setPwdError] = useState<string>("");

  // States for Audit Log tab
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);

  // Sync state whenever settings change
  useEffect(() => {
    setInactivityMinutes(settings.inactivityTimeoutMinutes);
    setWarningSecs(settings.warningSeconds);
    setInactivityEnabled(settings.inactivityEnabled);
    setShowBadge(settings.showActivityBadge);
    setScreenPrivacyBlur(settings.screenPrivacyBlur);
    setMaskSensitiveData(settings.maskSensitiveData);
  }, [settings]);

  // Load tab-specific data when tab changes
  useEffect(() => {
    if (!isSettingsModalOpen) return;

    if (activeTab === "brute-force") {
      fetchLockoutRecords();
    } else if (activeTab === "audit") {
      fetchAuditLogs();
    }
  }, [activeTab, isSettingsModalOpen]);

  async function fetchLockoutRecords() {
    setLockoutLoading(true);
    try {
      const res = await fetch("/api/settings/security/blacklist");
      if (res.ok) {
        const data = await res.json();
        setLockoutRecords(data);
      }
    } catch {
      // Ignore
    } finally {
      setLockoutLoading(false);
    }
  }

  async function fetchAuditLogs() {
    setAuditLoading(true);
    try {
      const res = await fetch("/api/settings/security/audit-logs");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch {
      // Ignore
    } finally {
      setAuditLoading(false);
    }
  }

  async function handleSaveSessionSettings() {
    setIsSaving(true);
    setSaveSuccess("");
    setSaveError("");

    const ok = await updateSettings({
      inactivityTimeoutMinutes: inactivityMinutes,
      warningSeconds: warningSecs,
      inactivityEnabled,
      showActivityBadge: showBadge,
      screenPrivacyBlur,
      maskSensitiveData,
    });

    setIsSaving(false);
    if (ok) {
      setSaveSuccess("Security settings saved successfully.");
      setTimeout(() => setSaveSuccess(""), 4000);
    } else {
      setSaveError("Failed to save settings. Please try again.");
    }
  }

  async function handleResetDefaults() {
    setInactivityMinutes(5);
    setWarningSecs(30);
    setInactivityEnabled(true);
    setShowBadge(true);
    setScreenPrivacyBlur(true);
    setMaskSensitiveData(true);

    setIsSaving(true);
    const ok = await updateSettings({
      inactivityTimeoutMinutes: 5,
      warningSeconds: 30,
      inactivityEnabled: true,
      showActivityBadge: true,
      screenPrivacyBlur: true,
      maskSensitiveData: true,
    });
    setIsSaving(false);

    if (ok) {
      setSaveSuccess("Reset to recommended 5-minute security baseline.");
      setTimeout(() => setSaveSuccess(""), 4000);
    }
  }

  async function handleUnblockIp(ip: string) {
    try {
      const res = await fetch("/api/settings/security/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unblock", ip }),
      });
      const data = await res.json();
      if (res.ok) {
        setDefenseMessage(data.message || `IP ${ip} unblocked.`);
        fetchLockoutRecords();
        setTimeout(() => setDefenseMessage(""), 4000);
      }
    } catch {
      setDefenseMessage("Failed to unblock IP.");
    }
  }

  async function handleManualBlacklist(e: React.FormEvent) {
    e.preventDefault();
    if (!manualIp.trim()) return;

    try {
      const res = await fetch("/api/settings/security/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "blacklist",
          ip: manualIp.trim(),
          reason: manualReason.trim() || "Manually blacklisted",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDefenseMessage(data.message || `IP ${manualIp} blacklisted.`);
        setManualIp("");
        setManualReason("");
        fetchLockoutRecords();
        setTimeout(() => setDefenseMessage(""), 4000);
      }
    } catch {
      setDefenseMessage("Failed to blacklist IP.");
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMessage("");
    setPwdError("");

    if (newPassword !== confirmPassword) {
      setPwdError("New password and confirmation do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPwdError("New password must be at least 8 characters.");
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch("/api/settings/security/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwdMessage("Admin password updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPwdError(data.message || "Failed to update password.");
      }
    } catch {
      setPwdError("Network error changing password.");
    } finally {
      setPwdLoading(false);
    }
  }

  if (!isSettingsModalOpen) return null;

  // Password requirements check
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasLength = newPassword.length >= 8;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Security Center & Settings</h2>
              <p className="text-xs text-slate-500">Configure timeout, access defense, and account security</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Tab Navigation */}
        <nav className="flex flex-wrap border-b border-slate-100 bg-slate-50/40 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("session")}
            className={`border-b-2 px-3.5 py-2.5 text-xs font-semibold transition ${
              activeTab === "session"
                ? "border-teal-700 text-teal-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Session & Timeout
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("privacy")}
            className={`border-b-2 px-3.5 py-2.5 text-xs font-semibold transition ${
              activeTab === "privacy"
                ? "border-teal-700 text-teal-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Screen Privacy & Data
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("brute-force")}
            className={`border-b-2 px-3.5 py-2.5 text-xs font-semibold transition ${
              activeTab === "brute-force"
                ? "border-teal-700 text-teal-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Brute Force & Defense
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("password")}
            className={`border-b-2 px-3.5 py-2.5 text-xs font-semibold transition ${
              activeTab === "password"
                ? "border-teal-700 text-teal-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Change Password
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`border-b-2 px-3.5 py-2.5 text-xs font-semibold transition ${
              activeTab === "audit"
                ? "border-teal-700 text-teal-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Audit Logs
          </button>
        </nav>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 text-slate-800">
          {/* TAB 1: SESSION & TIMEOUT */}
          {activeTab === "session" && (
            <div className="space-y-6">
              {/* Inactivity Toggle */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Inactivity Auto-Logout</h4>
                  <p className="text-xs text-slate-500">
                    Automatically sign out the user after period of no mouse or keyboard activity.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={inactivityEnabled}
                    onChange={(e) => setInactivityEnabled(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-teal-700 peer-checked:after:translate-x-full peer-focus:outline-none" />
                </label>
              </div>

              {/* Inactivity Duration Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Inactivity Timeout Duration
                </label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {[2, 5, 10, 15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setInactivityMinutes(mins)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        inactivityMinutes === mins
                          ? "border-teal-700 bg-teal-50 text-teal-900 ring-2 ring-teal-600"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {mins} min{mins === 5 ? " (Default)" : ""}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Or custom:</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={inactivityMinutes}
                    onChange={(e) => setInactivityMinutes(Math.max(1, Number(e.target.value) || 1))}
                    className="w-20 rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                  />
                  <span className="text-xs text-slate-500">minutes</span>
                </div>
              </div>

              {/* Warning Countdown Period */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Warning Notice Duration
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 60].map((secs) => (
                    <button
                      key={secs}
                      type="button"
                      onClick={() => setWarningSecs(secs)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        warningSecs === secs
                          ? "border-teal-700 bg-teal-50 text-teal-900 ring-2 ring-teal-600"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {secs} seconds{secs === 30 ? " (Default)" : ""}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setWarningSecs(0)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      warningSecs === 0
                        ? "border-teal-700 bg-teal-50 text-teal-900 ring-2 ring-teal-600"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    No warning
                  </button>
                </div>
              </div>

              {/* Status Badge in Header */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Show Session Activity Badge in Header</h4>
                  <p className="text-xs text-slate-500">
                    Displays live countdown indicator in the control panel navigation bar.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={showBadge}
                    onChange={(e) => setShowBadge(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-teal-700 peer-checked:after:translate-x-full peer-focus:outline-none" />
                </label>
              </div>

              {/* Max Session Duration Info */}
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4 text-xs text-cyan-900">
                <span className="font-semibold">Maximum Session Lifetime:</span> 8 Hours absolute limit. Regardless of activity, sessions expire every 8 hours requiring fresh credential verification.
              </div>

              {/* Feedback messages */}
              {saveSuccess && (
                <div className="rounded-xl bg-teal-50 p-3 text-xs font-semibold text-teal-800">
                  {saveSuccess}
                </div>
              )}
              {saveError && (
                <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                  {saveError}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  disabled={isSaving}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Reset to 5-Min Defaults
                </button>
                <button
                  type="button"
                  onClick={handleSaveSessionSettings}
                  disabled={isSaving}
                  className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PRIVACY & DATA */}
          {activeTab === "privacy" && (
            <div className="space-y-6">
              {/* Screen Privacy Blur */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="pr-4">
                  <h4 className="text-sm font-semibold text-slate-900">Anti-Shoulder Surfing (Privacy Blur)</h4>
                  <p className="text-xs text-slate-500">
                    Automatically blurs sensitive customer records when switching to another browser tab or when idle for 2 minutes. Click overlay to instantly unmask.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={screenPrivacyBlur}
                    onChange={(e) => setScreenPrivacyBlur(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-teal-700 peer-checked:after:translate-x-full peer-focus:outline-none" />
                </label>
              </div>

              {/* Sensitive Data Masking */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="pr-4">
                  <h4 className="text-sm font-semibold text-slate-900">Mask Sensitive Data in Database</h4>
                  <p className="text-xs text-slate-500">
                    Partially masks mobile numbers and customer codes in the database table (e.g., 98****3210). Hover or click to reveal individual values.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={maskSensitiveData}
                    onChange={(e) => setMaskSensitiveData(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-teal-700 peer-checked:after:translate-x-full peer-focus:outline-none" />
                </label>
              </div>

              {saveSuccess && (
                <div className="rounded-xl bg-teal-50 p-3 text-xs font-semibold text-teal-800">
                  {saveSuccess}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveSessionSettings}
                  disabled={isSaving}
                  className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Privacy Settings"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: BRUTE FORCE & DEFENSE */}
          {activeTab === "brute-force" && (
            <div className="space-y-6">
              {/* Progressive Policy Cards */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Configured Escalating Lockout Policy
                </h4>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Tier 1</span>
                    <p className="mt-1 text-sm font-bold text-slate-900">3 Failures</p>
                    <p className="text-xs text-amber-700">15-Minute Lock</p>
                  </div>
                  <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800">Tier 2 (+2 fails)</span>
                    <p className="mt-1 text-sm font-bold text-slate-900">5 Failures</p>
                    <p className="text-xs text-orange-700">2-Hour Lock</p>
                  </div>
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Tier 3 (+1 fail)</span>
                    <p className="mt-1 text-sm font-bold text-slate-900">6 Failures</p>
                    <p className="text-xs text-rose-700">24-Hour (1 Day) Lock</p>
                  </div>
                  <div className="rounded-2xl border border-red-300 bg-red-100/70 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-900">Tier 4 (+1 fail)</span>
                    <p className="mt-1 text-sm font-bold text-slate-900">7 Failures</p>
                    <p className="text-xs font-semibold text-red-800">Permanent IP Blacklist</p>
                  </div>
                </div>
              </div>

              {defenseMessage && (
                <div className="rounded-xl bg-teal-50 p-3 text-xs font-semibold text-teal-800">
                  {defenseMessage}
                </div>
              )}

              {/* Locked / Blacklisted Records Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Active Lockouts & Blacklisted IPs
                  </h4>
                  <button
                    type="button"
                    onClick={fetchLockoutRecords}
                    className="text-xs font-semibold text-teal-700 hover:underline"
                  >
                    Refresh List
                  </button>
                </div>

                {lockoutLoading ? (
                  <p className="text-xs text-slate-500">Loading lockouts...</p>
                ) : lockoutRecords.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                    No active lockouts or blacklisted IPs. System is secure.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="p-3">IP Address</th>
                          <th className="p-3">Failures</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Expires / Reason</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lockoutRecords.map((r) => (
                          <tr key={r._id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono font-medium">{r.ip}</td>
                            <td className="p-3">{r.consecutiveFailures}</td>
                            <td className="p-3">
                              {r.isBlacklisted ? (
                                <span className="rounded-md bg-rose-100 px-2 py-0.5 font-bold text-rose-800">
                                  BLACKLISTED
                                </span>
                              ) : (
                                <span className="rounded-md bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
                                  LOCKED (Tier {r.lockTier})
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-600">
                              {r.isBlacklisted
                                ? r.blacklistReason || "Automated threshold"
                                : r.lockedUntil
                                ? new Date(r.lockedUntil).toLocaleTimeString()
                                : "-"}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleUnblockIp(r.ip)}
                                className="rounded-lg bg-teal-700 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-teal-800"
                              >
                                Unblock
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Manual IP Blacklist Form */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Manually Blacklist an IP
                </h5>
                <form onSubmit={handleManualBlacklist} className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    placeholder="e.g. 192.168.1.100"
                    value={manualIp}
                    onChange={(e) => setManualIp(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Reason (optional)"
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-rose-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-800"
                  >
                    Block IP
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: CHANGE PASSWORD */}
          {activeTab === "password" && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                  placeholder="Enter current admin password"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                  placeholder="Minimum 8 characters"
                  required
                />
              </div>

              {/* Password Requirements Checklist */}
              {newPassword && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                  <div className="font-semibold text-slate-700">Security Criteria:</div>
                  <div className={hasLength ? "text-teal-700" : "text-slate-400"}>
                    {hasLength ? "✓" : "○"} At least 8 characters
                  </div>
                  <div className={hasUpper ? "text-teal-700" : "text-slate-400"}>
                    {hasUpper ? "✓" : "○"} Contains an uppercase letter
                  </div>
                  <div className={hasLower ? "text-teal-700" : "text-slate-400"}>
                    {hasLower ? "✓" : "○"} Contains a lowercase letter
                  </div>
                  <div className={hasNumber ? "text-teal-700" : "text-slate-400"}>
                    {hasNumber ? "✓" : "○"} Contains a number
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                  placeholder="Repeat new password"
                  required
                />
              </div>

              {pwdMessage && (
                <div className="rounded-xl bg-teal-50 p-3 text-xs font-semibold text-teal-800">
                  {pwdMessage}
                </div>
              )}
              {pwdError && (
                <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                  {pwdError}
                </div>
              )}

              <button
                type="submit"
                disabled={pwdLoading}
                className="w-full rounded-xl bg-teal-700 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-50"
              >
                {pwdLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          {/* TAB 5: AUDIT LOGS */}
          {activeTab === "audit" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Recent login attempts, lockout events, and security adjustments
                </span>
                <button
                  type="button"
                  onClick={fetchAuditLogs}
                  className="text-xs font-semibold text-teal-700 hover:underline"
                >
                  Refresh Logs
                </button>
              </div>

              {auditLoading ? (
                <p className="text-xs text-slate-500">Loading audit history...</p>
              ) : auditLogs.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                  No audit logs recorded yet.
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 text-slate-700">
                      <tr>
                        <th className="p-3">Time</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Username</th>
                        <th className="p-3">IP Address</th>
                        <th className="p-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map((log) => {
                        let statusBadge = "bg-slate-100 text-slate-700";
                        if (log.status === "SUCCESS") statusBadge = "bg-emerald-100 text-emerald-800";
                        if (log.status === "FAILED") statusBadge = "bg-amber-100 text-amber-800";
                        if (log.status === "LOCKED") statusBadge = "bg-rose-100 text-rose-800 font-bold";
                        if (log.status === "BLACKLISTED") statusBadge = "bg-red-200 text-red-900 font-bold";
                        if (log.status === "PASSWORD_CHANGED") statusBadge = "bg-purple-100 text-purple-800";

                        return (
                          <tr key={log._id} className="hover:bg-slate-50/50">
                            <td className="p-3 text-slate-500">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="p-3">
                              <span className={`rounded-md px-2 py-0.5 text-[10px] ${statusBadge}`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="p-3 font-medium text-slate-900">{log.username || "-"}</td>
                            <td className="p-3 font-mono text-slate-600">{log.ip}</td>
                            <td className="p-3 text-slate-600">{log.details || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
