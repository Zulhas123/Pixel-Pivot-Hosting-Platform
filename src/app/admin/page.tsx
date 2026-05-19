import { getSessionOrNull } from "@/lib/session";
import { redirect } from "next/navigation";
import { AdminPanel } from "./AdminPanel";

export default async function AdminPage() {
  const session = await getSessionOrNull();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Panel</h1>
        <p className="mt-2 text-sm text-black/70">
          Manage packages, verify payments, and configure mobile banking numbers.
        </p>
      </div>
      <AdminPanel />
    </div>
  );
}

