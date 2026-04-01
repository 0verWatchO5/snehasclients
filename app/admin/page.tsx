"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

type Customer = {
  _id?: string;
  policyHolderName: { first: string; mid?: string; surname: string };
  age: number;
  mobileNumber: string;
  weight: number;
  height: number;
  policyNumber: string;
  sumAssured: number;
  premiumAmount: number;
  policyTerm: number;
  emi: { status: boolean; amount: number };
  provider: "STAR" | "LIC";
  startDate: string;
  endDate: string;
};

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      router.replace("/");
    },
  });

  const [searchValue, setSearchValue] = useState("");
  const [searchBy, setSearchBy] = useState<"surname" | "policyNumber" | "mobileNumber">("surname");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load all customers on mount and handle auto-search from add-customer
  useEffect(() => {
    const autoSearch = searchParams.get("autoSearch");
    const searchValue = searchParams.get("searchValue");

    if (autoSearch && searchValue) {
      // Auto-search after redirect from add-customer
      setSearchBy(autoSearch as "surname" | "policyNumber" | "mobileNumber");
      setSearchValue(searchValue);
      setTimeout(() => {
        performSearch(searchValue, autoSearch as "surname" | "policyNumber" | "mobileNumber", true);
      }, 100);
    } else {
      // Load all customers on initial mount
      performSearch("", "surname", false);
    }
  }, [searchParams]);

  async function performSearch(value: string, filterBy: "surname" | "policyNumber" | "mobileNumber", showMessage: boolean = false) {
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (value.trim()) {
        params.set(filterBy, value);
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

  async function handleSearch(e: FormEvent) {
    e.preventDefault();

    const trimmed = searchValue.trim();
    if (!trimmed) {
      setError("Enter a value to search.");
      return;
    }

    performSearch(trimmed, searchBy, true);
  }

  function handleEdit(customer: Customer) {
    setEditingCustomer({ ...customer });
    setShowEditModal(true);
  }

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

      setCustomers(customers.map((c) => (c._id === editingCustomer._id ? editingCustomer : c)));
      setShowEditModal(false);
      setEditingCustomer(null);
      setInfo("Customer updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteClick(id: string) {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  }

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

      setCustomers(customers.filter((c) => c._id !== deletingId));
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
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-cyan-100 bg-white/95 p-6 shadow-lg shadow-cyan-900/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Control Panel</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">Insurance Admin DB</h1>
            </div>
            <div className="flex items-center gap-2">
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
                setSearchBy(e.target.value as "surname" | "policyNumber" | "mobileNumber")
              }
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none focus:border-cyan-500 focus:bg-white"
            >
              <option value="surname">Filter: Surname</option>
              <option value="policyNumber">Filter: Policy Number</option>
              <option value="mobileNumber">Filter: Mobile Number</option>
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
                  <th className="px-3 py-2">Mobile</th>
                  <th className="px-3 py-2">Weight</th>
                  <th className="px-3 py-2">Height</th>
                  <th className="px-3 py-2">Sum Assured</th>
                  <th className="px-3 py-2">Premium</th>
                  <th className="px-3 py-2">Term</th>
                  <th className="px-3 py-2">EMI</th>
                  <th className="px-3 py-2">Provider</th>
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
                    <td className="px-3 py-2">{c.mobileNumber}</td>
                    <td className="px-3 py-2">{c.weight}</td>
                    <td className="px-3 py-2">{c.height}</td>
                    <td className="px-3 py-2">{c.sumAssured}</td>
                    <td className="px-3 py-2">{c.premiumAmount}</td>
                    <td className="px-3 py-2">{c.policyTerm}</td>
                    <td className="px-3 py-2">{c.emi.status ? `Yes (${c.emi.amount})` : `No (${c.emi.amount})`}</td>
                    <td className="px-3 py-2">{c.provider}</td>
                    <td className="px-3 py-2">{new Date(c.startDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2">{new Date(c.endDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(c)}
                          className="rounded px-2 py-1 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                          disabled={loading}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(c._id || "")}
                          className="rounded px-2 py-1 text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
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
                    <td colSpan={14} className="px-3 py-6 text-center text-slate-500">
                      No records loaded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {/* Edit Modal */}
      {showEditModal && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-96 w-full max-w-2xl overflow-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
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
                      value={
                          typeof editingCustomer.startDate === "string"
                            ? editingCustomer.startDate.split("T")[0]
                            : ""
                      }
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, startDate: e.target.value })}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    End Date
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                      value={
                          typeof editingCustomer.endDate === "string"
                            ? editingCustomer.endDate.split("T")[0]
                            : ""
                      }
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, endDate: e.target.value })}
                    />
                  </label>
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
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Policy Number
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={editingCustomer.policyNumber}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, policyNumber: e.target.value })}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Start Date
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={
                      typeof editingCustomer.startDate === "string"
                        ? editingCustomer.startDate.split("T")[0]
                        : ""
                    }
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, startDate: e.target.value })}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  End Date
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-teal-500 focus:bg-white"
                    value={
                      typeof editingCustomer.endDate === "string"
                        ? editingCustomer.endDate.split("T")[0]
                        : ""
                    }
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, endDate: e.target.value })}
                  />
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveEdit}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
                <button
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

      {/* Delete Confirmation Modal */}
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
