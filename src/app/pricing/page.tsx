import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pricing</h1>
        <p className="mt-2 text-sm text-black/70">
          Pricing depends on the package you select. View plans to get started.
        </p>
      </div>
      <Link
        href="/hosting"
        className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        View hosting plans
      </Link>
    </div>
  );
}

