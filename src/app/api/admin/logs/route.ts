import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return Response.json({ error: admin.error }, { status: 403 });

  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "50")));
  const logs = await db.logsList(limit);
  return Response.json({
    logs: logs.map((l) => ({
      id: l.id,
      level: l.level,
      message: l.message,
      meta: l.meta,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}

