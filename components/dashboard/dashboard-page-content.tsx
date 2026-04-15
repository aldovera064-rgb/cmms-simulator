"use client";

import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { Panel } from "@/components/ui/panel";
import { useI18n } from "@/lib/i18n/context";

type DashboardPageContentProps = {
  metrics: {
    assets: number;
    workOrders: number;
    pmPlans: number;
    technicians: number;
  };
};

export function DashboardPageContent({ metrics }: DashboardPageContentProps) {
  const { dictionary } = useI18n();

  return (
    <div className="space-y-6">
      <DashboardHero
        description={dictionary.dashboard.description}
        title={dictionary.dashboard.title}
      />

      <DashboardSummary labels={dictionary.dashboard} metrics={metrics} />

      <Panel className="p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-accent">
          {dictionary.dashboard.foundationStatus}
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
          {dictionary.dashboard.foundationDescription}
        </p>
      </Panel>
    </div>
  );
}
