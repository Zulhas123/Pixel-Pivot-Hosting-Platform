import { db } from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import { redirect } from "next/navigation";
import { OrderForm } from "./OrderForm";
import { PaymentForm } from "./PaymentForm";

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
      return { order: o, pkg, payments };
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-black/70">
            Signed in as {session.email} ({session.role})
          </p>
        </div>
        <div className="rounded-xl border border-black/10 bg-blue-50 px-4 py-3 text-sm text-black/70">
          Pay to:{" "}
          <span className="font-medium">
            bKash {mobile.bkashNumber || "—"} · Nagad {mobile.nagadNumber || "—"} · Rocket{" "}
            {mobile.rocketNumber || "—"}
          </span>
        </div>
      </div>

      <OrderForm
        packages={packages.map((p) => ({
          id: p.id,
          title: p.title,
          type: p.type,
          priceBdt: p.priceBdt,
        }))}
        defaultPackageId={packageId ?? null}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your orders</h2>
        {orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/20 p-6 text-sm text-black/70">
            No orders yet.
          </div>
        ) : (
          <div className="space-y-3">
            {hydratedOrders.map(({ order: o, pkg, payments }) => {
              const payment = payments[0] ?? null;
              return (
                <div key={o.id} className="rounded-xl border border-black/10 p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {pkg?.title ?? "Package"} · {o.domain}
                      </p>
                      <p className="mt-1 text-sm text-black/70">
                        Duration: {o.durationMo} months · Amount: ৳{o.amountBdt}
                      </p>
                    </div>
                    <span className="rounded-full bg-black/5 px-3 py-1 text-xs">
                      {o.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-black/10 p-4">
                      <h4 className="font-medium">Invoice</h4>
                      <p className="mt-2 text-sm text-black/70">
                        Order ID: {o.id}
                        <br />
                        Pay ৳{o.amountBdt} via bKash/Nagad/Rocket and submit the
                        transaction details.
                      </p>
                    </div>
                    {payment ? (
                      <div className="rounded-lg border border-black/10 p-4">
                        <h4 className="font-medium">Payment</h4>
                        <p className="mt-2 text-sm text-black/70">
                          Method: {payment.method}
                          <br />
                          TrxID: {payment.trxId}
                          <br />
                          Status: {payment.status}
                        </p>
                      </div>
                    ) : (
                      <PaymentForm orderId={o.id} amountBdt={o.amountBdt} />
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
