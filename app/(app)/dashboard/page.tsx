import { DashboardPageContent } from "@/components/dashboard/dashboard-page-content";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  //  modo demo (sin Prisma)
  const metrics = {
    assets: 0,
    workOrders: 0,
    pmPlans: 0,
    technicians: 0
  };

  return <DashboardPageContent metrics={metrics} />;
}
