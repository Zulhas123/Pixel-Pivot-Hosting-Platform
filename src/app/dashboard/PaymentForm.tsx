"use client";

import { useState } from "react";

export function PaymentForm({ orderId, amountBdt }: { orderId: string; amountBdt: number }) {
  const [method, setMethod] = useState<"BKASH" | "NAGAD" | "ROCKET">("BKASH");
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId, method, senderNumber, trxId, amountBdt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "PAYMENT_FAILED");
        return;
      }
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-black/10 p-4 space-y-2">
      <h4 className="font-medium">Submit payment</h4>
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value as "BKASH" | "NAGAD" | "ROCKET")}
        className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
      >
        <option value="BKASH">bKash</option>
        <option value="NAGAD">Nagad</option>
        <option value="ROCKET">Rocket</option>
      </select>
      <input
        value={senderNumber}
        onChange={(e) => setSenderNumber(e.target.value)}
        placeholder="Sender number"
        className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
      />
      <input
        value={trxId}
        onChange={(e) => setTrxId(e.target.value)}
        placeholder="Transaction ID"
        className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
      />
      <button
        type="button"
        disabled={loading || !senderNumber || !trxId}
        onClick={submit}
        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? "Submitting…" : `Submit ৳${amountBdt}`}
      </button>
      {error ? <p className="text-sm text-red-700">Error: {error}</p> : null}
    </div>
  );
}
