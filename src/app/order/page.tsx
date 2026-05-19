import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { OrderClient } from "./OrderClient";

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ packageId?: string }>;
}) {
  const { packageId } = await searchParams;
  if (!packageId) redirect("/hosting");

  const pkg = await db.packagesFindById(packageId);
  if (!pkg || !pkg.isActive) redirect("/hosting");

  return <OrderClient packageId={pkg.id} packageTitle={pkg.title} priceBdt={pkg.priceBdt} />;
}

