import { Panel } from "@/components/ui/panel";

type DashboardSummaryProps = {
  metrics: {
    assets: number;
    workOrders: number;
    pmPlans: number;
    technicians: number;
  };
  labels: {
    assets: string;
    workOrders: string;
    pmPlans: string;
    technicians: string;
  };
};

export function DashboardSummary({ metrics, labels }: DashboardSummaryProps) {
  const cards = [
    { label: labels.assets, value: metrics.assets },
    { label: labels.workOrders, value: metrics.workOrders },
    { label: labels.pmPlans, value: metrics.pmPlans },
    { label: labels.technicians, value: metrics.technicians }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Panel className="p-5" key={card.label}>
          <p className="text-sm text-muted">{card.label}</p>
          <p className="mt-4 text-4xl font-semibold tracking-tight">{card.value}</p>
        </Panel>
      ))}
    </div>
  );
}
