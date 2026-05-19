import Link from "next/link";
import { db } from "@/lib/db";

export default async function HostingPage() {
  const packages = await db.packagesFindActive();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hosting Plans</h1>
        <p className="mt-2 text-sm text-black/70">
          Choose a plan, then order from your dashboard.
        </p>
      </div>

      {packages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/20 p-6 text-sm text-black/70">
          No packages available yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {packages.map((p) => (
            <div key={p.id} className="rounded-xl border border-black/10 p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="font-medium">{p.title}</h2>
                <span className="text-sm text-black/60">{p.type}</span>
              </div>
              <p className="mt-3 text-2xl font-semibold">
                ৳{p.priceBdt}
                <span className="text-sm font-normal text-black/60">/mo</span>
              </p>
              <p className="mt-2 text-sm text-black/70">
                {p.storageGb}GB storage · {p.bandwidthGb}GB bandwidth
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-black/70">
                {p.features}
              </p>
              <Link
                href={`/order?packageId=${encodeURIComponent(p.id)}`}
                className="mt-4 inline-block rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
              >
                Order this plan
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
