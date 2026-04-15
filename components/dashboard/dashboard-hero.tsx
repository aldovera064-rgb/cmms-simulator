import { Panel } from "@/components/ui/panel";

type DashboardHeroProps = {
  title: string;
  description: string;
};

export function DashboardHero({ title, description }: DashboardHeroProps) {
  return (
    <Panel className="industrial-grid overflow-hidden p-8">
      <div className="max-w-3xl space-y-4">
        <p className="text-xs uppercase tracking-[0.26em] text-accent">Phase 1 Foundation</p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        <p className="max-w-2xl text-sm leading-7 text-muted">{description}</p>
      </div>
    </Panel>
  );
}
