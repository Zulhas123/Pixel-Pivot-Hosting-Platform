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
      const name = String(formData.get("name") ?? "");
      const email = String(formData.get("email") ?? "");
      const phone = String(formData.get("phone") ?? "") || undefined;
      const password = String(formData.get("password") ?? "");
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, phone, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "REGISTER_FAILED");
        return;
      }
      window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
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
          name="name"
          required
          placeholder="Full name"
          className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
        />
        <input
          name="phone"
          placeholder="Phone (optional)"
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
        <p className="text-xs text-black/60">
          After registration, an OTP code will be generated (dev: logged to the
          server console).
        </p>
      </form>
    </div>
  );
}

