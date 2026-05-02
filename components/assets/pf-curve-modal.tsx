"use client";

import { Modal } from "@/components/ui/modal";

type PFCurveModalProps = {
  open: boolean;
  onClose: () => void;
  asset: {
    name: string;
    tag: string;
    temperature: number | null;
    vibration: number | null;
    pressure: number | null;
    alertThreshold: number | null;
  };
};

type PFZone = {
  label: string;
  labelEn: string;
  color: string;
  bgColor: string;
  min: number;
  max: number;
};

const ZONES: PFZone[] = [
  { label: "Normal", labelEn: "Normal", color: "#22c55e", bgColor: "#22c55e20", min: 0, max: 0.3 },
  { label: "Degradación", labelEn: "Degradation", color: "#eab308", bgColor: "#eab30820", min: 0.3, max: 0.6 },
  { label: "Riesgo", labelEn: "Risk", color: "#f97316", bgColor: "#f9731620", min: 0.6, max: 0.85 },
  { label: "Crítico", labelEn: "Critical", color: "#ef4444", bgColor: "#ef444420", min: 0.85, max: 1.0 }
];

function calculatePFScore(
  temperature: number | null,
  vibration: number | null,
  pressure: number | null,
  threshold: number | null
): number {
  if (!threshold || threshold <= 0) return 0;

  const t = temperature ?? 0;
  const v = vibration ?? 0;
  const p = pressure ?? 0;

  const score = (t / threshold + v / threshold + p / threshold) / 3;
  return Math.min(1, Math.max(0, score));
}

function getZone(score: number): PFZone {
  for (const zone of ZONES) {
    if (score >= zone.min && score < zone.max) return zone;
  }
  return ZONES[ZONES.length - 1];
}

export function PFCurveModal({ open, onClose, asset }: PFCurveModalProps) {
  const score = calculatePFScore(asset.temperature, asset.vibration, asset.pressure, asset.alertThreshold);
  const zone = getZone(score);
  const isCritical = score >= 0.85;

  // SVG dimensions
  const W = 500;
  const H = 280;
  const PAD_L = 45;
  const PAD_R = 15;
  const PAD_T = 20;
  const PAD_B = 40;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  // P-F curve points (exponential decay shape)
  const curvePoints: Array<[number, number]> = [];
  for (let i = 0; i <= 100; i++) {
    const t = i / 100; // 0 to 1 along X axis
    // Classic P-F curve: condition degrades slowly then rapidly
    const condition = 1 - Math.pow(t, 2.5);
    const x = PAD_L + t * chartW;
    const y = PAD_T + (1 - condition) * chartH;
    curvePoints.push([x, y]);
  }

  const curvePath = curvePoints.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

  // Current position on curve
  const currentX = PAD_L + score * chartW;
  const currentCondition = 1 - Math.pow(score, 2.5);
  const currentY = PAD_T + (1 - currentCondition) * chartH;

  return (
    <Modal open={open} onClose={onClose} title={`Curva P-F — ${asset.name || asset.tag}`}>
      <div className="space-y-4">
        {/* Critical alert banner */}
        {isCritical && (
          <div className="flex items-center gap-3 rounded-xl bg-danger/10 border border-danger/30 px-4 py-3 animate-pulse-danger">
            <span className="text-danger text-lg">⚠</span>
            <div>
              <p className="text-sm font-semibold text-danger">Zona Crítica</p>
              <p className="text-xs text-danger/80">Este activo requiere intervención inmediata.</p>
            </div>
          </div>
        )}

        {/* SVG Chart */}
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minWidth: 400 }}>
            {/* Zone backgrounds */}
            {ZONES.map((z) => {
              const y1 = PAD_T + (1 - (1 - Math.pow(z.min, 2.5))) * chartH;
              const y2 = PAD_T + (1 - (1 - Math.pow(z.max, 2.5))) * chartH;
              const x1 = PAD_L + z.min * chartW;
              const x2 = PAD_L + z.max * chartW;
              return (
                <rect
                  key={z.label}
                  x={x1}
                  y={PAD_T}
                  width={x2 - x1}
                  height={chartH}
                  fill={z.bgColor}
                  stroke={z.color}
                  strokeWidth="0.5"
                  strokeDasharray="4 2"
                  opacity={0.6}
                />
              );
            })}

            {/* Zone labels at top */}
            {ZONES.map((z) => {
              const cx = PAD_L + ((z.min + z.max) / 2) * chartW;
              return (
                <text
                  key={`label-${z.label}`}
                  x={cx}
                  y={PAD_T + 14}
                  textAnchor="middle"
                  className="text-[9px] font-medium"
                  fill={z.color}
                >
                  {z.label}
                </text>
              );
            })}

            {/* Y-axis label */}
            <text x={8} y={PAD_T + chartH / 2} textAnchor="middle" transform={`rotate(-90 8 ${PAD_T + chartH / 2})`} className="text-[10px]" fill="var(--color-muted)">
              Condición
            </text>

            {/* X-axis label */}
            <text x={PAD_L + chartW / 2} y={H - 5} textAnchor="middle" className="text-[10px]" fill="var(--color-muted)">
              Degradación →
            </text>

            {/* Y-axis ticks */}
            {[0, 25, 50, 75, 100].map((pct) => {
              const y = PAD_T + (1 - pct / 100) * chartH;
              return (
                <g key={`y-${pct}`}>
                  <line x1={PAD_L - 4} y1={y} x2={PAD_L} y2={y} stroke="var(--color-muted)" strokeWidth="1" />
                  <text x={PAD_L - 7} y={y + 3} textAnchor="end" className="text-[9px]" fill="var(--color-muted)">
                    {pct}%
                  </text>
                </g>
              );
            })}

            {/* Axes */}
            <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + chartH} stroke="var(--color-border)" strokeWidth="1" />
            <line x1={PAD_L} y1={PAD_T + chartH} x2={PAD_L + chartW} y2={PAD_T + chartH} stroke="var(--color-border)" strokeWidth="1" />

            {/* P-F Curve */}
            <path d={curvePath} fill="none" stroke="var(--color-foreground)" strokeWidth="2.5" strokeLinecap="round" />

            {/* Current position marker */}
            <circle cx={currentX} cy={currentY} r="7" fill={zone.color} stroke="white" strokeWidth="2.5" />
            <circle cx={currentX} cy={currentY} r="3" fill="white" />

            {/* Dashed lines from dot to axes */}
            <line x1={currentX} y1={currentY} x2={currentX} y2={PAD_T + chartH} stroke={zone.color} strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
            <line x1={PAD_L} y1={currentY} x2={currentX} y2={currentY} stroke={zone.color} strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
          </svg>
        </div>

        {/* Status */}
        <div className="flex items-center gap-4 rounded-xl border border-border bg-panelAlt p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: zone.bgColor }}>
            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: zone.color }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Estado: {zone.label}</p>
            <p className="text-xs text-muted">PF Score: {(score * 100).toFixed(1)}%</p>
          </div>
        </div>

        {/* Sensor readings */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-border bg-panelAlt p-3">
            <p className="text-xs text-muted">Temperatura</p>
            <p className="text-lg font-semibold">{asset.temperature ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-panelAlt p-3">
            <p className="text-xs text-muted">Vibración</p>
            <p className="text-lg font-semibold">{asset.vibration ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-panelAlt p-3">
            <p className="text-xs text-muted">Presión</p>
            <p className="text-lg font-semibold">{asset.pressure ?? 0}</p>
          </div>
        </div>
        <p className="text-xs text-muted text-center">Umbral: {asset.alertThreshold ?? "No definido"}</p>
      </div>
    </Modal>
  );
}
