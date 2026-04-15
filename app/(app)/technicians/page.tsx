import { TechniciansPageClient } from "@/components/technicians/technicians-page-client";

export const dynamic = "force-dynamic";

export default function TechniciansPage() {
  return <TechniciansPageClient initialTechnicians={[]} />;
}
