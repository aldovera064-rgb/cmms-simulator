import { prisma } from "@/lib/prisma";
import { DashboardPageContent } from "@/components/dashboard/dashboard-page-content";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [assets, workOrders, pmPlans, technicians] = await Promise.all([
    prisma.asset.count(),
    prisma.workOrder.count(),
    prisma.pmPlan.count(),
    prisma.technician.count()
  ]);

  return <DashboardPageContent metrics={{ assets, workOrders, pmPlans, technicians }} />;
}
