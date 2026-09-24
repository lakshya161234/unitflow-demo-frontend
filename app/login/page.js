"use client";

import { useState } from "react";
import { login } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";

const DEMO_USERS = {
  admin: { email: "admin@unitflow.demo", password: "UnitFlowAdmin2026!" },
  staff: { email: "staff@unitflow.demo", password: "UnitFlowStaff2026!" },
};

const capabilities = [
  "Multi-factory operations",
  "Production and inventory",
  "Orders, invoices, and payments",
  "Purchasing and client ledgers",
];

export default function LoginPage() {
  const router = useRouter();
  const { reloadUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      await reloadUser();
      router.replace("/dashboard");
    } catch (err) {
      setError(err?.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemoUser(role) {
    setEmail(DEMO_USERS[role].email);
    setPassword(DEMO_USERS[role].password);
    setError("");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 p-8 text-white sm:p-12">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full border border-white/10" />
          <div className="relative">
            <div className="inline-flex rounded-2xl bg-white p-2 shadow-lg">
              <img src="/unitflow-logo.svg" alt="UnitFlow ERP" className="h-12 w-[220px]" />
            </div>
            <p className="mt-16 text-xs font-bold uppercase tracking-[0.24em] text-blue-200">Interactive product demo</p>
            <h1 className="mt-4 max-w-lg text-4xl font-semibold leading-tight sm:text-5xl">One clear view of every factory.</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-blue-100">
              Explore a manufacturing ERP that brings production, inventory, sales, purchasing, and accounting together.
            </p>
            <div className="mt-9 grid gap-3 sm:grid-cols-2">
              {capabilities.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-blue-50">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <p className="relative mt-12 text-xs text-blue-200">Sample company and records are fictional and provided for demonstration.</p>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-semibold text-blue-700">Welcome to UnitFlow</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Sign in to explore</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Use either demo account. The staff account is limited to one factory.</p>
            </div>

            <div className="mb-7 grid gap-3 sm:grid-cols-2">
              {[
                ["admin", "Administrator", "All factories · full access"],
                ["staff", "Factory staff", "North Plant · limited access"],
              ].map(([role, title, details]) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => fillDemoUser(role)}
                  className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <span className="block text-sm font-semibold text-slate-900">{title}</span>
                  <span className="mt-1 block text-xs text-slate-500">{details}</span>
                  <span className="mt-3 block break-all font-mono text-[11px] text-slate-600">{DEMO_USERS[role].email}</span>
                  <span className="mt-1 block break-all font-mono text-[11px] text-slate-600">{DEMO_USERS[role].password}</span>
                  <span className="mt-3 block text-xs font-semibold text-blue-700">Use this account →</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Email address</label>
                <input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@unitflow.demo" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" disabled={loading} />
              </div>
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter demo password" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" disabled={loading} />
              </div>
              {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-700 px-4 py-3.5 font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">
                {loading ? "Signing in…" : "Open the demo"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-slate-400">Public demo accounts may share sample data. Please don’t enter personal or confidential information.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
