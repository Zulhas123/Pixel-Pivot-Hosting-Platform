import { getSessionOrNull } from "@/lib/session";

export async function GET() {
  const session = await getSessionOrNull();
  if (!session) return Response.json({ user: null });
  return Response.json({
    user: {
      id: session.sub,
      role: session.role,
      username: session.username,
      email: session.email ?? null,
      name: session.name,
    },
  });
}
