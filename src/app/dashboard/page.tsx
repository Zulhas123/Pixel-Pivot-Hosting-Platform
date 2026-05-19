import { db } from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import { redirect } from "next/navigation";
import { CustomerDashboardClient } from "./CustomerDashboardClient";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ packageId?: string }>;
}) {
  const session = await getSessionOrNull();
  if (!session) redirect("/login");

  const { packageId } = await searchParams;

  const [packages, orders, mobile] = await Promise.all([
    db.packagesFindActive(),
    db.ordersFindForUser(session.sub),
    db.mobileSettingsGet(),
  ]);

  const hydratedOrders = await Promise.all(
    orders.map(async (o) => {
      const [pkg, payments] = await Promise.all([
        db.packagesFindById(o.packageId),
        db.paymentsFindForOrder(o.id),
      ]);
      return {
        id: o.id,
        domain: o.domain,
        durationMo: o.durationMo,
        amountBdt: o.amountBdt,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        package: pkg
          ? { id: pkg.id, title: pkg.title, type: pkg.type, priceBdt: pkg.priceBdt }
          : null,
        payments: payments.map((p) => ({
          id: p.id,
          method: p.method,
          trxId: p.trxId,
          amountBdt: p.amountBdt,
          status: p.status,
        })),
      };
    }),
  );

  if (packages.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="rounded-xl border border-dashed border-black/20 p-6 text-sm text-black/70">
          No packages are available yet. Please check back later.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-black/70">Signed in as {session.username}</p>
        </div>
      </div>

      <CustomerDashboardClient
        initialPackages={packages.map((p) => ({
          id: p.id,
          title: p.title,
          type: p.type,
          priceBdt: p.priceBdt,
        }))}
        initialOrders={hydratedOrders}
        initialMobile={mobile}
        defaultPackageId={packageId ?? null}
      />
    </div>
  );
}
