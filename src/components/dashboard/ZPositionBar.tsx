import type { Variant } from "../../utils/ranking";

interface ZPositionBarProps {
  value: number | null | undefined;
  variant: Variant;
  compact?: boolean;
}

const CLAMP = 2.5;

const VARIANT_COLOR: Record<Variant, string> = {
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  // Indicador ausente: barra apagada, para nao sugerir uma posicao que nao existe.
  neutral: "var(--color-text-muted)",
};

export default function ZPositionBar({ value, variant, compact = false }: ZPositionBarProps) {
  const z = value ?? 0;
  const clamped = Math.max(-CLAMP, Math.min(CLAMP, z));
  const pct = ((clamped + CLAMP) / (2 * CLAMP)) * 100;
  const color = VARIANT_COLOR[variant];
  const height = compact ? 14 : 18;

  return (
    <div
      className="relative w-full"
      style={{ height }}
      title={`${value != null ? value.toFixed(3) : "—"} desvios-padrão da média`}
    >
      {/* trilha: mais densa ao centro, sugerindo a concentração de uma distribuição normal */}
      <div
        className="absolute left-0 right-0 rounded-full"
        style={{
          top: "50%",
          height: 3,
          transform: "translateY(-50%)",
          background:
            "linear-gradient(to right, transparent 0%, var(--color-border) 38%, var(--color-border) 62%, transparent 100%)",
        }}
      />
      {/* marcador central (média, z=0) */}
      <div
        className="absolute rounded-full"
        style={{
          left: "50%",
          top: "50%",
          width: 1,
          height: compact ? 8 : 10,
          transform: "translate(-50%, -50%)",
          background: "var(--color-text-muted)",
          opacity: 0.5,
        }}
      />
      {/* marcador de posição do z-score */}
      <div
        className="absolute rounded-full transition-all"
        style={{
          left: `${pct}%`,
          top: "50%",
          width: compact ? 8 : 10,
          height: compact ? 8 : 10,
          transform: "translate(-50%, -50%)",
          background: color,
          boxShadow: `0 0 0 3px color-mix(in srgb, ${color} 20%, transparent)`,
        }}
      />
    </div>
  );
}
