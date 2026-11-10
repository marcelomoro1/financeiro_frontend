import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Radio } from "lucide-react";
import api from "../services/api";
import { FILTER_PRESETS, type FilterId, type RankingItem } from "../utils/ranking";
import SpotlightColumns from "../components/dashboard/SpotlightColumns";
import ScreenerToolbar from "../components/dashboard/ScreenerToolbar";
import RankingTable, { type SortDir, type SortField } from "../components/dashboard/RankingTable";

interface StatusData {
  ultimaAtualizacaoPrecos: string | null;
}

function formatRelativeMinutes(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60_000));
  if (minutes < 1) return "agora mesmo";
  if (minutes === 1) return "há 1 minuto";
  return `há ${minutes} minutos`;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterId>("todas");
  const [activeSetor, setActiveSetor] = useState("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: ranking, isLoading } = useQuery<RankingItem[]>({
    queryKey: ["ranking"],
    queryFn: () => api.get("/dashboard/ranking").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: status } = useQuery<StatusData>({
    queryKey: ["status"],
    queryFn: () => api.get("/dashboard/status").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const setores = useMemo(() => {
    if (!ranking) return [];
    return [...new Set(ranking.map((r) => r.setor).filter(Boolean))].sort();
  }, [ranking]);

  const filtrado = useMemo(() => {
    if (!ranking) return [];
    const preset = FILTER_PRESETS.find((f) => f.id === activeFilter);
    let result = preset ? ranking.filter(preset.predicate) : ranking;

    if (activeSetor) {
      result = result.filter((r) => r.setor === activeSetor);
    }

    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (r) =>
          r.ticker.toLowerCase().includes(q) ||
          r.nome.toLowerCase().includes(q) ||
          r.setor.toLowerCase().includes(q)
      );
    }

    if (sortField) {
      result = [...result].sort((a, b) => {
        const va = sortField === "zqual" ? a.zQualidade ?? -999 : a.zValorMomento ?? -999;
        const vb = sortField === "zqual" ? b.zQualidade ?? -999 : b.zValorMomento ?? -999;
        return sortDir === "desc" ? vb - va : va - vb;
      });
    }

    return result;
  }, [ranking, search, activeFilter, activeSetor, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function handleClearFilters() {
    setSearch("");
    setActiveFilter("todas");
    setActiveSetor("");
  }

  function goToTicker(ticker: string) {
    navigate(`/acao/${ticker}`);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div
            className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
          />
          <p style={{ color: "var(--color-text-muted)" }}>Carregando dados do mercado...</p>
        </div>
      </div>
    );
  }

  const relativeUpdate = formatRelativeMinutes(status?.ultimaAtualizacaoPrecos ?? null);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col items-start sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: "var(--color-text)" }}>
            Dashboard
          </h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm" style={{ color: "var(--color-text-muted)" }}>
            Análise fundamentalista quantitativa — Modelo Asness
          </p>
        </div>
        {relativeUpdate && (
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs" style={{ color: "var(--color-text-muted)" }}>
            <Radio size={12} style={{ color: "var(--color-success)" }} />
            Preços atualizados {relativeUpdate} · {ranking?.length || 0} ações no radar
          </div>
        )}
      </div>

      <SpotlightColumns ranking={ranking || []} onSelect={goToTicker} />

      <ScreenerToolbar
        search={search}
        onSearchChange={setSearch}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        setores={setores}
        activeSetor={activeSetor}
        onSetorChange={setActiveSetor}
        resultCount={filtrado.length}
        totalCount={ranking?.length || 0}
      />

      <RankingTable
        items={filtrado}
        sortField={sortField}
        sortDir={sortDir}
        onSort={handleSort}
        onRowClick={goToTicker}
        onClearFilters={handleClearFilters}
        hasActiveFilters={search.trim() !== "" || activeFilter !== "todas" || activeSetor !== ""}
      />
    </div>
  );
}
