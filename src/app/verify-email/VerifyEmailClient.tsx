"use client";

import { useState } from "react";

export function VerifyEmailClient({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function verify() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "VERIFY_FAILED");
        return;
      }
      setOk(true);
      setTimeout(() => {
        window.location.href = "/login";
      }, 800);
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError(null);
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
  }

  return (
    <div className="rounded-xl border border-black/10 p-5 space-y-3">
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
      />
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="6-digit code"
        className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
      />
      <button
        type="button"
        disabled={loading}
        onClick={verify}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? "Verifying…" : "Verify"}
      </button>
      <button
        type="button"
        onClick={resend}
        className="w-full rounded-md border border-black/10 px-4 py-2 hover:bg-black/5"
      >
        Resend code
      </button>
      {ok ? <p className="text-sm text-green-700">Verified. Redirecting…</p> : null}
      {error ? <p className="text-sm text-red-700">Error: {error}</p> : null}
    </div>
  );
}

