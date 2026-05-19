import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { z } from "zod";

const CreatePaymentSchema = z.object({
  orderId: z.string().min(1),
  method: z.enum(["BKASH", "NAGAD", "ROCKET"]),
  senderNumber: z.string().min(6).max(30),
  trxId: z.string().min(4).max(80),
  amountBdt: z.number().int().min(1),
  customerPhone: z.string().min(6).max(30).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = CreatePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const auth = await requireSession();
  const isAuthed = auth.ok;

  const order = await db.ordersFindById(parsed.data.orderId);
  if (!order) return Response.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });

  if (isAuthed) {
    if (order.userId !== auth.session.sub) {
      return Response.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
    }
  } else {
    if (!parsed.data.customerPhone) {
      return Response.json({ error: "CUSTOMER_PHONE_REQUIRED" }, { status: 400 });
    }
    if (order.customerPhone !== parsed.data.customerPhone) {
      return Response.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
    }
  }

  if (parsed.data.amountBdt !== order.amountBdt) {
    return Response.json({ error: "AMOUNT_MISMATCH", expected: order.amountBdt }, { status: 400 });
  }

  let payment;
  try {
    payment = await db.paymentsCreate({
      orderId: order.id,
      method: parsed.data.method,
      senderNumber: parsed.data.senderNumber,
      trxId: parsed.data.trxId,
      amountBdt: parsed.data.amountBdt,
    });
  } catch {
    return Response.json({ error: "DUPLICATE_TRX" }, { status: 409 });
  }

  await db.logsAdd("INFO", "payment_submitted", {
    orderId: order.id,
    paymentId: payment?.id,
    by: isAuthed ? "user" : "guest",
  });

  return Response.json({ ok: true, payment }, { status: 201 });
}
