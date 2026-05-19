"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { OrderForm } from "./OrderForm";
import { PaymentForm } from "./PaymentForm";

type MobileSettings = { bkashNumber: string; nagadNumber: string; rocketNumber: string };

type PackageLite = {
  id: string;
  title: string;
  type: string;
  priceBdt: number;
};

type Order = {
  id: string;
  domain: string;
  durationMo: number;
  amountBdt: number;
  status: string;
  createdAt: string;
  package: {
    id: string;
    title: string;
    type: string;
    priceBdt: number;
  } | null;
  payments: Array<{
    id: string;
    method: string;
    trxId: string;
    amountBdt: number;
    status: string;
  }>;
};

export function CustomerDashboardClient(props: {
  initialPackages: PackageLite[];
  initialOrders: Order[];
  initialMobile: MobileSettings;
  defaultPackageId?: string | null;
}) {
  const [packages] = useState(props.initialPackages);
  const [orders, setOrders] = useState<Order[]>(props.initialOrders);
  const [mobile, setMobile] = useState<MobileSettings>(props.initialMobile);
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const [ordersRes, mobileRes] = await Promise.all([
        fetch("/api/orders", { cache: "no-store" }),
        fetch("/api/settings/mobile-banking", { cache: "no-store" }),
      ]);
      const ordersData = await ordersRes.json();
      const mobileData = await mobileRes.json();
      setOrders(ordersData.orders ?? []);
      setMobile(mobileData.settings ?? mobile);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const t = window.setInterval(() => {
      refresh().catch(() => {});
    }, 10_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const totalOrders = orders.length;
    const totalSpend = orders.reduce((sum, o) => sum + (o.amountBdt ?? 0), 0);
    const pendingPayments = orders.filter((o) => (o.payments?.[0]?.status ?? null) === "SUBMITTED").length;
    const approvedPayments = orders.filter((o) => (o.payments?.[0]?.status ?? null) === "APPROVED").length;
    const activeServices = orders.filter((o) => o.status === "ACTIVE").length;
    return { totalOrders, totalSpend, pendingPayments, approvedPayments, activeServices };
  }, [orders]);

  const visibleOrders = expanded ? orders : orders.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Orders" value={String(summary.totalOrders)} hint="Total created" />
        <StatCard title="Spend" value={`৳${summary.totalSpend}`} hint="All-time" />
        <StatCard title="Pending" value={String(summary.pendingPayments)} hint="Payments review" />
        <StatCard title="Approved" value={String(summary.approvedPayments)} hint="Payments approved" />
        <StatCard title="Active" value={String(summary.activeServices)} hint="Services active" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 bg-gradient-to-r from-blue-50 to-white p-3">
        <p className="text-xs text-black/70">
          Pay to:{" "}
          <span className="font-medium text-black">
            bKash {mobile.bkashNumber || "—"} · Nagad {mobile.nagadNumber || "—"} · Rocket{" "}
            {mobile.rocketNumber || "—"}
          </span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refresh().catch(() => {})}
            className="rounded-md border border-black/10 px-3 py-1.5 text-xs hover:bg-black/5"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <Link
            href="/hosting"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
          >
            Browse plans
          </Link>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <OrderForm packages={packages} defaultPackageId={props.defaultPackageId ?? null} />
        <div className="rounded-xl border border-black/10 p-4">
          <h2 className="text-sm font-medium">Quick tips</h2>
          <ul className="mt-2 space-y-1.5 text-xs text-black/70">
            <li>1) Create an order for your hosting package.</li>
            <li>2) Pay the exact invoice amount via bKash/Nagad/Rocket.</li>
            <li>3) Submit your transaction ID and sender number.</li>
            <li>4) We verify and activate your service.</li>
          </ul>
          <p className="mt-3 text-[11px] text-black/55">
            Live status updates every 10 seconds.
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-base font-semibold">Recent activity</h2>
          {orders.length > 3 ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-blue-700 hover:underline"
            >
              {expanded ? "Show less" : `Show all (${orders.length})`}
            </button>
          ) : null}
        </div>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/20 p-6 text-sm text-black/70">
            No orders yet. Create one to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleOrders.map((o) => {
              const payment = o.payments?.[0] ?? null;
              return (
                <div key={o.id} className="rounded-xl border border-black/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {(o.package?.title ?? "Package")} · {o.domain}
                      </p>
                      <p className="mt-1 text-xs text-black/70">
                        ৳{o.amountBdt} · {o.durationMo} months · Status {o.status}
                      </p>
                      <p className="mt-1 text-[11px] text-black/50">
                        Order ID: {o.id}
                      </p>
                    </div>
                    <span className="rounded-full bg-black/5 px-2.5 py-1 text-[11px]">
                      {payment ? `Payment ${payment.status}` : "Payment not submitted"}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-black/10 p-4">
                      <h4 className="text-sm font-medium">Invoice</h4>
                      <p className="mt-2 text-xs text-black/70">
                        Pay ৳{o.amountBdt} and submit details here.
                      </p>
                    </div>
                    {payment ? (
                      <div className="rounded-lg border border-black/10 p-4">
                        <h4 className="text-sm font-medium">Payment</h4>
                        <p className="mt-2 text-xs text-black/70">
                          {payment.method} · Trx {payment.trxId}
                          <br />
                          Status: {payment.status}
                        </p>
                      </div>
                    ) : (
                      <PaymentForm
                        orderId={o.id}
                        amountBdt={o.amountBdt}
                        onSubmitted={() => refresh().catch(() => {})}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-3">
      <p className="text-[11px] text-black/60">{title}</p>
      <p className="mt-0.5 text-xl font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-[11px] text-black/50">{hint}</p>
    </div>
  );
}
