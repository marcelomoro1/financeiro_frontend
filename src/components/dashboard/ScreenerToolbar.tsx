import { Search, ChevronDown } from "lucide-react";
import { FILTER_PRESETS, type FilterId } from "../../utils/ranking";

interface ScreenerToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  activeFilter: FilterId;
  onFilterChange: (f: FilterId) => void;
  setores: string[];
  activeSetor: string;
  onSetorChange: (s: string) => void;
  resultCount: number;
  totalCount: number;
}

export default function ScreenerToolbar({
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
  setores,
  activeSetor,
  onSetorChange,
  resultCount,
  totalCount,
}: ScreenerToolbarProps) {
  return (
    <div className="card p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 mb-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[240px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-text-muted)" }}
          />
          <input
            type="text"
            placeholder="Buscar por ticker, nome ou setor..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input-field w-full pl-10 pr-4 py-2 text-sm"
          />
        </div>
        <div className="relative w-full sm:w-auto">
          <select
            value={activeSetor}
            onChange={(e) => onSetorChange(e.target.value)}
            className="input-field w-full sm:w-auto pl-3 pr-8 py-2 text-sm appearance-none cursor-pointer"
          >
            <option value="">Todos os setores</option>
            {setores.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-text-muted)" }}
          />
        </div>
        <span className="text-xs sm:text-sm tabular-nums" style={{ color: "var(--color-text-muted)" }}>
          {resultCount} de {totalCount} ações
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {FILTER_PRESETS.map((f) => {
          const active = f.id === activeFilter;
          return (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer"
              style={{
                background: active ? "var(--color-accent-muted)" : "var(--color-surface-alt)",
                color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
                border: active ? "1px solid var(--color-accent-border)" : "1px solid transparent",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
