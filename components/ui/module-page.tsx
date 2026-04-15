"use client";

import { ModulePlaceholder } from "@/components/ui/module-placeholder";
import { useI18n } from "@/lib/i18n/context";

type ModuleKey =
  | "assets"
  | "workOrders"
  | "pmPlans"
  | "spareParts"
  | "technicians";

export function ModulePage({ moduleKey }: { moduleKey: ModuleKey }) {
  const { dictionary } = useI18n();

  return (
    <ModulePlaceholder
      description={dictionary.modules.description}
      nextPhaseLabel={dictionary.modules.comingSoon}
      title={dictionary.navigation[moduleKey]}
    />
  );
}
