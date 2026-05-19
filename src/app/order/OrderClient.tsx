"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PaymentForm } from "@/app/dashboard/PaymentForm";

export function OrderClient({
  packageId,
  packageTitle,
  priceBdt,
}: {
  packageId: string;
  packageTitle: string;
  priceBdt: number;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [durationMo, setDurationMo] = useState(12);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ orderId: string; amountBdt: number } | null>(null);

  const amountBdt = useMemo(() => priceBdt * durationMo, [priceBdt, durationMo]);

  async function createOrder() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          packageId,
          domain,
          durationMo,
          customerName,
          customerPhone,
          customerEmail: customerEmail || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "ORDER_FAILED");
        return;
      }
      setCreated({ orderId: data.order.id, amountBdt: data.order.amountBdt });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-2xl border border-black/10 bg-white p-5">
        <h1 className="text-xl font-semibold">Order: {packageTitle}</h1>
        <p className="mt-1 text-sm text-black/60">
          You can place an order without registration. We’ll contact you on the phone number you provide.
        </p>
      </div>

      {!created ? (
        <div className="grid gap-3 rounded-2xl border border-black/10 bg-white p-5 md:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Customer info</h2>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone (required)"
              className="w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
            <input
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="Email (optional)"
              className="w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-medium">Order details</h2>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Domain (e.g. example.com)"
              className="w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
            <input
              value={durationMo}
              onChange={(e) => setDurationMo(Number(e.target.value))}
              type="number"
              min={1}
              max={60}
              className="w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
            <div className="rounded-lg border border-black/10 bg-blue-50 p-3 text-sm text-black/70">
              Total: <span className="font-semibold text-black">৳{amountBdt}</span>
            </div>
            <button
              type="button"
              disabled={loading || !customerName || !customerPhone || !domain}
              onClick={createOrder}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create order"}
            </button>
            {error ? <p className="text-sm text-red-700">Error: {error}</p> : null}
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="text-sm font-medium">Order created</h2>
          <p className="text-sm text-black/70">
            Order ID: <span className="font-mono">{created.orderId}</span>
          </p>
          <PaymentForm
            orderId={created.orderId}
            amountBdt={created.amountBdt}
            customerPhone={customerPhone}
            requirePhone
            onSubmitted={() => {}}
          />
          <p className="text-xs text-black/55">
            Guest payment submission requires your phone to match the order. If asked, keep your phone number.
          </p>
          <Link href="/hosting" className="text-sm text-blue-700 hover:underline">
            Back to hosting
          </Link>
        </div>
      )}
    </div>
  );
}
