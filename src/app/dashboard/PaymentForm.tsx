"use client";

import { useState } from "react";

export function PaymentForm({
  orderId,
  amountBdt,
  onSubmitted,
  customerPhone,
  requirePhone,
}: {
  orderId: string;
  amountBdt: number;
  onSubmitted?: () => void;
  customerPhone?: string;
  requirePhone?: boolean;
}) {
  const [method, setMethod] = useState<"BKASH" | "NAGAD" | "ROCKET">("BKASH");
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [phone, setPhone] = useState(customerPhone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderId,
          method,
          senderNumber,
          trxId,
          amountBdt,
          customerPhone: phone || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "PAYMENT_FAILED");
        return;
      }
      setDone(true);
      onSubmitted?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-black/10 p-4 space-y-2">
      <h4 className="text-sm font-medium">Submit payment</h4>
      {requirePhone ? (
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Customer phone (required for guest)"
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
        />
      ) : null}
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value as "BKASH" | "NAGAD" | "ROCKET")}
        className="w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
      >
        <option value="BKASH">bKash</option>
        <option value="NAGAD">Nagad</option>
        <option value="ROCKET">Rocket</option>
      </select>
      <input
        value={senderNumber}
        onChange={(e) => setSenderNumber(e.target.value)}
        placeholder="Sender number"
        className="w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
      />
      <input
        value={trxId}
        onChange={(e) => setTrxId(e.target.value)}
        placeholder="Transaction ID"
        className="w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
      />
      <button
        type="button"
        disabled={loading || !senderNumber || !trxId || (requirePhone ? !phone : false)}
        onClick={submit}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? "Submitting…" : `Submit ৳${amountBdt}`}
      </button>
      {done ? <p className="text-xs text-green-700">Submitted for review.</p> : null}
      {error ? <p className="text-xs text-red-700">Error: {error}</p> : null}
    </div>
  );
}
