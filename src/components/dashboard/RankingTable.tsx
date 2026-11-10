import { ChevronsUpDown, ChevronUp, ChevronDown, SearchX } from "lucide-react";
import { Q_VARIANT, S_VARIANT, variante, rotulo, type RankingItem } from "../../utils/ranking";
import ZPositionBar from "./ZPositionBar";

export type SortField = "zqual" | "zvm";
export type SortDir = "asc" | "desc";

interface RankingTableProps {
  items: RankingItem[];
  sortField: SortField | null;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  onRowClick: (ticker: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField | null; sortDir: SortDir }) {
  if (sortField !== field) return <ChevronsUpDown size={12} className="opacity-30" />;
  return sortDir === "asc" ? (
    <ChevronUp size={12} style={{ color: "var(--color-accent)" }} />
  ) : (
    <ChevronDown size={12} style={{ color: "var(--color-accent)" }} />
  );
}

function EmptyState({
  onClearFilters,
  hasActiveFilters,
}: {
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}) {
  return (
    <>
      <SearchX size={28} className="mx-auto mb-3" style={{ color: "var(--color-text-muted)" }} />
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
        Nenhuma ação encontrada
      </p>
      {hasActiveFilters && (
        <button onClick={onClearFilters} className="btn-primary px-4 py-2 text-sm cursor-pointer">
          Limpar filtros
        </button>
      )}
    </>
  );
}

const TH_CLASS = "text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider";

export default function RankingTable({
  items,
  sortField,
  sortDir,
  onSort,
  onRowClick,
  onClearFilters,
  hasActiveFilters,
}: RankingTableProps) {
  return (
    <div className="card overflow-hidden">
      {/* Mobile: lista em cards */}
      <div className="md:hidden">
        <div
          className="flex items-center justify-between gap-2 px-4 py-2.5 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            Ordenar
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSort("zqual")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer"
              style={{ background: "var(--color-surface-alt)", color: "var(--color-text-secondary)" }}
            >
              Qualidade
              <SortIcon field="zqual" sortField={sortField} sortDir={sortDir} />
            </button>
            <button
              onClick={() => onSort("zvm")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer"
              style={{ background: "var(--color-surface-alt)", color: "var(--color-text-secondary)" }}
            >
              Sinal
              <SortIcon field="zvm" sortField={sortField} sortDir={sortDir} />
            </button>
          </div>
        </div>

        {items.map((r, i) => (
          <button
            key={r.ticker}
            onClick={() => onRowClick(r.ticker)}
            className={`w-full text-left px-4 py-3 transition-colors ${i > 0 ? "border-t" : ""}`}
            style={{ borderColor: "var(--color-border-light)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-semibold"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text)" }}
                  >
                    {r.ticker.replace(".SA", "")}
                  </span>
                  <span
                    className={`badge-${variante(Q_VARIANT, r.classificacaoQualidade)}`}
                    style={{ fontSize: "9px", padding: "1px 6px" }}
                  >
                    {rotulo(r.classificacaoQualidade)}
                  </span>
                </div>
                <div className="text-[11px] truncate mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  {r.nome?.split(" ").slice(0, 3).join(" ")}
                  {r.setor && <span style={{ color: "var(--color-text-muted)" }}> · {r.setor}</span>}
                </div>
              </div>
              <span
                className={`badge-${variante(S_VARIANT, r.sinalVM)} flex-shrink-0`}
                style={{ fontSize: "9px", padding: "1px 6px" }}
              >
                {rotulo(r.sinalVM)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--color-text-muted)" }}>
                  Qualidade
                </div>
                <ZPositionBar value={r.zQualidade} variant={variante(Q_VARIANT, r.classificacaoQualidade)} compact />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--color-text-muted)" }}>
                  Sinal
                </div>
                <ZPositionBar value={r.zValorMomento} variant={variante(S_VARIANT, r.sinalVM)} compact />
              </div>
            </div>
          </button>
        ))}

        {items.length === 0 && (
          <div className="px-5 py-12 text-center">
            <EmptyState onClearFilters={onClearFilters} hasActiveFilters={hasActiveFilters} />
          </div>
        )}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
              <th className={TH_CLASS} style={{ color: "var(--color-text-muted)" }}>Ticker</th>
              <th className={TH_CLASS} style={{ color: "var(--color-text-muted)" }}>Empresa</th>
              <th className={`${TH_CLASS} hidden md:table-cell`} style={{ color: "var(--color-text-muted)" }}>Setor</th>
              <th className={TH_CLASS} style={{ color: "var(--color-text-muted)" }}>
                <button
                  onClick={() => onSort("zqual")}
                  className="inline-flex items-center gap-1 hover:text-[var(--color-text)] transition-colors cursor-pointer"
                >
                  Qualidade
                  <SortIcon field="zqual" sortField={sortField} sortDir={sortDir} />
                </button>
              </th>
              <th className={TH_CLASS} style={{ color: "var(--color-text-muted)" }}>
                <button
                  onClick={() => onSort("zvm")}
                  className="inline-flex items-center gap-1 hover:text-[var(--color-text)] transition-colors cursor-pointer"
                >
                  Sinal
                  <SortIcon field="zvm" sortField={sortField} sortDir={sortDir} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--color-border-light)" }}>
            {items.map((r) => (
              <tr
                key={r.ticker}
                onClick={() => onRowClick(r.ticker)}
                className="cursor-pointer transition-colors"
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <td className="px-5 py-3">
                  <span
                    className="text-sm font-semibold"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text)" }}
                  >
                    {r.ticker.replace(".SA", "")}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="text-sm truncate max-w-[220px]" style={{ color: "var(--color-text-secondary)" }}>
                    {r.nome?.split(" ").slice(0, 3).join(" ")}
                  </div>
                </td>
                <td className="px-5 py-3 hidden md:table-cell">
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{r.setor}</span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-col gap-1.5 max-w-[140px]">
                    <span className={`badge-${variante(Q_VARIANT, r.classificacaoQualidade)}`}>{rotulo(r.classificacaoQualidade)}</span>
                    <ZPositionBar value={r.zQualidade} variant={variante(Q_VARIANT, r.classificacaoQualidade)} compact />
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-col gap-1.5 max-w-[140px]">
                    <span className={`badge-${variante(S_VARIANT, r.sinalVM)}`}>{rotulo(r.sinalVM)}</span>
                    <ZPositionBar value={r.zValorMomento} variant={variante(S_VARIANT, r.sinalVM)} compact />
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-14 text-center">
                  <EmptyState onClearFilters={onClearFilters} hasActiveFilters={hasActiveFilters} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
