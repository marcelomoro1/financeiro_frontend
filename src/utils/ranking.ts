export interface RankingItem {
  ticker: string;
  nome: string;
  setor: string;
  ultimoPreco: number | null;
  variacaoDiaPercentual: number | null;
  zQualidade: number | null;
  // Ausente quando falta uma das pernas do fator (o TCC exige peso igualitario entre
  // Valor e Momento, entao com so uma delas o indicador nao e calculado).
  zValorMomento: number | null;
  classificacaoQualidade: string | null;
  sinalVM: string | null;
}

export type Variant = "success" | "warning" | "danger" | "neutral";

export const Q_VARIANT: Record<string, Variant> = {
  "Alta Qualidade": "success",
  "Qualidade Média": "warning",
  "Baixa Qualidade": "danger",
};

export const S_VARIANT: Record<string, Variant> = {
  "Compra": "success",
  "Indefinido": "warning",
  "Venda": "danger",
};

// Classificacao ausente nao pode virar `badge-undefined`: rotulo neutro e explicito.
export const SEM_CLASSIFICACAO = "—";

export function variante(mapa: Record<string, Variant>, valor: string | null): Variant {
  return (valor && mapa[valor]) || "neutral";
}

export function rotulo(valor: string | null): string {
  return valor ?? SEM_CLASSIFICACAO;
}

export type FilterId = "todas" | "alta" | "baixa" | "compra" | "venda";

export interface FilterPreset {
  id: FilterId;
  label: string;
  predicate: (item: RankingItem) => boolean;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: "todas", label: "Todas", predicate: () => true },
  { id: "alta", label: "Maior Qualidade", predicate: (r) => r.classificacaoQualidade === "Alta Qualidade" },
  { id: "baixa", label: "Menor Qualidade", predicate: (r) => r.classificacaoQualidade === "Baixa Qualidade" },
  { id: "compra", label: "Sinal de Compra", predicate: (r) => r.sinalVM === "Compra" },
  { id: "venda", label: "Sinal de Venda", predicate: (r) => r.sinalVM === "Venda" },
];
