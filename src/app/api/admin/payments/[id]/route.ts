import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { z } from "zod";

const UpdatePaymentSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function PUT(req: Request, ctx: RouteContext<"/api/admin/payments/[id]">) {
  const admin = await requireAdmin();
  if (!admin.ok) return Response.json({ error: admin.error }, { status: 403 });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = UpdatePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await db.paymentsUpdateStatus(id, parsed.data.status);

  if (parsed.data.status === "APPROVED") {
    if (updated) await db.ordersUpdateStatus(updated.orderId, "APPROVED");
  }

  await db.logsAdd("INFO", "payment_status_updated", {
    paymentId: id,
    status: parsed.data.status,
    adminId: admin.session.sub,
  });

  return Response.json({ ok: true, payment: updated });
}
