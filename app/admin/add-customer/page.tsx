"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Customer = {
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
  premiumMode: "M" | "Q" | "A" | "L";
  customerCode: string;
  startDate: string;
  endDate: string;
};

// Add-customer page collects policy-holder data and submits a create request.
export default function AddCustomerPage() {
  const router = useRouter();
  const { status } = useSession({
    required: true,
    // Redirect callback blocks unauthenticated access to customer creation.
    onUnauthenticated() {
      router.replace("/");
    },
  });

  const [form, setForm] = useState<Customer>({
    policyHolderName: { first: "", mid: "", surname: "" },
    age: 30,
    mobileNumber: "",
    weight: 70,
    height: 170,
    policyNumber: "",
    policyNames: "",
    sumAssured: 500000,
    premiumAmount: 25000,
    policyTerm: 20,
    emi: { status: true, amount: 2500 },
    provider: "STAR",
    dateOfBirth: new Date(1990, 0, 1).toISOString().split("T")[0],
    premiumMode: "M",
    customerCode: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(new Date().getFullYear() + 1, 0, 1).toISOString().split("T")[0],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Normalizes numeric input and guards against NaN from partially typed values.
  function parseNumber(value: string) {
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
  }

  // Sends the validated form payload to the create API and returns to dashboard on success.
  async function handleAddCustomer(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const response = await fetch(`/api/add-customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Could not add customer");
      }

      router.push(`/admin`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add customer");
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
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">Add Customer</h1>
            </div>
            <Link
              href="/admin"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Back to Dashboard
            </Link>
          </div>
        </header>

        <form onSubmit={handleAddCustomer} className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              First Name
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:bg-white"
                placeholder="Enter first name"
                value={form.policyHolderName.first}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    policyHolderName: { ...prev.policyHolderName, first: e.target.value },
                  }))
                }
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Middle Name
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:bg-white"
                placeholder="Enter middle name"
                value={form.policyHolderName.mid}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    policyHolderName: { ...prev.policyHolderName, mid: e.target.value },
                  }))
                }
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Surname
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:bg-white"
                placeholder="Enter surname"
                value={form.policyHolderName.surname}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    policyHolderName: { ...prev.policyHolderName, surname: e.target.value },
                  }))
                }
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Policy Number
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:bg-white"
                placeholder="Unique policy number"
                value={form.policyNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, policyNumber: e.target.value }))}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Policy Names
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:bg-white"
                placeholder="Enter policy names"
                value={form.policyNames}
                maxLength={150}
                onChange={(e) => setForm((prev) => ({ ...prev, policyNames: e.target.value }))}
                required
              />
              <span className="text-xs text-slate-500">Maximum 150 characters.</span>
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Age
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:bg-white"
                placeholder="Age in years"
                value={form.age}
                onChange={(e) => setForm((prev) => ({ ...prev, age: parseNumber(e.target.value) }))}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Mobile Number
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:bg-white"
                placeholder="10-digit mobile number"
                value={form.mobileNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, mobileNumber: e.target.value }))}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Weight
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:bg-white"
                placeholder="Weight in kg"
                value={form.weight}
                onChange={(e) => setForm((prev) => ({ ...prev, weight: parseNumber(e.target.value) }))}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Height
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:bg-white"
                placeholder="Height in cm"
                value={form.height}
                onChange={(e) => setForm((prev) => ({ ...prev, height: parseNumber(e.target.value) }))}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Sum Assured
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:bg-white"
                placeholder="Total coverage amount"
                value={form.sumAssured}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sumAssured: parseNumber(e.target.value) }))
                }
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Premium Amount
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:bg-white"
                placeholder="Premium amount"
                value={form.premiumAmount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, premiumAmount: parseNumber(e.target.value) }))
                }
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Policy Term
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:bg-white"
                placeholder="Policy term in years"
                value={form.policyTerm}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, policyTerm: parseNumber(e.target.value) }))
                }
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Provider
              <select
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:bg-white"
                value={form.provider}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, provider: e.target.value as "STAR" | "LIC" }))
                }
              >
                <option value="STAR">STAR</option>
                <option value="LIC">LIC</option>
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Date of Birth (DOB)
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:bg-white"
                value={form.dateOfBirth}
                onChange={(e) => setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Customer Code
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:bg-white"
                placeholder="Unique customer code"
                value={form.customerCode}
                onChange={(e) => setForm((prev) => ({ ...prev, customerCode: e.target.value }))}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Mode of Premium
              <select
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:bg-white"
                value={form.premiumMode}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, premiumMode: e.target.value as "M" | "Q" | "A" | "L" }))
                }
                required
              >
                <option value="M">M (Monthly)</option>
                <option value="Q">Q (Quarterly)</option>
                <option value="A">A (Annual)</option>
                <option value="L">L (LTP)</option>
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Policy Start Date
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:bg-white"
                value={form.startDate}
                onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Policy End Date
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:bg-white"
                value={form.endDate}
                onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                required
              />
            </label>
            {form.emi.status ? (
              <label className="space-y-1 text-sm font-medium text-slate-700">
                EMI Amount
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:bg-white"
                  placeholder="EMI amount"
                  value={form.emi.amount}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      emi: { ...prev.emi, amount: parseNumber(e.target.value) },
                    }))
                  }
                  required
                />
              </label>
            ) : null}
            <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.emi.status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    emi: { ...prev.emi, status: e.target.checked },
                  }))
                }
              />
              EMI Status
            </label>
          </div>
          <button
            disabled={loading}
            className="mt-4 rounded-xl bg-teal-700 px-4 py-2.5 font-medium text-white transition hover:bg-teal-800 disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Add Customer"}
          </button>
        </form>

        {error ? <p className="rounded-2xl bg-rose-100 px-4 py-3 text-rose-800">{error}</p> : null}
        {info ? <p className="rounded-2xl bg-emerald-100 px-4 py-3 text-emerald-800">{info}</p> : null}
      </section>
    </main>
  );
}
