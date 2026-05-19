"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      const username = String(formData.get("username") ?? "");
      const password = String(formData.get("password") ?? "");
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "LOGIN_FAILED");
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
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="mt-2 text-sm text-black/70">
          New here?{" "}
          <Link href="/register" className="text-blue-700 hover:underline">
            Create an account
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
          name="password"
          type="password"
          required
          placeholder="Password"
          className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
        {error ? (
          <p className="text-sm text-red-700">Error: {error}</p>
        ) : null}
        <p className="text-xs text-black/60">
          Forgot your password?{" "}
          <Link href="/forgot-password" className="text-blue-700 hover:underline">
            Reset it
          </Link>
          .
        </p>
      </form>
    </div>
  );
}
