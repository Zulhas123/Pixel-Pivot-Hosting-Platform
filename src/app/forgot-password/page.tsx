"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function submit() {
    setSent(false);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Forgot password</h1>
        <p className="mt-2 text-sm text-black/70">
          We’ll generate a 6-digit reset code (dev: printed in server console).
        </p>
      </div>
      <div className="rounded-xl border border-black/10 p-5 space-y-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          type="button"
          onClick={submit}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Send reset code
        </button>
        {sent ? (
          <p className="text-sm text-green-700">
            Sent. Continue to{" "}
            <Link className="underline" href={`/reset-password?email=${encodeURIComponent(email)}`}>
              reset password
            </Link>
            .
          </p>
        ) : null}
      </div>
    </div>
  );
}

