"use client";

import { useMemo, useState } from "react";

type PackageLite = {
  id: string;
  title: string;
  type: string;
  priceBdt: number;
};

export function OrderForm({
  packages,
  defaultPackageId,
}: {
  packages: PackageLite[];
  defaultPackageId?: string | null;
}) {
  const [packageId, setPackageId] = useState(defaultPackageId ?? packages[0]?.id ?? "");
  const [domain, setDomain] = useState("");
  const [durationMo, setDurationMo] = useState(12);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const selected = useMemo(
    () => packages.find((p) => p.id === packageId) ?? null,
    [packages, packageId],
  );
  const estimated = selected ? selected.priceBdt * durationMo : 0;

  async function submit() {
    setError(null);
    setOk(false);
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packageId, domain, durationMo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "ORDER_FAILED");
        return;
      }
      setOk(true);
      setDomain("");
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/10 p-5 space-y-3">
      <h2 className="font-medium">Create order</h2>
      <select
        value={packageId}
        onChange={(e) => setPackageId(e.target.value)}
        className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
      >
        {packages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title} · ৳{p.priceBdt}/mo
          </option>
        ))}
      </select>
      <input
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="Domain (e.g. example.com)"
        className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
      />
      <input
        value={durationMo}
        onChange={(e) => setDurationMo(Number(e.target.value))}
        type="number"
        min={1}
        max={60}
        className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
      />
      <p className="text-sm text-black/70">Estimated total: ৳{estimated}</p>
      <button
        type="button"
        disabled={loading || !packageId || !domain}
        onClick={submit}
        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? "Creating…" : "Create order"}
      </button>
      {ok ? <p className="text-sm text-green-700">Order created.</p> : null}
      {error ? <p className="text-sm text-red-700">Error: {error}</p> : null}
    </div>
  );
}

