"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      const username = String(formData.get("username") ?? "");
      const phone = String(formData.get("phone") ?? "");
      const email = String(formData.get("email") ?? "") || undefined;
      const password = String(formData.get("password") ?? "");
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, phone, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "REGISTER_FAILED");
        return;
      }
      window.location.href = "/dashboard";
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="mt-2 text-sm text-black/70">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-700 hover:underline">
            Login
          </Link>
        </p>
      </div>

      <form
        className="rounded-xl border border-black/10 p-5 space-y-3"
        action={onSubmit}
      >
        <input
          name="username"
          required
          placeholder="Username"
          className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
        />
        <input
          type="email"
          name="email"
          placeholder="Email (optional)"
          className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
        />
        <input
          name="phone"
          required
          placeholder="Phone"
          className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password (min 8 chars)"
          className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
        {error ? (
          <p className="text-sm text-red-700">Error: {error}</p>
        ) : null}
        <p className="text-xs text-black/60">After registration, you’ll be signed in.</p>
      </form>
    </div>
  );
}
