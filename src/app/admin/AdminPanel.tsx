"use client";

import { useEffect, useMemo, useState } from "react";

type MobileSettings = { bkashNumber: string; nagadNumber: string; rocketNumber: string };
type Package = {
  id: string;
  title: string;
  type: string;
  priceBdt: number;
  storageGb: number;
  bandwidthGb: number;
  features: string;
  isActive: boolean;
};

type Order = {
  id: string;
  domain: string;
  durationMo: number;
  amountBdt: number;
  status: string;
  createdAt: string;
  user: { id: string; email: string; name: string };
  package: Package;
  payments: Array<{
    id: string;
    method: string;
    trxId: string;
    senderNumber: string;
    amountBdt: number;
    status: string;
  }>;
};

export function AdminPanel() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<MobileSettings>({
    bkashNumber: "",
    nagadNumber: "",
    rocketNumber: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<"packages" | "orders" | "logs" | "notifications">("orders");
  const [logs, setLogs] = useState<
    Array<{ id: string; level: string; message: string; createdAt: string; meta: unknown }>
  >([]);

  async function refresh() {
    const [pkgRes, orderRes, settingsRes] = await Promise.all([
      fetch("/api/packages"),
      fetch("/api/orders?all=1"),
      fetch("/api/settings/mobile-banking"),
    ]);
    const pkgData = await pkgRes.json();
    const orderData = await orderRes.json();
    const settingsData = await settingsRes.json();
    setPackages(pkgData.packages ?? []);
    setOrders(orderData.orders ?? []);
    setSettings(settingsData.settings ?? settings);
  }

  async function refreshLogs() {
    const res = await fetch("/api/admin/logs?limit=100", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setLogs(data.logs ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingPayments = useMemo(
    () => orders.flatMap((o) => o.payments.map((p) => ({ order: o, payment: p }))).filter((x) => x.payment.status === "SUBMITTED"),
    [orders],
  );

  async function createPackage(formData: FormData) {
    setMsg(null);
    const payload = {
      title: String(formData.get("title") ?? ""),
      type: String(formData.get("type") ?? ""),
      priceBdt: Number(formData.get("priceBdt") ?? 0),
      storageGb: Number(formData.get("storageGb") ?? 0),
      bandwidthGb: Number(formData.get("bandwidthGb") ?? 0),
      features: String(formData.get("features") ?? ""),
      isActive: true,
    };
    const res = await fetch("/api/packages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(`Error: ${data?.error ?? "CREATE_PACKAGE_FAILED"}`);
      return;
    }
    setMsg("Package created.");
    await refresh();
  }

  async function saveSettings() {
    setMsg(null);
    const res = await fetch("/api/settings/mobile-banking", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(`Error: ${data?.error ?? "SAVE_SETTINGS_FAILED"}`);
      return;
    }
    setMsg("Settings saved.");
    setSettings(data.settings);
  }

  async function setPaymentStatus(paymentId: string, status: "APPROVED" | "REJECTED") {
    setMsg(null);
    const res = await fetch(`/api/admin/payments/${paymentId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(`Error: ${data?.error ?? "UPDATE_PAYMENT_FAILED"}`);
      return;
    }
    setMsg(`Payment ${status.toLowerCase()}.`);
    await refresh();
  }

  async function setOrderStatus(orderId: string, status: "ACTIVE" | "REJECTED") {
    setMsg(null);
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(`Error: ${data?.error ?? "UPDATE_ORDER_FAILED"}`);
      return;
    }
    setMsg(`Order updated: ${status}.`);
    await refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["orders", "Order list"],
            ["packages", "Add package"],
            ["logs", "Logs"],
            ["notifications", "Notifications"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              if (key === "logs") refreshLogs().catch(() => {});
            }}
            className={`rounded-md px-3 py-2 text-sm ${
              tab === key ? "bg-blue-600 text-white" : "border border-black/10 hover:bg-black/5"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {msg ? (
        <div className="rounded-xl border border-black/10 bg-blue-50 p-4 text-sm">{msg}</div>
      ) : null}

      {tab === "packages" ? (
        <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-black/10 p-5 space-y-3">
          <h2 className="text-lg font-semibold">Mobile banking settings</h2>
          <input
            value={settings.bkashNumber}
            onChange={(e) => setSettings({ ...settings, bkashNumber: e.target.value })}
            placeholder="bKash number"
            className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
          />
          <input
            value={settings.nagadNumber}
            onChange={(e) => setSettings({ ...settings, nagadNumber: e.target.value })}
            placeholder="Nagad number"
            className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
          />
          <input
            value={settings.rocketNumber}
            onChange={(e) => setSettings({ ...settings, rocketNumber: e.target.value })}
            placeholder="Rocket number"
            className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="button"
            onClick={saveSettings}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Save settings
          </button>
        </div>

        <form className="rounded-xl border border-black/10 p-5 space-y-3" action={createPackage}>
          <h2 className="text-lg font-semibold">Create package</h2>
          <input name="title" required placeholder="Title" className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" />
          <input name="type" required placeholder="Type (Shared/VPS/...)" className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" />
          <div className="grid gap-3 md:grid-cols-3">
            <input name="priceBdt" required type="number" min={0} placeholder="Price (BDT/mo)" className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" />
            <input name="storageGb" required type="number" min={0} placeholder="Storage (GB)" className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" />
            <input name="bandwidthGb" required type="number" min={0} placeholder="Bandwidth (GB)" className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <textarea name="features" required rows={4} placeholder="Features (one per line)" className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" />
          <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Create
          </button>
        </form>
        </section>
      ) : null}

      {tab === "notifications" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Pending payments</h2>
        {pendingPayments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/20 p-6 text-sm text-black/70">No pending payments.</div>
        ) : (
          <div className="space-y-3">
            {pendingPayments.map(({ order, payment }) => (
              <div key={payment.id} className="rounded-xl border border-black/10 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {order.user.email} · {order.domain}
                    </p>
                    <p className="mt-1 text-sm text-black/70">
                      Amount ৳{payment.amountBdt} · {payment.method} · Trx {payment.trxId} · Sender {payment.senderNumber}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentStatus(payment.id, "APPROVED")}
                      className="rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentStatus(payment.id, "REJECTED")}
                      className="rounded-md border border-black/10 px-3 py-2 text-sm hover:bg-black/5"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </section>
      ) : null}

      {tab === "packages" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Packages</h2>
        {packages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/20 p-6 text-sm text-black/70">No packages.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {packages.map((p) => (
              <div key={p.id} className="rounded-xl border border-black/10 p-4">
                <p className="font-medium">
                  {p.title} <span className="text-sm text-black/60">({p.type})</span>
                </p>
                <p className="mt-1 text-sm text-black/70">
                  ৳{p.priceBdt}/mo · {p.storageGb}GB · {p.bandwidthGb}GB
                </p>
              </div>
            ))}
          </div>
        )}
        </section>
      ) : null}

      {tab === "orders" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Order list</h2>
          {orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/20 p-6 text-sm text-black/70">
              No orders.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="rounded-xl border border-black/10 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {o.user.email} · {o.domain}
                      </p>
                      <p className="mt-1 text-sm text-black/70">
                        {o.package.title} · ৳{o.amountBdt} · {o.durationMo}mo · Status {o.status}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOrderStatus(o.id, "ACTIVE")}
                        className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderStatus(o.id, "REJECTED")}
                        className="rounded-md border border-black/10 px-3 py-2 text-sm hover:bg-black/5"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "logs" ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Logs</h2>
            <button
              type="button"
              onClick={() => refreshLogs().catch(() => {})}
              className="rounded-md border border-black/10 px-3 py-2 text-sm hover:bg-black/5"
            >
              Refresh
            </button>
          </div>
          {logs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/20 p-6 text-sm text-black/70">
              No logs yet.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((l) => (
                <div key={l.id} className="rounded-xl border border-black/10 p-4">
                  <p className="text-xs text-black/50">{new Date(l.createdAt).toLocaleString()}</p>
                  <p className="mt-1 text-sm font-medium">
                    [{l.level}] {l.message}
                  </p>
                  {l.meta ? (
                    <pre className="mt-2 overflow-auto rounded-lg bg-black/5 p-3 text-xs">
                      {JSON.stringify(l.meta, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
