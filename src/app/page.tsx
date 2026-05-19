import Link from "next/link";
import { db } from "@/lib/db";

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-black/10 bg-gradient-to-br from-blue-50 to-white p-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Domain & Hosting — built for Bangladesh
        </h1>
        <p className="mt-3 max-w-2xl text-black/70">
          Browse packages, place orders, pay via bKash/Nagad/Rocket, and track
          status from your dashboard. Admin verifies payments and activates
          services.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/hosting"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            View Hosting Plans
          </Link>
          <Link
            href="/domains"
            className="rounded-md border border-black/10 px-4 py-2 hover:bg-black/5"
          >
            Search Domains
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Popular plans</h2>
        <PlansPreview />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Manual payments",
            desc: "Submit transaction ID and sender number. Admin confirms quickly.",
          },
          {
            title: "Fast onboarding",
            desc: "Register, verify email, place your first order.",
          },
          {
            title: "Customer dashboard",
            desc: "Track orders, invoices, and payment history.",
          },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-black/10 p-5">
            <h3 className="font-medium">{f.title}</h3>
            <p className="mt-2 text-sm text-black/70">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

async function PlansPreview() {
  const packages = await db.packagesFindActive({ take: 3 });

  if (packages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/20 p-6 text-sm text-black/70">
        No packages yet. If you are an admin, add packages from the Admin panel.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {packages.map((p) => (
        <div key={p.id} className="rounded-xl border border-black/10 p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="font-medium">{p.title}</h3>
            <span className="text-sm text-black/60">{p.type}</span>
          </div>
          <p className="mt-3 text-2xl font-semibold">
            ৳{p.priceBdt}
            <span className="text-sm font-normal text-black/60">/mo</span>
          </p>
          <p className="mt-2 text-sm text-black/70">
            {p.storageGb}GB storage · {p.bandwidthGb}GB bandwidth
          </p>
          <Link
            href="/hosting"
            className="mt-4 inline-block rounded-md border border-black/10 px-3 py-2 text-sm hover:bg-black/5"
          >
            View details
          </Link>
        </div>
      ))}
    </div>
  );
}
