import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { z } from "zod";

const Schema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "ACTIVE", "EXPIRED"]),
});

export async function PUT(req: Request, ctx: RouteContext<"/api/admin/orders/[id]">) {
  const admin = await requireAdmin();
  if (!admin.ok) return Response.json({ error: admin.error }, { status: 403 });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "VALIDATION_ERROR" }, { status: 400 });

  const updated = await db.ordersUpdateStatus(id, parsed.data.status);
  if (!updated) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  return Response.json({ ok: true, order: updated });
}

