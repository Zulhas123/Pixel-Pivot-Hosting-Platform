"use client";

import { useState } from "react";

export function ResetPasswordClient({ initialUsername }: { initialUsername: string }) {
  const [username, setUsername] = useState(initialUsername);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit() {
    setError(null);
    setOk(false);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, code, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error ?? "RESET_FAILED");
      return;
    }
    setOk(true);
    setTimeout(() => (window.location.href = "/login"), 800);
  }

  return (
    <div className="rounded-xl border border-black/10 p-5 space-y-3">
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
      />
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="6-digit code"
        className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
      />
      <input
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        type="password"
        placeholder="New password"
        className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
      />
      <button
        type="button"
        onClick={submit}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Reset password
      </button>
      {ok ? <p className="text-sm text-green-700">Updated. Redirecting…</p> : null}
      {error ? <p className="text-sm text-red-700">Error: {error}</p> : null}
    </div>
  );
}
