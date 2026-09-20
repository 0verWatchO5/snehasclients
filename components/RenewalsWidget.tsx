"use client";

import React, { useEffect, useState } from "react";
import { useSecurity } from "./SecurityContext";

export interface RenewalCustomer {
  _id?: string;
  policyHolderName: { first: string; mid?: string; surname: string };
  age: number;
  mobileNumber: string;
  policyNumber: string;
  policyNames: string;
  premiumAmount: number;
  provider: "STAR" | "LIC";
  customerCode: string;
  premiumMode: "M" | "Q" | "A" | "L";
  startDate: string;
  endDate: string;
  daysRemaining: number;
}

interface RenewalMetrics {
  expired: number;
  due15: number;
  due30: number;
  due60: number;
  totalPremiumDue: number;
}

interface RenewalsWidgetProps {
  onEditCustomer?: (customer: RenewalCustomer) => void;
}

export default function RenewalsWidget({ onEditCustomer }: RenewalsWidgetProps) {
  const { settings } = useSecurity();
  const [filter, setFilter] = useState<"15" | "30" | "60" | "expired">("30");
  const [records, setRecords] = useState<RenewalCustomer[]>([]);
  const [metrics, setMetrics] = useState<RenewalMetrics>({
    expired: 0,
    due15: 0,
    due30: 0,
    due60: 0,
    totalPremiumDue: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchRenewals(filter);
  }, [filter]);

  async function fetchRenewals(days: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/renewals?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      }
    } catch (err) {
      console.error("Failed to load renewals:", err);
    } finally {
      setLoading(false);
    }
  }

  function maskValue(val: string | undefined, id: string | undefined) {
    if (!val) return "-";
    const key = (id || "") + val;
    if (!settings.maskSensitiveData || revealedIds[key] || val.length < 4) return val;
    return val.slice(0, 2) + "••••" + val.slice(-2);
  }

  function toggleReveal(id: string | undefined, val: string | undefined) {
    const key = (id || "") + (val || "");
    setRevealedIds((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function formatWhatsAppText(customer: RenewalCustomer) {
    const name = customer.policyHolderName?.first || "Valued Client";
    const provider = customer.provider || "Health Insurance";
    const policyNo = customer.policyNumber || "";
    const plan = customer.policyNames ? ` (${customer.policyNames})` : "";
    const premium = customer.premiumAmount ? `Rs. ${customer.premiumAmount.toLocaleString("en-IN")}` : "";
    const date = customer.endDate ? new Date(customer.endDate).toLocaleDateString() : "";

    return `Dear ${name},\n\nThis is a gentle reminder from Sneha Medicare that your ${provider} policy #${policyNo}${plan} with premium of ${premium} is due for renewal on ${date}.\n\nPlease renew on time to ensure uninterrupted coverage and medical benefits.\n\nThank you,\nSneha Medicare`;
  }

  function getWhatsAppUrl(customer: RenewalCustomer) {
    let phone = (customer.mobileNumber || "").replace(/\D/g, "");
    if (phone.length === 10) phone = "91" + phone;
    const text = formatWhatsAppText(customer);
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  async function handleCopyText(customer: RenewalCustomer) {
    const text = formatWhatsAppText(customer);
    try {
      await navigator.clipboard.writeText(text);
      const id = customer._id || customer.policyNumber;
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // Fallback
    }
  }

  return (
    <section className="rounded-3xl border border-teal-100 bg-white/95 p-6 shadow-sm">
      {/* Widget Header & Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </span>
            <h2 className="text-lg font-bold text-slate-900">Policy Expiry & Renewal Alerts</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Track upcoming policy expirations and send instant renewal reminders to clients.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-1">
          <button
            type="button"
            onClick={() => setFilter("15")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              filter === "15"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Due in 15d ({metrics.due15})
          </button>
          <button
            type="button"
            onClick={() => setFilter("30")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              filter === "30"
                ? "bg-teal-700 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Due in 30d ({metrics.due30})
          </button>
          <button
            type="button"
            onClick={() => setFilter("60")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              filter === "60"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Due in 60d ({metrics.due60})
          </button>
          <button
            type="button"
            onClick={() => setFilter("expired")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              filter === "expired"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-rose-700 hover:bg-rose-50"
            }`}
          >
            Overdue ({metrics.expired})
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          onClick={() => setFilter("expired")}
          className="cursor-pointer rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 transition hover:shadow-md"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Overdue Expirations</span>
          <p className="mt-1 text-2xl font-black text-rose-900">{metrics.expired}</p>
          <span className="text-[11px] text-rose-700">Immediate action needed</span>
        </div>

        <div
          onClick={() => setFilter("15")}
          className="cursor-pointer rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 transition hover:shadow-md"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Due in 15 Days</span>
          <p className="mt-1 text-2xl font-black text-amber-900">{metrics.due15}</p>
          <span className="text-[11px] text-amber-700">High priority follow-ups</span>
        </div>

        <div
          onClick={() => setFilter("30")}
          className="cursor-pointer rounded-2xl border border-teal-200 bg-teal-50/70 p-3.5 transition hover:shadow-md"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">Due in 30 Days</span>
          <p className="mt-1 text-2xl font-black text-teal-900">{metrics.due30}</p>
          <span className="text-[11px] text-teal-700">Monthly renewal pipeline</span>
        </div>

        <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800">Filtered Premium Due</span>
          <p className="mt-1 text-2xl font-black text-cyan-900">
            ₹{metrics.totalPremiumDue.toLocaleString("en-IN")}
          </p>
          <span className="text-[11px] text-cyan-700">{records.length} policy renewal(s)</span>
        </div>
      </div>

      {/* Renewals Table */}
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading policy renewal data...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No policies due for renewal in the selected timeframe ({filter === "expired" ? "Overdue" : `${filter} days`}).
          </div>
        ) : (
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="bg-slate-50 text-slate-700">
              <tr className="border-b border-slate-200">
                <th className="px-3.5 py-3">Client Name</th>
                <th className="px-3.5 py-3">Customer Code</th>
                <th className="px-3.5 py-3">Mobile</th>
                <th className="px-3.5 py-3">Provider & Policy #</th>
                <th className="px-3.5 py-3">Plan Name</th>
                <th className="px-3.5 py-3">Premium (Mode)</th>
                <th className="px-3.5 py-3">Renewal Date</th>
                <th className="px-3.5 py-3">Status</th>
                <th className="px-3.5 py-3 text-right">Send Reminder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((c) => {
                const isOverdue = c.daysRemaining < 0;
                const isUrgent = c.daysRemaining >= 0 && c.daysRemaining <= 7;
                const id = c._id || c.policyNumber;

                return (
                  <tr key={id} className="hover:bg-slate-50/50">
                    <td className="px-3.5 py-2.5 font-medium text-slate-900">
                      {c.policyHolderName?.first} {c.policyHolderName?.mid || ""} {c.policyHolderName?.surname}
                    </td>

                    <td className="px-3.5 py-2.5 font-mono">
                      <span className="inline-flex items-center gap-1">
                        {maskValue(c.customerCode, id)}
                        {c.customerCode && settings.maskSensitiveData && (
                          <button
                            type="button"
                            onClick={() => toggleReveal(id, c.customerCode)}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        )}
                      </span>
                    </td>

                    <td className="px-3.5 py-2.5 font-mono">
                      <span className="inline-flex items-center gap-1">
                        {maskValue(c.mobileNumber, id)}
                        {c.mobileNumber && settings.maskSensitiveData && (
                          <button
                            type="button"
                            onClick={() => toggleReveal(id, c.mobileNumber)}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        )}
                      </span>
                    </td>

                    <td className="px-3.5 py-2.5">
                      <span
                        className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          c.provider === "STAR"
                            ? "bg-cyan-100 text-cyan-800"
                            : "bg-teal-100 text-teal-800"
                        }`}
                      >
                        {c.provider}
                      </span>
                      <span className="font-mono text-slate-700">{c.policyNumber}</span>
                    </td>

                    <td className="px-3.5 py-2.5 text-slate-600">{c.policyNames || "-"}</td>

                    <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                      ₹{c.premiumAmount?.toLocaleString("en-IN")}{" "}
                      <span className="text-[10px] font-normal text-slate-500">({c.premiumMode})</span>
                    </td>

                    <td className="px-3.5 py-2.5 text-slate-700">
                      {c.endDate ? new Date(c.endDate).toLocaleDateString() : "-"}
                    </td>

                    <td className="px-3.5 py-2.5">
                      {isOverdue ? (
                        <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                          Overdue ({Math.abs(c.daysRemaining)}d)
                        </span>
                      ) : isUrgent ? (
                        <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                          Due in {c.daysRemaining}d
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800 border border-teal-200">
                          {c.daysRemaining}d left
                        </span>
                      )}
                    </td>

                    <td className="px-3.5 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* WhatsApp reminder link */}
                        <a
                          href={getWhatsAppUrl(c)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open WhatsApp with prefilled renewal reminder"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700 active:scale-95 shadow-sm"
                        >
                          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                          </svg>
                          WhatsApp
                        </a>

                        {/* Copy SMS text */}
                        <button
                          type="button"
                          onClick={() => handleCopyText(c)}
                          title="Copy renewal reminder message"
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          {copiedId === id ? (
                            <span className="text-teal-700 font-bold">Copied!</span>
                          ) : (
                            "Copy Text"
                          )}
                        </button>

                        {/* Quick edit */}
                        {onEditCustomer && (
                          <button
                            type="button"
                            onClick={() => onEditCustomer(c)}
                            title="Edit customer record"
                            className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 transition"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
