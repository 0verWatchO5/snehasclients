"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import SecurityHeaderBadge from "@/components/SecurityHeaderBadge";
import ScreenPrivacyOverlay from "@/components/ScreenPrivacyOverlay";
import { useSecurity } from "@/components/SecurityContext";
import RenewalsWidget from "@/components/RenewalsWidget";


type PremiumMode = "M" | "Q" | "A" | "L";

type Customer = {
  _id?: string;
  policyHolderName: { first: string; mid?: string; surname: string };
  age: number;
  mobileNumber: string;
  weight: number;
  height: number;
  policyNumber: string;
  policyNames: string;
  sumAssured: number;
  premiumAmount: number;
  policyTerm: number;
  emi: { status: boolean; amount: number };
  provider: "STAR" | "LIC";
  dateOfBirth: string;
  customerCode: string;
  premiumMode: PremiumMode;
  startDate: string;
  endDate: string;
};

// Converts ISO date strings to yyyy-mm-dd so date inputs render correctly.
function dateInputValue(value: string | undefined) {
  return typeof value === "string" && value.length > 0 ? value.split("T")[0] : "";
}

// Maps compact premium mode codes to readable labels in the table.
function premiumModeLabel(mode: string | undefined) {
  if (mode === "M") return "M (Monthly)";
  if (mode === "Q") return "Q (Quarterly)";
  if (mode === "A") return "A (Annual)";
  if (mode === "L") return "L (LTP)";
  return "-";
}

// Main admin workspace for searching, editing, and deleting customers.
function AdminPageContent() {
  const router = useRouter();
  const { status } = useSession({
    required: true,
    // Unauthenticated callback enforces page-level protection in the client router.
    onUnauthenticated() {
      router.replace("/");
    },
  });

  const [searchValue, setSearchValue] = useState("");
  const [searchBy, setSearchBy] = useState<"surname" | "policyNumber" | "mobileNumber" | "customerCode">("surname");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeDashboardTab, setActiveDashboardTab] = useState<"database" | "renewals">("database");

  const { settings } = useSecurity();
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

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

  function getWhatsAppUrl(customer: Customer) {
    let phone = (customer.mobileNumber || "").replace(/\D/g, "");
    if (phone.length === 10) phone = "91" + phone;
    const name = customer.policyHolderName?.first || "Valued Client";
    const provider = customer.provider || "Health Insurance";
    const policyNo = customer.policyNumber || "";
    const plan = customer.policyNames ? ` (${customer.policyNames})` : "";
    const premium = customer.premiumAmount ? `Rs. ${customer.premiumAmount.toLocaleString("en-IN")}` : "";
    const date = customer.endDate ? new Date(customer.endDate).toLocaleDateString() : "";

    const text = `Dear ${name},\n\nThis is a gentle reminder from Sneha Medicare that your ${provider} policy #${policyNo}${plan} with premium of ${premium} is due for renewal on ${date}.\n\nPlease renew on time to ensure uninterrupted medical coverage and benefits.\n\nThank you,\nSneha Medicare`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  // Initial-load callback preloads customer data so dashboard opens with records.
  useEffect(() => {
    performSearch("", "surname", false);
  }, []);

  // Calls the search API and updates result state for initial load and manual searches.
  async function performSearch(
    value: string,
    filterBy: "surname" | "policyNumber" | "mobileNumber" | "customerCode",
    showMessage: boolean
  ) {
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (value.trim()) {
        params.set(filterBy, value.trim());
      }

      const response = await fetch(`/api/search?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Search failed");
      }

      setCustomers(payload);
      if (showMessage) {
        setInfo(`${payload.length} record(s) found.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  // Validates the search input before delegating to the shared search routine.
  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = searchValue.trim();
    if (!trimmed) {
      setError("Enter a value to search.");
      return;
    }

    performSearch(trimmed, searchBy, true);
  }

  // Loads the selected customer into modal state for inline editing.
  function handleEdit(customer: Customer) {
    setEditingCustomer({
      ...customer,
      dateOfBirth: customer.dateOfBirth || "",
      customerCode: customer.customerCode || "",
      policyNames: customer.policyNames || "",
      premiumMode: (customer.premiumMode || "M") as PremiumMode,
    });
    setShowEditModal(true);
  }

  // Persists customer edits and updates the in-memory row after a successful save.
  async function handleSaveEdit() {
    if (!editingCustomer || !editingCustomer._id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/update-customer`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingCustomer._id, ...editingCustomer }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Update failed");
      }

      setCustomers((prev) => prev.map((c) => (c._id === editingCustomer._id ? payload : c)));
      setShowEditModal(false);
      setEditingCustomer(null);
      setInfo("Customer updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  // Opens a confirmation step to avoid accidental destructive deletes.
  function handleDeleteClick(id: string) {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  }

  // Deletes the selected customer and removes it from table state.
  async function handleConfirmDelete() {
    if (!deletingId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/delete-customer`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletingId }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Delete failed");
      }

      setCustomers((prev) => prev.filter((c) => c._id !== deletingId));
      setShowDeleteConfirm(false);
      setDeletingId(null);
      setInfo("Customer deleted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return <main className="flex min-h-screen items-center justify-center text-slate-600">Loading...</main>;
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <ScreenPrivacyOverlay>
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-cyan-100 bg-white/95 p-6 shadow-lg shadow-cyan-900/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Control Panel</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">Sneha Medicare Client Database</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SecurityHeaderBadge />
              <Link
                href="/admin/add-customer"
                className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800"
              >
                Add Customer
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-2">
          <button
            type="button"
            onClick={() => setActiveDashboardTab("database")}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition ${
              activeDashboardTab === "database"
                ? "bg-teal-700 text-white shadow-md shadow-teal-900/10"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h4" />
            </svg>
            Customer Database ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveDashboardTab("renewals")}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition ${
              activeDashboardTab === "renewals"
                ? "bg-teal-700 text-white shadow-md shadow-teal-900/10"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Policy Renewals & Expiry Alerts
          </button>
        </div>

        {activeDashboardTab === "renewals" ? (
          <RenewalsWidget onEditCustomer={(c) => handleEdit(c as unknown as Customer)} />
        ) : (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Customer Search</h2>
          <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row">
            <input
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none focus:border-cyan-500 focus:bg-white"
              placeholder="Search customer"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <select
              value={searchBy}
              onChange={(e) =>
                setSearchBy(e.target.value as "surname" | "policyNumber" | "mobileNumber" | "customerCode")
              }
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none focus:border-cyan-500 focus:bg-white"
            >
              <option value="surname">Filter: Surname</option>
              <option value="policyNumber">Filter: Policy Number</option>
              <option value="mobileNumber">Filter: Mobile Number</option>
              <option value="customerCode">Filter: Customer Code</option>
            </select>
            <button
              disabled={loading}
              className="rounded-xl bg-cyan-700 px-4 py-2.5 font-medium text-white transition hover:bg-cyan-800 disabled:opacity-60"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>
        </section>

        {error ? <p className="rounded-2xl bg-rose-100 px-4 py-3 text-rose-800">{error}</p> : null}
        {info ? <p className="rounded-2xl bg-emerald-100 px-4 py-3 text-emerald-800">{info}</p> : null}

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Customer Records</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-700">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Age</th>
                  <th className="px-3 py-2">Policy #</th>
                  <th className="px-3 py-2">Policy Names</th>
                  <th className="px-3 py-2">Customer Code</th>
                  <th className="px-3 py-2">Mobile</th>
                  <th className="px-3 py-2">Weight</th>
                  <th className="px-3 py-2">Height</th>
                  <th className="px-3 py-2">Sum Assured</th>
                  <th className="px-3 py-2">Premium</th>
                  <th className="px-3 py-2">Premium Mode</th>
                  <th className="px-3 py-2">Term</th>
                  <th className="px-3 py-2">EMI</th>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">DOB</th>
                  <th className="px-3 py-2">Start Date</th>
                  <th className="px-3 py-2">End Date</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c._id || c.policyNumber} className="border-b border-slate-100">
                    <td className="px-3 py-2">
                      {c.policyHolderName.first} {c.policyHolderName.mid || ""} {c.policyHolderName.surname}
                    </td>
                    <td className="px-3 py-2">{c.age}</td>
                    <td className="px-3 py-2">{c.policyNumber}</td>
                    <td className="px-3 py-2">{c.policyNames || "-"}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5 font-mono">
                        {maskValue(c.customerCode, c._id)}
                        {c.customerCode && settings.maskSensitiveData && (
                          <button
                            type="button"
                            onClick={() => toggleReveal(c._id, c.customerCode)}
                            title="Toggle reveal"
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
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5 font-mono">
                        {maskValue(c.mobileNumber, c._id)}
                        {c.mobileNumber && settings.maskSensitiveData && (
                          <button
                            type="button"
                            onClick={() => toggleReveal(c._id, c.mobileNumber)}
                            title="Toggle reveal"
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
                    <td className="px-3 py-2">{c.weight}</td>
                    <td className="px-3 py-2">{c.height}</td>
                    <td className="px-3 py-2">{c.sumAssured}</td>
                    <td className="px-3 py-2">{c.premiumAmount}</td>
                    <td className="px-3 py-2">{premiumModeLabel(c.premiumMode)}</td>
                    <td className="px-3 py-2">{c.policyTerm}</td>
                    <td className="px-3 py-2">{c.emi.status ? `Yes (${c.emi.amount})` : "No"}</td>
                    <td className="px-3 py-2">{c.provider}</td>
                    <td className="px-3 py-2">{c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString() : "-"}</td>
                    <td className="px-3 py-2">{new Date(c.startDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2">{new Date(c.endDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={getWhatsAppUrl(c)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open WhatsApp with renewal reminder"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 shadow-sm active:scale-95"
                        >
                          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                          </svg>
                          WhatsApp
                        </a>
                        <button
                          onClick={() => handleEdit(c)}
                          className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                          disabled={loading}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(c._id || "")}
                          className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                          disabled={loading}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="px-3 py-6 text-center text-slate-500">
                      No records loaded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
          </>
        )}
        </section>
      </ScreenPrivacyOverlay>

      {/* Edit Modal */}
      {showEditModal && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Edit Customer</h2>
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  First Name
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={editingCustomer.policyHolderName.first}
                    onChange={(e) =>
                      setEditingCustomer({
                        ...editingCustomer,
                        policyHolderName: { ...editingCustomer.policyHolderName, first: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Middle Name
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={editingCustomer.policyHolderName.mid || ""}
                    onChange={(e) =>
                      setEditingCustomer({
                        ...editingCustomer,
                        policyHolderName: { ...editingCustomer.policyHolderName, mid: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Surname
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={editingCustomer.policyHolderName.surname}
                    onChange={(e) =>
                      setEditingCustomer({
                        ...editingCustomer,
                        policyHolderName: { ...editingCustomer.policyHolderName, surname: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Policy Number
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={editingCustomer.policyNumber}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, policyNumber: e.target.value })}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Policy Names
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={editingCustomer.policyNames || ""}
                    maxLength={150}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, policyNames: e.target.value })}
                  />
                  <span className="text-xs text-slate-500">Maximum 150 characters.</span>
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Customer Code
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={editingCustomer.customerCode || ""}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, customerCode: e.target.value })}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Date of Birth (DOB)
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={dateInputValue(editingCustomer.dateOfBirth)}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, dateOfBirth: e.target.value })}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Age
                  <input
                    type="number"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={editingCustomer.age}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, age: Number(e.target.value) })}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Mobile Number
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={editingCustomer.mobileNumber}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, mobileNumber: e.target.value })}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Weight (kg)
                  <input
                    type="number"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={editingCustomer.weight}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, weight: Number(e.target.value) })}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Height (cm)
                  <input
                    type="number"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={editingCustomer.height}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, height: Number(e.target.value) })}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Sum Assured
                  <input
                    type="number"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={editingCustomer.sumAssured}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, sumAssured: Number(e.target.value) })}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Premium Amount
                  <input
                    type="number"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={editingCustomer.premiumAmount}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, premiumAmount: Number(e.target.value) })}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Premium Mode
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={editingCustomer.premiumMode || "M"}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, premiumMode: e.target.value as PremiumMode })
                    }
                  >
                    <option value="M">M (Monthly)</option>
                    <option value="Q">Q (Quarterly)</option>
                    <option value="A">A (Annual)</option>
                    <option value="L">L (LTP)</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Policy Term (years)
                  <input
                    type="number"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={editingCustomer.policyTerm}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, policyTerm: Number(e.target.value) })}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Provider
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={editingCustomer.provider}
                    onChange={(e) =>
                      setEditingCustomer({
                        ...editingCustomer,
                        provider: e.target.value as "STAR" | "LIC",
                      })
                    }
                  >
                    <option value="STAR">STAR</option>
                    <option value="LIC">LIC</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Start Date
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={dateInputValue(editingCustomer.startDate)}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, startDate: e.target.value })}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  End Date
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={dateInputValue(editingCustomer.endDate)}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, endDate: e.target.value })}
                  />
                </label>
                {editingCustomer.emi.status ? (
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    EMI Amount
                    <input
                      type="number"
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                      value={editingCustomer.emi.amount}
                      onChange={(e) =>
                        setEditingCustomer({
                          ...editingCustomer,
                          emi: { ...editingCustomer.emi, amount: Number(e.target.value) },
                        })
                      }
                    />
                  </label>
                ) : null}
                <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingCustomer.emi.status}
                    onChange={(e) =>
                      setEditingCustomer({
                        ...editingCustomer,
                        emi: { ...editingCustomer.emi, status: e.target.checked },
                      })
                    }
                  />
                  EMI Status
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="mb-3 text-lg font-semibold">Delete Customer?</h2>
            <p className="mb-6 text-sm text-slate-600">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmDelete}
                disabled={loading}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function AdminPage() {
  // Suspense fallback keeps UX stable while session and client state initialize.
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center text-slate-600">Loading...</main>}>
      <AdminPageContent />
    </Suspense>
  );
}
