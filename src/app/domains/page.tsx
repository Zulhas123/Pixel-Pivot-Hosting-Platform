"use client";

import { useMemo, useState } from "react";

function isAvailable(domain: string) {
  const blocked = ["google", "facebook", "youtube", "gmail"];
  return !blocked.some((b) => domain.toLowerCase().includes(b));
}

export default function DomainsPage() {
  const [query, setQuery] = useState("");
  const normalized = useMemo(() => query.trim().toLowerCase(), [query]);
  const canSearch = normalized.length >= 3 && !normalized.includes(" ");

  const tlds = [".com", ".net", ".org", ".bd", ".xyz"];
  const results = canSearch
    ? tlds.map((tld) => {
        const domain = normalized.endsWith(tld) ? normalized : `${normalized}${tld}`;
        return { domain, available: isAvailable(domain) };
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Domain Search</h1>
        <p className="mt-2 text-sm text-black/70">
          MVP: availability is simulated. Integrations can be added later.
        </p>
      </div>

      <div className="rounded-xl border border-black/10 p-5">
        <label className="text-sm font-medium">Domain name</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="example"
          className="mt-2 w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
        />
        <p className="mt-2 text-xs text-black/60">
          Type a name without spaces. We’ll check common TLDs.
        </p>
      </div>

      {results.length > 0 ? (
        <div className="space-y-3">
          {results.map((r) => (
            <div
              key={r.domain}
              className="flex items-center justify-between rounded-xl border border-black/10 p-4"
            >
              <div>
                <p className="font-medium">{r.domain}</p>
                <p className="text-sm text-black/60">
                  {r.available ? "Available" : "Not available"}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs ${
                  r.available ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}
              >
                {r.available ? "OK" : "Taken"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-black/60">Enter a domain name to search.</p>
      )}
    </div>
  );
}

