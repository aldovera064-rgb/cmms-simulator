import { Panel } from "@/components/ui/panel";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  nextPhaseLabel: string;
};

export function ModulePlaceholder({
  title,
  description,
  nextPhaseLabel
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      <Panel className="industrial-grid overflow-hidden p-8">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs uppercase tracking-[0.28em] text-accent">{nextPhaseLabel}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm leading-6 text-muted">{description}</p>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          "Modelo de datos listo",
          "Ruta y navegación conectadas",
          "Preparado para CRUD y lógica"
        ].map((item) => (
          <Panel className="p-5" key={item}>
            <div className="text-sm text-muted">{item}</div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
