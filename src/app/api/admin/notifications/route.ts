import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return Response.json({ error: admin.error }, { status: 403 });

  const [pendingOrders, pendingPayments, recent] = await Promise.all([
    db.ordersCountByStatus("PENDING"),
    db.paymentsCountByStatus("SUBMITTED"),
    db.ordersListRecent(5),
  ]);

  return Response.json({
    pendingOrders,
    pendingPayments,
    recent: recent.map((o) => ({
      id: o.id,
      domain: o.domain,
      amountBdt: o.amountBdt,
      status: o.status,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      createdAt: o.createdAt.toISOString(),
    })),
  });
}

