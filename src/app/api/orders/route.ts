import { db } from "@/lib/db";
import { requireAdmin, requireSession } from "@/lib/session";
import { z } from "zod";

const CreateOrderSchema = z.object({
  packageId: z.string().min(1),
  domain: z.string().min(1).max(253),
  durationMo: z.number().int().min(1).max(60),
  customerName: z.string().min(2).max(80).optional(),
  customerPhone: z.string().min(6).max(30).optional(),
  customerEmail: z.string().email().max(200).optional(),
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
          o.userId ? db.usersFindById(o.userId) : Promise.resolve(null),
          db.packagesFindById(o.packageId),
          db.paymentsFindForOrder(o.id),
        ]);
        return {
          ...o,
          user: user
            ? { id: user.id, email: user.email, name: user.name }
            : { id: o.userId ?? "guest", email: "guest", name: o.customerName ?? "Guest" },
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

  const auth = await requireSession();
  const isAuthed = auth.ok;

  if (!isAuthed) {
    if (!parsed.data.customerName || !parsed.data.customerPhone) {
      return Response.json({ error: "CUSTOMER_INFO_REQUIRED" }, { status: 400 });
    }
  }

  const userPhone = isAuthed ? (await db.usersFindById(auth.session.sub))?.phone ?? "" : "";
  const customerName = isAuthed ? auth.session.name : parsed.data.customerName ?? "Customer";
  const customerPhone = isAuthed ? userPhone : parsed.data.customerPhone ?? "";

  const order = await db.ordersCreate({
    userId: isAuthed ? auth.session.sub : null,
    packageId: pkg.id,
    domain: parsed.data.domain.toLowerCase(),
    customerName,
    customerPhone,
    customerEmail: isAuthed ? (auth.session.email ?? "") : parsed.data.customerEmail ?? "",
    durationMo: parsed.data.durationMo,
    amountBdt,
  });

  await db.logsAdd("INFO", "order_created", {
    orderId: order?.id,
    packageId: pkg.id,
    domain: parsed.data.domain,
    by: isAuthed ? "user" : "guest",
  });

  return Response.json(
    {
      ok: true,
      order: { ...order, package: pkg, payments: [] },
    },
    { status: 201 },
  );
}
