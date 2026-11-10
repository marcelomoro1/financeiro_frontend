import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import PriceChart from "../components/PriceChart";
import CollapsibleCard from "../components/CollapsibleCard";
import { Landmark, Award, Gauge } from "lucide-react";

interface DetalheData {
  empresa: { ticker: string; nome: string; setor: string; industria: string };
  indicadores: {
    roa?: number; roe?: number; gpoa?: number; gmar?: number;
    cfoa?: number; acc?: number; bab?: number; lev?: number; evol?: number;
    beMe?: number; mom2?: number;
    crescRoa?: number; crescRoe?: number; crescGpoa?: number; crescGmar?: number; crescCfoa?: number;
  } | null;
  zscore: {
    zLucratividade?: number; zCrescimento?: number; zSeguranca?: number;
    zQualidade?: number; zValor?: number; zMomento?: number; zValorMomento?: number;
    classificacaoQualidade: string; sinalVM: string;
  } | null;
  precoAtual: number;
  dadosFundamentalistas: {
    dataReferencia: string;
    janela: string;
    totalAssets?: number; commonStockEquity?: number; stockholdersEquity?: number;
    totalDebt?: number; totalLiabilitiesNetMinorityInterest?: number;
    currentAssets?: number; currentLiabilities?: number; capitalDeGiro?: number;
    cashAndCashEquivalents?: number; cashAndShortTermInvestments?: number; currentDebt?: number;
    totalRevenue?: number; operatingRevenue?: number; costOfRevenue?: number; grossProfit?: number;
    operatingIncome?: number; ebit?: number; ebitda?: number; netIncome?: number;
    depreciationAmortizationDepletion?: number; interestExpense?: number;
    operatingCashFlow?: number; capitalExpenditure?: number; freeCashFlow?: number; changeInWorkingCapital?: number;
    estimados?: string[];
  } | null;
}

function fmtPct(v?: number) { if (v == null || isNaN(v)) return "\u2014"; return (v * 100).toFixed(2) + "%"; }
function fmtNum(v?: number) { if (v == null || isNaN(v)) return "\u2014"; return v.toFixed(4); }
function fmtMoney(v?: number | null) {
  if (v == null || isNaN(v)) return "\u2014";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}R$ ${(abs / 1e9).toFixed(2)} bi`;
  if (abs >= 1e6) return `${sign}R$ ${(abs / 1e6).toFixed(2)} mi`;
  if (abs >= 1e3) return `${sign}R$ ${(abs / 1e3).toFixed(1)} mil`;
  return `${sign}R$ ${abs.toFixed(2)}`;
}

const Q_BADGE: Record<string, string> = {
  "Alta Qualidade": "badge-success", "Qualidade Média": "badge-warning", "Baixa Qualidade": "badge-danger",
};
const S_BADGE: Record<string, string> = {
  "Compra": "badge-success", "Indefinido": "badge-warning", "Venda": "badge-danger",
};
function safeBadge(c: string) { return Q_BADGE[c] || S_BADGE[c] || "badge-neutral"; }

const HELP: Record<string, string> = {
  roa: "Lucro líquido dividido pelos ativos totais. Mede a eficiência da empresa em gerar lucro com seus recursos. Quanto maior, melhor.",
  roe: "Lucro líquido dividido pelo patrimônio líquido. Mostra o retorno que a empresa gera sobre o capital dos acionistas.",
  gpoa: "Lucro bruto (receita - custo) dividido pelos ativos totais. Indica a rentabilidade operacional bruta da empresa.",
  gmar: "Margem bruta: (receita - custo) / receita. Percentual da receita que sobra após os custos diretos de produção.",
  cfoa: "Fluxo de caixa operacional sobre ativos totais. Mede a capacidade real de gerar caixa, além do lucro contábil.",
  acc: "Accruals = (depreciação - variação do capital de giro) / ativos. Valores elevados podem indicar lucros de baixa qualidade.",
  bab: "Beta da ação em relação ao IBOV. < 1 = menos volátil que o mercado. > 1 = mais volátil.",
  lev: "Alavancagem: dívida total / ativos totais. Empresas menos alavancadas são consideradas mais seguras.",
  evol: "Volatilidade do ROE nos últimos anos (desvio padrão). Quanto menor, mais previsíveis e estáveis são os lucros.",
  beMe: "Book-to-Market: valor patrimonial / valor de mercado. Quanto maior o índice, mais 'barata' a ação está em relação ao seu patrimônio.",
  mom2: "Retorno do preço da ação nos últimos 12 meses, excluindo o mês mais recente. Mede a tendência de valorização.",
  crescRoa: "Variação do ROA nos últimos 3 anos. Indica se a eficiência sobre os ativos está em trajetória de melhora.",
  crescRoe: "Variação do ROE nos últimos 3 anos. Indica se o retorno aos acionistas está crescendo ao longo do tempo.",
  crescGpoa: "Variação do GPOA nos últimos 3 anos. Mostra a tendência da rentabilidade bruta operacional.",
  crescGmar: "Variação da margem bruta nos últimos 3 anos. Margens subindo = eficiência ou poder de preço melhorando.",
  crescCfoa: "Variação do CFOA nos últimos 3 anos. Indica se a geração real de caixa operacional está aumentando.",
  zQualidade: "Score combinado dos 3 pilares de qualidade: lucratividade + crescimento + segurança. Positivo = acima da média do mercado.",
  zValorMomento: "Score combinado de valor (ação barata?) e momento (tendência de alta?). Positivo = acima da média.",
  zLucratividade: "Score de lucratividade. Mede quão eficiente a empresa é em transformar ativos e vendas em lucro e caixa — ROA, ROE, margens e geração de caixa superiores à média das 50 ações da amostra.",
  zCrescimento: "Score de crescimento. Mede se os indicadores de lucratividade estão melhorando ou piorando ao longo do tempo — a tendência dos últimos 3 anos, não o nível atual.",
  zSeguranca: "Score de segurança. Mede quão exposta a empresa está a risco financeiro e de mercado: alavancagem, oscilação do preço (beta) e estabilidade dos lucros.",
  zValor: "Score de valor. Ações com alto Book-to-Market, ou seja, baratas em relação ao valor patrimonial.",
  zMomento: "Score de momento. Ações com retorno recente superior à média do mercado.",
  totalAssets: "Soma de tudo que a empresa possui: caixa, estoques, imóveis, equipamentos, investimentos, etc.",
  commonStockEquity: "Patrimônio Líquido: o que sobraria para os acionistas se a empresa vendesse tudo e pagasse todas as dívidas.",
  totalDebt: "Soma de todos os empréstimos e financiamentos que a empresa deve, de curto e longo prazo.",
  totalLiabilitiesNetMinorityInterest: "Tudo que a empresa deve a terceiros: dívidas, fornecedores, impostos a pagar, etc.",
  currentAssets: "Ativos que a empresa deve conseguir converter em caixa em até 12 meses (caixa, estoques, contas a receber).",
  currentLiabilities: "Obrigações que a empresa precisa pagar em até 12 meses.",
  capitalDeGiro: "Capital de giro operacional: Ativo Circulante menos caixa e aplicações, menos Passivo Circulante já descontada a dívida de curto prazo. Tira do cálculo o dinheiro parado e o financiamento, deixando só o que a operação do dia a dia usa — é a definição que alimenta o CFOA e o ACC.",
  cashAndCashEquivalents: "Dinheiro em caixa e aplicações de liquidez imediata.",
  cashAndShortTermInvestments: "Caixa mais aplicações financeiras de curto prazo. Sai do capital de giro por ser dinheiro parado, não operação.",
  currentDebt: "Empréstimos e financiamentos que vencem em até 12 meses. Sai do capital de giro por ser decisão de financiamento, não de operação.",
  totalRevenue: "Receita total gerada pela venda de produtos ou serviços no período, antes de qualquer dedução.",
  costOfRevenue: "Custo direto para produzir/entregar o que foi vendido (matéria-prima, mão de obra direta, etc.).",
  grossProfit: "Receita menos Custo. O que sobra antes das despesas administrativas, comerciais e financeiras.",
  operatingIncome: "Lucro Bruto menos despesas operacionais (administrativas, vendas). Lucro antes de juros e impostos das operações.",
  ebit: "Lucro antes de juros e impostos — mede o resultado puro da operação, sem efeito de dívida ou tributação.",
  ebitda: "EBIT + depreciação e amortização. Aproxima o caixa gerado pela operação, ignorando decisões contábeis não-caixa.",
  netIncome: "Lucro Líquido: o que sobra depois de todas as despesas, juros e impostos. O resultado final do período.",
  depreciationAmortizationDepletion: "Desgaste contábil de ativos físicos e intangíveis ao longo do tempo — despesa que não sai caixa.",
  interestExpense: "Quanto a empresa pagou de juros sobre suas dívidas no período.",
  operatingCashFlow: "Caixa realmente gerado pelas operações do negócio — diferente do lucro contábil, que inclui itens não-caixa.",
  capitalExpenditure: "Quanto a empresa investiu em bens de longo prazo (máquinas, equipamentos, imóveis) no período.",
  freeCashFlow: "Fluxo de Caixa Operacional menos CapEx. Caixa livre que sobra depois de manter/expandir a operação.",
  changeInWorkingCapital: "Variação do capital de giro operacional em 12 meses — quanto caixa a operação do dia a dia consumiu ou liberou. Não inclui movimento de caixa nem de dívida: pagar dividendo, por exemplo, não aparece aqui.",
  grupoBalanco: "O que a empresa possui e deve numa data específica: ativos, dívidas e patrimônio dos acionistas.",
  grupoResultado: "Receitas, custos e lucro acumulados nos últimos 12 meses — quanto a empresa vendeu e quanto sobrou.",
  grupoFluxoCaixa: "Quanto dinheiro de fato entrou e saiu do caixa da operação, diferente do lucro contábil, que inclui itens que não movimentam caixa.",
};

function InfoTip({ id }: { id: string }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const text = HELP[id];
  if (!text) return null;

  function handleEnter() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.top - 6, left: rect.left + rect.width / 2 });
    setShow(true);
  }

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex ml-1"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      <span
        className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] font-bold leading-none cursor-help flex-shrink-0"
        style={{ background: "var(--color-surface-alt)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
      >
        ?
      </span>
      {show && pos && createPortal(
        <span
          className="fixed z-[9999] -translate-x-1/2 -translate-y-full pointer-events-none w-60 p-3 rounded-lg text-xs leading-relaxed shadow-lg"
          style={{
            top: pos.top,
            left: pos.left,
            background: "var(--color-surface)",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
          }}
        >
          {text}
        </span>,
        document.body
      )}
    </span>
  );
}

function ZBar({ label, id, value }: { label: string; id: string; value?: number }) {
  const ausente = value == null || isNaN(value);
  const z = value ?? 0;
  const positivo = z >= 0;
  const pct = Math.min(Math.abs(z) * 25, 50);
  const barPct = pct > 0 ? Math.max(pct, 0.8) : 0;
  const cor = ausente
    ? "var(--color-text-muted)"
    : positivo ? "var(--color-success)" : "var(--color-danger)";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium w-28 flex-shrink-0 flex items-center" style={{ color: "var(--color-text-secondary)" }}>
        {label}
        <InfoTip id={id} />
      </span>
      <div className="relative flex-1 h-2.5 rounded-full" style={{ background: "var(--color-surface-alt)" }}>
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{ left: "50%", transform: "translateX(-50%)", background: "var(--color-text-muted)", opacity: 0.75 }}
        />
        {!ausente && barPct > 0 && (
          <div
            className="absolute top-0 bottom-0 transition-all"
            style={{
              left: positivo ? "50%" : `${50 - barPct}%`,
              width: `${barPct}%`,
              background: cor,
              borderRadius: positivo ? "0 9999px 9999px 0" : "9999px 0 0 9999px",
            }}
          />
        )}
      </div>
      <span
        className="text-xs font-medium w-14 text-right flex-shrink-0"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: cor }}
      >
        {fmtNum(value)}
      </span>
    </div>
  );
}

function ZBarLegend() {
  return (
    <div className="flex items-center gap-2 text-[10px] -mb-1" style={{ color: "var(--color-text-muted)" }}>
      <span className="w-28 flex-shrink-0" />
      <span className="flex-1 text-center">média</span>
      <span className="w-14 flex-shrink-0" />
    </div>
  );
}

function SectionTitle({ title, zId, zValue }: { title: string; zId: string; zValue?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
        {title}
      </span>
      {zValue != null && (
        <span
          className="text-xs font-medium"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: zValue >= 0 ? "var(--color-success)" : "var(--color-danger)" }}
        >
          Z: {fmtNum(zValue)}
        </span>
      )}
      <InfoTip id={zId} />
    </div>
  );
}

function IndicatorCell({ label, helpId, value, isPct, colored, compact }: {
  label: string; helpId: string; value?: number; isPct: boolean; colored?: boolean; compact?: boolean;
}) {
  const valColor = colored
    ? (value ?? 0) >= 0 ? "var(--color-success)" : "var(--color-danger)"
    : "var(--color-text)";
  return (
    <div className={compact ? "rounded-lg p-2" : "rounded-lg p-3"} style={{ background: "var(--color-surface-alt)" }}>
      <div className="flex items-center gap-0.5 mb-0.5">
        <span className={compact ? "text-[11px] font-medium" : "text-xs font-medium"} style={{ color: "var(--color-text-muted)" }}>{label}</span>
        <InfoTip id={helpId} />
      </div>
      <div className={compact ? "text-xs font-semibold" : "text-sm font-semibold"} style={{ fontFamily: "'JetBrains Mono', monospace", color: valColor }}>
        {isPct ? fmtPct(value) : fmtNum(value)}
      </div>
    </div>
  );
}

function MoneyCell({ label, helpId, value, estimado, compact }: { label: string; helpId: string; value?: number | null; estimado?: boolean; compact?: boolean }) {
  return (
    <div className={compact ? "rounded-lg p-2" : "rounded-lg p-3"} style={{ background: "var(--color-surface-alt)" }}>
      <div className="flex items-center gap-0.5 mb-0.5">
        <span className={compact ? "text-[11px] font-medium" : "text-xs font-medium"} style={{ color: "var(--color-text-muted)" }}>{label}</span>
        <InfoTip id={helpId} />
      </div>
      <div className={compact ? "text-xs font-semibold flex items-center gap-1.5" : "text-sm font-semibold flex items-center gap-1.5"} style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text)" }}>
        {fmtMoney(value)}
        {estimado && value != null && (
          <span
            className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: "var(--color-warning-muted)", color: "var(--color-warning)" }}
            title="Não veio direto da fonte — calculado a partir de outros campos do balanço (ex.: EBITDA − EBIT)"
          >
            estimado
          </span>
        )}
      </div>
    </div>
  );
}

export default function DetalhePage() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<DetalheData>({
    queryKey: ["detalhe", ticker],
    queryFn: () => api.get(`/dashboard/indicadores/${ticker}`).then((r) => r.data),
    enabled: !!ticker,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }
  if (!data) return null;

  const { empresa, indicadores: ind, zscore: z, precoAtual, dadosFundamentalistas: df } = data;

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 text-sm mb-6 transition-colors"
        style={{ color: "var(--color-text-muted)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-muted)"; }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Voltar ao Dashboard
      </button>

      {/* Header */}
      <div className="card p-5 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <span className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text)" }}>
                {empresa.ticker.replace(".SA", "")}
              </span>
              {z && (
                <>
                  <span className={safeBadge(z.classificacaoQualidade)}>{z.classificacaoQualidade || "\u2014"}</span>
                  <span className={safeBadge(z.sinalVM)}>{z.sinalVM || "\u2014"}</span>
                </>
              )}
              {!z && <span className="badge-neutral">Sem classificação</span>}
            </div>
            <h1 className="text-base" style={{ color: "var(--color-text-secondary)" }}>{empresa.nome}</h1>
            <div className="flex items-center gap-3 mt-1.5 text-sm" style={{ color: "var(--color-text-muted)" }}>
              <span>{empresa.setor}</span><span>·</span>
              <span>{empresa.industria || "\u2014"}</span>
              {precoAtual ? (
                <><span>·</span><span style={{ color: "var(--color-text)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>R$ {precoAtual.toFixed(2)}</span></>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de preço */}
      <div className="mb-6">
        <PriceChart ticker={empresa.ticker} />
      </div>

      {/* Z-Scores */}
      <div className="card p-5 mb-6">
        {z ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--color-text-muted)" }}>
                Qualidade
              </div>
              <div className="space-y-2">
                <ZBarLegend />
                <ZBar label="Geral" id="zQualidade" value={z.zQualidade} />
                <ZBar label="Lucratividade" id="zLucratividade" value={z.zLucratividade} />
                <ZBar label="Crescimento" id="zCrescimento" value={z.zCrescimento} />
                <ZBar label="Segurança" id="zSeguranca" value={z.zSeguranca} />
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--color-text-muted)" }}>
                Valor e Momento
              </div>
              <div className="space-y-2">
                <ZBarLegend />
                <ZBar label="Geral" id="zValorMomento" value={z.zValorMomento} />
                <ZBar label="Valor" id="zValor" value={z.zValor} />
                <ZBar label="Momento" id="zMomento" value={z.zMomento} />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-center py-3" style={{ color: "var(--color-text-muted)" }}>Z-Scores indisponíveis</p>
        )}
      </div>

      {/* Indicadores Fundamentalistas */}
      <div className="mb-6">
      <CollapsibleCard title="Indicadores Fundamentalistas" icon={Landmark}>
        {!df ? (
          <p className="text-sm text-center py-6" style={{ color: "var(--color-text-muted)" }}>Dados fundamentalistas indisponíveis</p>
        ) : (
          <>
            <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
              Contas de resultado consolidadas nos últimos 12 meses ({df.janela}); contas de balanço
              na data de {new Date(df.dataReferencia).toLocaleDateString("pt-BR")}. É a mesma base
              publicada por Status Invest e Fundamentus, e a que alimenta os indicadores abaixo.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 flex items-center" style={{ color: "var(--color-text-muted)" }}>
                  Balanço Patrimonial
                  <InfoTip id="grupoBalanco" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <MoneyCell compact label="Ativos Totais" helpId="totalAssets" value={df.totalAssets} />
                  <MoneyCell compact label="Patrimônio Líquido" helpId="commonStockEquity" value={df.commonStockEquity ?? df.stockholdersEquity} />
                  <MoneyCell compact label="Dívida Total" helpId="totalDebt" value={df.totalDebt} />
                  <MoneyCell compact label="Passivo Total" helpId="totalLiabilitiesNetMinorityInterest" value={df.totalLiabilitiesNetMinorityInterest} />
                  <MoneyCell compact label="Ativo Circulante" helpId="currentAssets" value={df.currentAssets} />
                  <MoneyCell compact label="Passivo Circulante" helpId="currentLiabilities" value={df.currentLiabilities} />
                  <MoneyCell compact label="Caixa e Equivalentes" helpId="cashAndCashEquivalents" value={df.cashAndCashEquivalents} />
                  <MoneyCell compact label="Caixa + Aplicações" helpId="cashAndShortTermInvestments" value={df.cashAndShortTermInvestments} />
                  <MoneyCell compact label="Dívida de Curto Prazo" helpId="currentDebt" value={df.currentDebt} />
                  <MoneyCell compact label="Capital de Giro Operacional" helpId="capitalDeGiro" value={df.capitalDeGiro} />
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 flex items-center" style={{ color: "var(--color-text-muted)" }}>
                  Resultado
                  <InfoTip id="grupoResultado" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <MoneyCell compact label="Receita Total" helpId="totalRevenue" value={df.totalRevenue ?? df.operatingRevenue} />
                  <MoneyCell compact label="Custo" helpId="costOfRevenue" value={df.costOfRevenue} />
                  <MoneyCell compact label="Lucro Bruto" helpId="grossProfit" value={df.grossProfit} />
                  <MoneyCell compact label="Lucro Operacional" helpId="operatingIncome" value={df.operatingIncome} />
                  <MoneyCell compact label="EBIT" helpId="ebit" value={df.ebit} />
                  <MoneyCell compact label="EBITDA" helpId="ebitda" value={df.ebitda} />
                  <MoneyCell compact label="Lucro Líquido" helpId="netIncome" value={df.netIncome} />
                  <MoneyCell compact label="Depreciação/Amort." helpId="depreciationAmortizationDepletion" value={df.depreciationAmortizationDepletion} estimado={df.estimados?.includes("depreciationAmortizationDepletion")} />
                  <MoneyCell compact label="Despesa c/ Juros" helpId="interestExpense" value={df.interestExpense} />
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 flex items-center" style={{ color: "var(--color-text-muted)" }}>
                  Fluxo de Caixa
                  <InfoTip id="grupoFluxoCaixa" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MoneyCell compact label="Fluxo de Caixa Operacional" helpId="operatingCashFlow" value={df.operatingCashFlow} />
                  <MoneyCell compact label="CapEx" helpId="capitalExpenditure" value={df.capitalExpenditure} estimado={df.estimados?.includes("capitalExpenditure")} />
                  <MoneyCell compact label="Fluxo de Caixa Livre" helpId="freeCashFlow" value={df.freeCashFlow} />
                  <MoneyCell compact label="Δ Capital de Giro" helpId="changeInWorkingCapital" value={df.changeInWorkingCapital} estimado={df.estimados?.includes("changeInWorkingCapital")} />
                </div>
              </div>
            </div>
          </>
        )}
      </CollapsibleCard>
      </div>

      {/* Painel de Qualidade */}
      <div className="mb-6">
      <CollapsibleCard title="Painel de Qualidade" icon={Award}>
        {!ind ? (
          <p className="text-sm text-center py-6" style={{ color: "var(--color-text-muted)" }}>Indicadores indisponíveis</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Lucratividade */}
            <div>
              <SectionTitle title="Lucratividade" zId="zLucratividade" zValue={z?.zLucratividade} />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(["ROA", "ROE", "GPOA", "GMAR", "CFOA", "ACC"] as const).map((label) => {
                  const key = label.toLowerCase();
                  const val = ind[key as keyof typeof ind] as number | undefined;
                  const isPct = label !== "ACC";
                  return <IndicatorCell key={label} compact label={label} helpId={key} value={val} isPct={isPct} />;
                })}
              </div>
            </div>
            {/* Crescimento */}
            <div>
              <SectionTitle title="Crescimento (3 anos)" zId="zCrescimento" zValue={z?.zCrescimento} />
              <div className="grid grid-cols-2 gap-2">
                {(["Δ ROA", "Δ ROE", "Δ GPOA", "Δ GMAR", "Δ CFOA"] as const).map((label) => {
                  const key = "cresc" + label.replace("Δ ", "").charAt(0).toUpperCase() + label.replace("Δ ", "").slice(1).toLowerCase();
                  const val = ind[key as keyof typeof ind] as number | undefined;
                  return <IndicatorCell key={label} compact label={label} helpId={key} value={val} isPct colored />;
                })}
              </div>
            </div>
            {/* Segurança */}
            <div>
              <SectionTitle title="Segurança" zId="zSeguranca" zValue={z?.zSeguranca} />
              <div className="grid grid-cols-3 gap-2">
                <IndicatorCell compact label="BAB (Beta)" helpId="bab" value={ind.bab} isPct={false} />
                <IndicatorCell compact label="LEV (Alav.)" helpId="lev" value={ind.lev} isPct />
                <IndicatorCell compact label="EVOL (Vol.)" helpId="evol" value={ind.evol} isPct={false} />
              </div>
            </div>
          </div>
        )}
      </CollapsibleCard>
      </div>

      {/* Painel de Valor e Momento */}
      <CollapsibleCard title="Painel de Valor e Momento" icon={Gauge}>
        {!ind ? (
          <p className="text-sm text-center py-6" style={{ color: "var(--color-text-muted)" }}>Indicadores indisponíveis</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <SectionTitle title="Valor" zId="zValor" zValue={z?.zValor} />
              <IndicatorCell label="BE/ME" helpId="beMe" value={ind.beMe} isPct={false} />
            </div>
            <div>
              <SectionTitle title="Momento" zId="zMomento" zValue={z?.zMomento} />
              <IndicatorCell label="MOM2-12" helpId="mom2" value={ind.mom2} isPct colored />
            </div>
          </div>
        )}
      </CollapsibleCard>
    </div>
  );
}
