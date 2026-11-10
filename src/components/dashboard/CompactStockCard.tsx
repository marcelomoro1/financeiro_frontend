import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { RankingItem, Variant } from "../../utils/ranking";

interface CompactStockCardProps {
  item: RankingItem;
  badgeLabel: string;
  variant: Variant;
  onClick: () => void;
}

export default function CompactStockCard({ item, badgeLabel, variant, onClick }: CompactStockCardProps) {
  const base = item.ticker.replace(".SA", "");
  const variacao = item.variacaoDiaPercentual;

  return (
    <button onClick={onClick} className="card card-hover w-full p-2.5 flex items-center gap-2.5 text-left cursor-pointer">
      <img
        src={`/logos/${base}.svg`}
        alt=""
        className="w-7 h-7 rounded-full shrink-0 object-contain"
        style={{ background: "var(--color-surface-alt)" }}
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text)" }}>
            {base}
          </span>
          <span className={`badge-${variant}`} style={{ fontSize: "9px", padding: "1px 6px" }}>{badgeLabel}</span>
        </div>
        <div className="text-[11px] truncate" style={{ color: "var(--color-text-muted)" }}>
          {item.nome}
        </div>
      </div>
      <div className="text-right shrink-0">
        {item.ultimoPreco != null && (
          <div className="text-xs font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text)" }}>
            R$ {item.ultimoPreco.toFixed(2)}
          </div>
        )}
        {variacao == null ? (
          <div className="flex items-center justify-end gap-0.5 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            <Minus size={11} />
          </div>
        ) : (
          <div
            className="flex items-center justify-end gap-0.5 text-[11px] font-medium"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: variacao >= 0 ? "var(--color-success)" : "var(--color-danger)" }}
          >
            {variacao >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(variacao).toFixed(2)}%
          </div>
        )}
      </div>
    </button>
  );
}
