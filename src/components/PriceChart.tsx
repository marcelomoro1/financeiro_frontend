import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import api from "../services/api";

interface PriceChartProps {
  ticker: string;
}

interface PricePoint {
  data: string;
  preco: number | null;
}

type RangeId = "1s" | "1m" | "6m" | "1a" | "3a" | "tudo";

const RANGES: { id: RangeId; label: string }[] = [
  { id: "1s", label: "1S" },
  { id: "1m", label: "1M" },
  { id: "6m", label: "6M" },
  { id: "1a", label: "1A" },
  { id: "3a", label: "3A" },
  { id: "tudo", label: "Tudo" },
];

function formatAxisDate(dateStr: string, longRange: boolean) {
  const d = new Date(dateStr);
  return longRange
    ? d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function PriceChart({ ticker }: PriceChartProps) {
  const [range, setRange] = useState<RangeId>("1m");

  const { data, isLoading } = useQuery<PricePoint[]>({
    queryKey: ["historico", ticker, range],
    queryFn: () => api.get(`/dashboard/historico/${ticker}`, { params: { range } }).then((r) => r.data),
    enabled: !!ticker,
    staleTime: 5 * 60_000,
  });

  const filtered = useMemo(() => (data || []).filter((p) => p.preco != null), [data]);

  const variacao = useMemo(() => {
    if (filtered.length < 2) return null;
    const first = filtered[0].preco!;
    const last = filtered[filtered.length - 1].preco!;
    if (!first) return null;
    return ((last - first) / first) * 100;
  }, [filtered]);

  const positive = (variacao ?? 0) >= 0;
  const color = positive ? "var(--color-success)" : "var(--color-danger)";
  const longRange = range === "1a" || range === "3a" || range === "tudo";

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
            Histórico de preço
          </h3>
          {variacao != null && (
            <span className="text-sm font-semibold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color }}>
              {positive ? "+" : ""}{variacao.toFixed(2)}%
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer"
              style={{
                background: range === r.id ? "var(--color-accent-muted)" : "transparent",
                color: range === r.id ? "var(--color-accent)" : "var(--color-text-secondary)",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-sm" style={{ color: "var(--color-text-muted)" }}>
          Carregando histórico...
        </div>
      ) : filtered.length < 2 ? (
        <div className="h-64 flex items-center justify-center text-sm" style={{ color: "var(--color-text-muted)" }}>
          Histórico insuficiente para este período
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filtered} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`priceFill-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="data"
                tickFormatter={(v) => formatAxisDate(v, longRange)}
                tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                axisLine={false}
                tickLine={false}
                width={54}
                tickFormatter={(v) => `R$${Number(v).toFixed(0)}`}
              />
              <Tooltip
                formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, "Preço"]}
                labelFormatter={(v) => new Date(v).toLocaleDateString("pt-BR")}
              />
              <Area
                type="monotone"
                dataKey="preco"
                stroke={color}
                strokeWidth={2}
                fill={`url(#priceFill-${ticker})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
