import { db } from "@/lib/db";
import { requireAdmin, requireSession } from "@/lib/session";
import { z } from "zod";

const CreateOrderSchema = z.object({
  packageId: z.string().min(1),
  domain: z.string().min(1).max(253),
  durationMo: z.number().int().min(1).max(60),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const all = url.searchParams.get("all") === "1";
  if (all) {
    const admin = await requireAdmin();
    if (!admin.ok) return Response.json({ error: admin.error }, { status: 403 });
    const orders = await db.ordersFindAll();
    const hydrated = await Promise.all(
      orders.map(async (o) => {
        const [user, pkg, payments] = await Promise.all([
          db.usersFindById(o.userId),
          db.packagesFindById(o.packageId),
          db.paymentsFindForOrder(o.id),
        ]);
        return {
          ...o,
          user: user
            ? { id: user.id, email: user.email, name: user.name }
            : { id: o.userId, email: "unknown", name: "Unknown" },
          package: pkg ?? { id: o.packageId, title: "Unknown package", type: "", priceBdt: 0, storageGb: 0, bandwidthGb: 0, features: "", isActive: false, createdAt: new Date(0), updatedAt: new Date(0) },
          payments,
        };
      }),
    );
    return Response.json({ orders: hydrated });
  }

  const auth = await requireSession();
  if (!auth.ok) return Response.json({ error: auth.error }, { status: 401 });

  const orders = await db.ordersFindForUser(auth.session.sub);
  const hydrated = await Promise.all(
    orders.map(async (o) => {
      const [pkg, payments] = await Promise.all([
        db.packagesFindById(o.packageId),
        db.paymentsFindForOrder(o.id),
      ]);
      return { ...o, package: pkg, payments };
    }),
  );
  return Response.json({ orders: hydrated });
}

export async function POST(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return Response.json({ error: auth.error }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const pkg = await db.packagesFindById(parsed.data.packageId);
  if (!pkg || !pkg.isActive) return Response.json({ error: "PACKAGE_NOT_FOUND" }, { status: 404 });

  const amountBdt = pkg.priceBdt * parsed.data.durationMo;

  const order = await db.ordersCreate({
    userId: auth.session.sub,
    packageId: pkg.id,
    domain: parsed.data.domain.toLowerCase(),
    durationMo: parsed.data.durationMo,
    amountBdt,
  });

  return Response.json({ ok: true, order: { ...order, package: pkg, payments: [] } }, { status: 201 });
}
