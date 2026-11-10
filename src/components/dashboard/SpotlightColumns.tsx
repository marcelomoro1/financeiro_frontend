import { useMemo } from "react";
import { Q_VARIANT, S_VARIANT, variante, rotulo, type FilterId, type RankingItem, type Variant } from "../../utils/ranking";
import CompactStockCard from "./CompactStockCard";

interface SpotlightColumnsProps {
  ranking: RankingItem[];
  onSelect: (ticker: string) => void;
}

function pickSpotlight(ranking: RankingItem[], tab: FilterId): RankingItem[] {
  switch (tab) {
    case "alta":
      return [...ranking].sort((a, b) => (b.zQualidade ?? -999) - (a.zQualidade ?? -999)).slice(0, 6);
    case "baixa":
      return [...ranking].sort((a, b) => (a.zQualidade ?? 999) - (b.zQualidade ?? 999)).slice(0, 6);
    case "compra":
      return ranking
        .filter((r) => r.sinalVM === "Compra")
        .sort((a, b) => (b.zValorMomento ?? -999) - (a.zValorMomento ?? -999))
        .slice(0, 6);
    case "venda":
      return ranking
        .filter((r) => r.sinalVM === "Venda")
        .sort((a, b) => (a.zValorMomento ?? 999) - (b.zValorMomento ?? 999))
        .slice(0, 6);
    default:
      return [];
  }
}

const EMPTY_MESSAGE: Record<string, string> = {
  alta: "Nenhuma ação de alta qualidade no momento.",
  baixa: "Nenhuma ação de baixa qualidade no momento.",
  compra: "Nenhuma ação com sinal de compra no momento.",
  venda: "Nenhuma ação com sinal de venda no momento.",
};

interface SpotlightColumnProps {
  title: string;
  filterId: "alta" | "baixa" | "compra" | "venda";
  items: RankingItem[];
  variantMap: Record<string, Variant>;
  classificacaoField: "classificacaoQualidade" | "sinalVM";
  onSelect: (ticker: string) => void;
}

function SpotlightColumn({ title, filterId, items, variantMap, classificacaoField, onSelect }: SpotlightColumnProps) {
  return (
    <div className="min-w-[78%] snap-start md:min-w-0">
      <h3 className="text-sm font-semibold mb-2 sm:mb-3" style={{ color: "var(--color-text)" }}>
        {title}
      </h3>
      {items.length === 0 ? (
        <div className="card p-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
          {EMPTY_MESSAGE[filterId]}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((item) => {
            const classificacao = item[classificacaoField];
            const variant = variante(variantMap, classificacao);
            const badgeLabel = rotulo(classificacao);
            return (
              <CompactStockCard
                key={item.ticker}
                item={item}
                badgeLabel={badgeLabel}
                variant={variant}
                onClick={() => onSelect(item.ticker)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SpotlightColumns({ ranking, onSelect }: SpotlightColumnsProps) {
  const alta = useMemo(() => pickSpotlight(ranking, "alta"), [ranking]);
  const baixa = useMemo(() => pickSpotlight(ranking, "baixa"), [ranking]);
  const compra = useMemo(() => pickSpotlight(ranking, "compra"), [ranking]);
  const venda = useMemo(() => pickSpotlight(ranking, "venda"), [ranking]);

  return (
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 md:pb-0 md:grid md:grid-cols-2 xl:grid-cols-4 md:gap-4 md:overflow-visible">
      <SpotlightColumn
        title="Maior Qualidade"
        filterId="alta"
        items={alta}
        variantMap={Q_VARIANT}
        classificacaoField="classificacaoQualidade"
        onSelect={onSelect}
      />
      <SpotlightColumn
        title="Menor Qualidade"
        filterId="baixa"
        items={baixa}
        variantMap={Q_VARIANT}
        classificacaoField="classificacaoQualidade"
        onSelect={onSelect}
      />
      <SpotlightColumn
        title="Sinal de Compra"
        filterId="compra"
        items={compra}
        variantMap={S_VARIANT}
        classificacaoField="sinalVM"
        onSelect={onSelect}
      />
      <SpotlightColumn
        title="Sinal de Venda"
        filterId="venda"
        items={venda}
        variantMap={S_VARIANT}
        classificacaoField="sinalVM"
        onSelect={onSelect}
      />
    </div>
  );
}
