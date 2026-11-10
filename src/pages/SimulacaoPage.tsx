import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import api from "../services/api";
import { S_VARIANT, variante, rotulo } from "../utils/ranking";

interface CarteiraAtivo {
  id: string; ticker: string; nome?: string; quantidade: number; precoMedio: number;
  precoAtual?: number; valorAtual?: number; rentabilidade?: number; setor?: string;
}
interface Transacao {
  id: string; ticker: string; tipo: "compra" | "venda";
  quantidade: number; preco: number; data: string;
  sinalVM?: string | null;
}
interface DistribuicaoSetor {
  setor: string; valor: number; percentual: number;
}
interface Carteira {
  id: string; nome: string; capitalInicial: number; saldoDisponivel: number;
  ativos: CarteiraAtivo[];
  transacoes?: Transacao[];
  valorInvestido?: number;
  patrimonio?: number;
  rentabilidade?: number;
  rentabilidadeIBOV?: number;
  distribuicaoSetores?: DistribuicaoSetor[];
}
interface Cotacao {
  ticker: string; nome: string; setor: string; precoAtual: number;
}

function formatarDataTransacao(data: string) {
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function SimulacaoPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nova, setNova] = useState({ nome: "", capitalInicial: "" });
  const [novaAberta, setNovaAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const [compraTicker, setCompraTicker] = useState<string | null>(null);
  const [compraQtd, setCompraQtd] = useState("");
  const [vendaQtd, setVendaQtd] = useState("");
  const [ativoExpandido, setAtivoExpandido] = useState<string | null>(null);
  const [erroCompra, setErroCompra] = useState("");
  const [erroVenda, setErroVenda] = useState("");

  const { data: carteiras, isLoading } = useQuery<Carteira[]>({
    queryKey: ["carteiras"],
    queryFn: () => api.get("/carteiras").then((r) => r.data),
    // As cotacoes chegam a cada 5 minutos via cron; sem refetch a rentabilidade da
    // carteira ficaria congelada na primeira carga da pagina.
    refetchInterval: 5 * 60_000,
  });

  const { data: cotacoes } = useQuery<Cotacao[]>({
    queryKey: ["cotacoes"],
    queryFn: () => api.get("/carteiras/cotacoes").then((r) => r.data),
    refetchInterval: 5 * 60_000,
  });

  const { data: status } = useQuery<{ ultimaAtualizacaoPrecos: string | null }>({
    queryKey: ["status"],
    queryFn: () => api.get("/dashboard/status").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["carteiras"] });

  // Aplica a carteira devolvida pela compra/venda direto no cache, sem esperar o
  // refetch - garante que saldo, ativos e patrimônio atualizem na tela na hora.
  const aplicarCarteiraAtualizada = (atualizada: Carteira) => {
    queryClient.setQueryData<Carteira[]>(["carteiras"], (old) =>
      old ? old.map((c) => (c.id === atualizada.id ? atualizada : c)) : [atualizada]
    );
    invalidate();
  };

  const criar = useMutation({
    mutationFn: (d: { nome: string; capitalInicial: number }) => api.post("/carteiras", d),
    onSuccess: (res) => {
      invalidate();
      setNova({ nome: "", capitalInicial: "" });
      setSelectedId(res.data.id);
      setNovaAberta(false);
    },
  });

  const comprar = useMutation({
    mutationFn: (d: { id: string; ticker: string; quantidade: number }) =>
      api.post(`/carteiras/${d.id}/comprar`, { ticker: d.ticker, quantidade: d.quantidade }),
    onSuccess: (res) => {
      aplicarCarteiraAtualizada(res.data);
      setCompraTicker(null); setCompraQtd(""); setErroCompra("");
    },
    onError: (e: any) => setErroCompra(e.response?.data?.error || "Erro"),
  });

  const vender = useMutation({
    mutationFn: (d: { id: string; ticker: string; quantidade: number }) =>
      api.post(`/carteiras/${d.id}/vender`, { ticker: d.ticker, quantidade: d.quantidade }),
    onSuccess: (res, vars) => {
      aplicarCarteiraAtualizada(res.data);
      setVendaQtd(""); setErroVenda("");
      if (!res.data.ativos.some((a: CarteiraAtivo) => a.ticker === vars.ticker)) {
        setAtivoExpandido(null);
      }
    },
    onError: (e: any) => setErroVenda(e.response?.data?.error || "Erro"),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => api.delete(`/carteiras/${id}`),
    onSuccess: () => { invalidate(); setSelectedId(null); },
  });

  const carteira = carteiras?.find((c) => c.id === selectedId);

  // Acoes disponiveis para compra, filtradas pela busca (ticker ou nome).
  const buscaLower = busca.trim().toLowerCase();
  const filtradas = (cotacoes ?? []).filter((c) => {
    if (!buscaLower) return true;
    return c.ticker.toLowerCase().includes(buscaLower) || c.nome.toLowerCase().includes(buscaLower);
  });
  const cotacaoSelecionada = cotacoes?.find((c) => c.ticker === compraTicker);
  const qtdCompra = parseFloat(compraQtd);
  const qtdVenda = parseFloat(vendaQtd);
  const totalCompra =
    cotacaoSelecionada && !isNaN(qtdCompra) && qtdCompra > 0 ? cotacaoSelecionada.precoAtual * qtdCompra : null;
  const ativoEmVenda = carteira?.ativos.find((a) => a.ticker === ativoExpandido);
  const totalVenda =
    ativoEmVenda && ativoEmVenda.precoAtual != null && !isNaN(qtdVenda) && qtdVenda > 0
      ? ativoEmVenda.precoAtual * qtdVenda
      : null;
  // Patrimonio e rentabilidade vem do back-end, marcados a preco de mercado. Recalcular
  // aqui com precoMedio (preco de custo) prenderia o retorno em ~0% para sempre.
  const patrimonio = carteira?.patrimonio ?? 0;
  const rentPct = (carteira?.rentabilidade ?? 0) * 100;

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: "var(--color-text)" }}>
            Simulação de Carteiras
          </h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm" style={{ color: "var(--color-text-muted)" }}>
            Monte e gerencie carteiras fictícias
          </p>
        </div>
        <button
          onClick={() => setNovaAberta((v) => !v)}
          className="btn-primary w-full sm:w-auto px-4 py-2.5 text-sm font-medium"
        >
          {novaAberta ? "Fechar cadastro" : "+ Nova Carteira"}
        </button>
      </div>

      {novaAberta && (
        <div className="card p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Nova Carteira
            </h3>
            <button
              onClick={() => setNovaAberta(false)}
              className="text-xs font-medium cursor-pointer"
              style={{ color: "var(--color-text-muted)" }}
            >
              Fechar
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <input
              type="text" placeholder="Nome da carteira"
              value={nova.nome}
              onChange={(e) => setNova({ ...nova, nome: e.target.value })}
              className="input-field w-full px-4 py-2.5 text-sm"
            />
            <input
              type="number" placeholder="Capital inicial (R$)"
              value={nova.capitalInicial}
              onChange={(e) => setNova({ ...nova, capitalInicial: e.target.value })}
              className="input-field w-full px-4 py-2.5 text-sm"
            />
            <button
              onClick={() => criar.mutate({ nome: nova.nome, capitalInicial: parseFloat(nova.capitalInicial) })}
              disabled={criar.isPending || !nova.nome || !nova.capitalInicial}
              className="btn-primary w-full md:w-auto px-5 py-2.5 text-sm font-medium whitespace-nowrap"
            >
              {criar.isPending ? "Criando..." : "Criar Carteira"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)] gap-4 sm:gap-6 items-start">
        <div className="contents lg:block lg:space-y-6">
        {/* Lista de carteiras */}
        <div className="card p-4 sm:p-6 order-1">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--color-text)" }}>
            Minhas Carteiras
          </h3>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div
                className="w-6 h-6 border-2 rounded-full animate-spin"
                style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
              />
            </div>
          ) : !carteiras?.length ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--color-text-muted)" }}>
              Nenhuma carteira criada
            </p>
          ) : (
            <div className="space-y-2 max-h-56 sm:max-h-96 overflow-y-auto pr-1">
              {carteiras.map((c) => {
                // Mesma fonte do painel de detalhe: valores marcados a preco de mercado
                // pelo back-end. Recalcular aqui com precoMedio faria o card da lista
                // mostrar ~0% ao lado do detalhe mostrando o retorno real.
                const inv = c.valorInvestido ?? c.ativos.reduce((s, a) => s + a.quantidade * a.precoMedio, 0);
                const pat = c.patrimonio ?? c.saldoDisponivel + inv;
                const rp = (c.rentabilidade ?? (pat - c.capitalInicial) / c.capitalInicial) * 100;
                const active = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedId(c.id);
                      setAtivoExpandido(null);
                      setVendaQtd("");
                      setErroCompra("");
                      setErroVenda("");
                      setCompraTicker(null);
                      setCompraQtd("");
                    }}
                    className="w-full text-left p-3 sm:p-4 rounded-xl transition-all duration-150 border"
                    style={{
                      background: active ? "var(--color-accent-muted)" : "var(--color-surface-alt)",
                      borderColor: active ? "var(--color-accent-border)" : "var(--color-border-light)",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) { e.currentTarget.style.borderColor = "var(--color-border)"; }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) { e.currentTarget.style.borderColor = "var(--color-border-light)"; }
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm" style={{ color: "var(--color-text)" }}>
                        {c.nome}
                      </span>
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {c.ativos.length}/15
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text-secondary)" }}
                      >
                        {pat.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: rp >= 0 ? "var(--color-success)" : "var(--color-danger)",
                        }}
                      >
                        {rp >= 0 ? "+" : ""}{rp.toFixed(1)}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {carteira && (
          <div className="card p-4 sm:p-6 order-3 lg:order-none">
            <div className="flex items-start justify-between gap-2 flex-wrap mb-3 sm:mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--color-text)" }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--color-success)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Comprar ativos
              </h3>
              {status?.ultimaAtualizacaoPrecos && (
                <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  Cotações atualizadas às{" "}
                  {new Date(status.ultimaAtualizacaoPrecos).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>

            {erroCompra && (
              <div
                className="p-2.5 rounded-lg text-xs flex items-center gap-2 mb-3"
                style={{
                  background: "var(--color-danger-muted)",
                  color: "var(--color-danger)",
                  border: "1px solid var(--color-danger-border)",
                }}
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {erroCompra}
              </div>
            )}

            <input
              type="text"
              placeholder="Buscar por ticker ou nome"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input-field w-full px-4 py-2.5 text-sm mb-3"
            />

            <div className="max-h-52 sm:max-h-64 overflow-y-auto pr-1 space-y-1.5 mb-3 sm:mb-4">
              {filtradas.map((c) => {
                const active = c.ticker === compraTicker;
                return (
                  <button
                    key={c.ticker}
                    onClick={() => { setCompraTicker(c.ticker); setCompraQtd(""); setErroCompra(""); }}
                    className="w-full text-left px-3 py-2 rounded-lg transition-all border flex items-center justify-between gap-2"
                    style={{
                      background: active ? "var(--color-accent-muted)" : "var(--color-surface-alt)",
                      borderColor: active ? "var(--color-accent-border)" : "var(--color-border-light)",
                    }}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <img
                        src={`/logos/${c.ticker.replace(".SA", "")}.svg`}
                        alt=""
                        className="w-6 h-6 rounded-full shrink-0 object-contain"
                        style={{ background: "var(--color-surface-alt)" }}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                      <span
                        className="text-sm font-medium"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text)" }}
                      >
                        {c.ticker.replace(".SA", "")}
                      </span>
                      <span className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                        {c.nome}
                      </span>
                    </span>
                    <span
                      className="text-xs flex-shrink-0"
                      style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text-secondary)" }}
                    >
                      R$ {c.precoAtual.toFixed(2)}
                    </span>
                  </button>
                );
              })}
              {filtradas.length === 0 && (
                <p className="text-xs text-center py-3" style={{ color: "var(--color-text-muted)" }}>
                  Nenhuma ação encontrada
                </p>
              )}
            </div>

            {carteira.ativos.length >= 15 && (
              <p className="text-xs mb-3" style={{ color: "var(--color-danger)" }}>
                Limite de 15 ativos por carteira atingido.
              </p>
            )}

            {cotacaoSelecionada && (
              <div className="rounded-xl p-3" style={{ background: "var(--color-surface-alt)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-sm font-semibold"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text)" }}
                  >
                    {cotacaoSelecionada.ticker.replace(".SA", "")}
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-accent)" }}
                  >
                    R$ {cotacaoSelecionada.precoAtual.toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <input
                    type="number"
                    min={1}
                    placeholder="Quantidade"
                    value={compraQtd}
                    onChange={(e) => setCompraQtd(e.target.value)}
                    className="input-field flex-1 px-3 py-2 text-sm"
                    style={{ borderColor: "var(--color-success-border)" }}
                  />
                  <button
                    onClick={() =>
                      comprar.mutate({
                        id: carteira.id,
                        ticker: cotacaoSelecionada.ticker,
                        quantidade: qtdCompra,
                      })
                    }
                    disabled={
                      comprar.isPending ||
                      isNaN(qtdCompra) ||
                      qtdCompra <= 0 ||
                      (totalCompra != null && totalCompra > carteira.saldoDisponivel)
                    }
                    className="btn-success w-full sm:w-auto rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-30"
                  >
                    {comprar.isPending ? "Comprando..." : "Confirmar compra"}
                  </button>
                </div>
                {totalCompra != null && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      Total
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        color: totalCompra > carteira.saldoDisponivel ? "var(--color-danger)" : "var(--color-text)",
                      }}
                    >
                      R$ {totalCompra.toFixed(2)}
                      {totalCompra > carteira.saldoDisponivel && " · saldo insuficiente"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </div>

        {/* Detalhe da carteira */}
        {carteira ? (
          <div className="card p-4 sm:p-6 order-2 lg:order-none">
            <div className="flex items-start justify-between gap-2 flex-wrap mb-4">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  {carteira.nome}
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  Valor inicial:{" "}
                  <span
                    className="font-medium"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text-secondary)" }}
                  >
                    {carteira.capitalInicial.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      minimumFractionDigits: 0,
                    })}
                  </span>
                </p>
              </div>
              <button
                onClick={() => {
                  if (window.confirm(`Excluir a carteira "${carteira.nome}"?`)) {
                    excluir.mutate(carteira.id);
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors border"
                style={{
                  color: "var(--color-danger)",
                  background: "var(--color-danger-muted)",
                  borderColor: "var(--color-danger-border)",
                }}
                title="Excluir carteira"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden sm:inline">Excluir carteira</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
              {[
                {
                  label: "Patrimônio",
                  value: patrimonio.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }),
                  color: "var(--color-text)",
                },
                {
                  label: "Disponível",
                  value: carteira.saldoDisponivel.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }),
                  color: "var(--color-text)",
                },
                {
                  label: "Rentabilidade",
                  value: `${rentPct >= 0 ? "+" : ""}${rentPct.toFixed(1)}%`,
                  color: rentPct >= 0 ? "var(--color-success)" : "var(--color-danger)",
                },
              ].map((stat, i) => (
                <div key={i} className="rounded-xl p-2.5 sm:p-3 text-center" style={{ background: "var(--color-surface-alt)" }}>
                  <div className="text-[10px] mb-0.5 sm:mb-1 font-medium" style={{ color: "var(--color-text-muted)" }}>
                    {stat.label}
                  </div>
                  <div
                    className="text-[10px] sm:text-sm font-semibold leading-tight break-words"
                    style={{ color: stat.color, fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Ativos */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Ativos ({carteira.ativos.length}/15)
              </h4>
              <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                clique para vender
              </span>
            </div>
            <div className="space-y-1.5 mb-4">
              {carteira.ativos.map((a) => {
                const expandido = ativoExpandido === a.ticker;
                const movimentacoes = (carteira.transacoes ?? [])
                  .filter((t) => t.ticker === a.ticker)
                  .sort((x, y) => new Date(y.data).getTime() - new Date(x.data).getTime());

                return (
                  <div
                    key={a.ticker}
                    className="rounded-lg overflow-hidden"
                    style={{ background: "var(--color-surface-alt)" }}
                  >
                    <button
                      onClick={() => {
                        setAtivoExpandido((atual) => (atual === a.ticker ? null : a.ticker));
                        setVendaQtd("");
                        setErroVenda("");
                      }}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
                      aria-expanded={expandido}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={`/logos/${a.ticker.replace(".SA", "")}.svg`}
                          alt=""
                          className="w-6 h-6 rounded-full shrink-0 object-contain"
                          style={{ background: "var(--color-surface-alt)" }}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                        <div className="min-w-0">
                          <span
                            className="text-sm font-medium"
                            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text)" }}
                          >
                            {a.ticker.replace(".SA", "")}
                          </span>
                          <span className="text-xs ml-2" style={{ color: "var(--color-text-muted)" }}>
                            {a.quantidade} un.
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          <div className="text-[11px] sm:text-sm font-bold whitespace-nowrap" style={{ color: "var(--color-text)" }}>
                            <span className="hidden sm:inline">Total </span>R$ {(a.valorAtual ?? a.quantidade * a.precoMedio).toFixed(2)}
                          </div>
                          <div className="text-[11px] hidden sm:block" style={{ color: "var(--color-text-muted)" }}>
                            PM R$ {a.precoMedio.toFixed(2)}
                            {a.precoAtual != null && <> · Atual R$ {a.precoAtual.toFixed(2)}</>}
                          </div>
                          {a.rentabilidade != null && (
                            <div
                              className="text-xs font-semibold"
                              style={{ color: a.rentabilidade >= 0 ? "var(--color-success)" : "var(--color-danger)" }}
                            >
                              {a.rentabilidade >= 0 ? "+" : ""}{(a.rentabilidade * 100).toFixed(2)}%
                            </div>
                          )}
                        </div>
                        <ChevronDown
                          size={15}
                          className="transition-transform duration-200 flex-shrink-0"
                          style={{
                            color: "var(--color-text-muted)",
                            transform: expandido ? "rotate(180deg)" : "none",
                          }}
                        />
                      </div>
                    </button>

                    {expandido && (
                      <div className="px-3 pb-3">
                        <div className="rounded-lg p-2.5 mb-2.5 border-t" style={{ borderColor: "var(--color-border)" }}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span
                              className="text-[10px] font-semibold uppercase tracking-wider"
                              style={{ color: "var(--color-text-muted)" }}
                            >
                              Vender ativo
                            </span>
                            <span
                              className="text-[10px]"
                              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text-muted)" }}
                            >
                              {a.quantidade} un. disponíveis
                              {a.precoAtual != null && ` · R$ ${a.precoAtual.toFixed(2)}`}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                            <input
                              type="number"
                              min={1}
                              max={a.quantidade}
                              placeholder="Quantidade"
                              value={vendaQtd}
                              onChange={(e) => { setVendaQtd(e.target.value); setErroVenda(""); }}
                              className="input-field flex-1 px-3 py-2 text-sm"
                              style={{ borderColor: "var(--color-danger-border)" }}
                            />
                            <button
                              onClick={() =>
                                vender.mutate({
                                  id: carteira.id,
                                  ticker: a.ticker,
                                  quantidade: qtdVenda,
                                })
                              }
                              disabled={
                                vender.isPending ||
                                a.precoAtual == null ||
                                isNaN(qtdVenda) ||
                                qtdVenda <= 0 ||
                                qtdVenda > a.quantidade
                              }
                              className="btn-danger w-full sm:w-auto rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-30"
                            >
                              {vender.isPending ? "Vendendo..." : "Vender"}
                            </button>
                          </div>
                          {totalVenda != null && (
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                                Total
                              </span>
                              <span
                                className="text-xs font-semibold"
                                style={{
                                  fontFamily: "'JetBrains Mono', monospace",
                                  color: qtdVenda > a.quantidade ? "var(--color-danger)" : "var(--color-text)",
                                }}
                              >
                                R$ {totalVenda.toFixed(2)}
                                {qtdVenda > a.quantidade && " · quantidade insuficiente"}
                              </span>
                            </div>
                          )}
                          {erroVenda && (
                            <p className="text-[11px] mt-2" style={{ color: "var(--color-danger)" }}>
                              {erroVenda}
                            </p>
                          )}
                        </div>
                        <div className="border-t pt-2" style={{ borderColor: "var(--color-border)" }}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className="text-[10px] font-semibold uppercase tracking-wider"
                              style={{ color: "var(--color-text-muted)" }}
                            >
                              Histórico de compras e vendas
                            </span>
                            <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                              {movimentacoes.length} {movimentacoes.length === 1 ? "movimentação" : "movimentações"}
                            </span>
                          </div>
                          {movimentacoes.length === 0 ? (
                            <p className="text-[11px] py-1" style={{ color: "var(--color-text-muted)" }}>
                              Nenhuma movimentação registrada para este ativo.
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {movimentacoes.map((t) => {
                                const compra = t.tipo === "compra";
                                return (
                                  <div
                                    key={t.id}
                                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
                                    style={{ background: "var(--color-surface)" }}
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span
                                          className="inline-flex items-center gap-1 text-[10px] font-semibold"
                                          style={{ color: compra ? "var(--color-success)" : "var(--color-danger)" }}
                                        >
                                          <span
                                            className="w-1.5 h-1.5 rounded-full"
                                            style={{ background: "currentColor" }}
                                          />
                                          {compra ? "Compra" : "Venda"}
                                        </span>
                                        <span
                                          className="text-[11px] font-medium truncate"
                                          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text)" }}
                                        >
                                          {t.quantidade} un. × R$ {t.preco.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                                        {formatarDataTransacao(t.data)}
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-shrink-0 flex-wrap">
                                      <span
                                        className="text-[11px] font-semibold"
                                        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text-secondary)" }}
                                      >
                                        R$ {(t.quantidade * t.preco).toFixed(2)}
                                      </span>
                                      <span
                                        className="text-[9px] font-semibold uppercase tracking-wider hidden sm:inline"
                                        style={{ color: "var(--color-text-muted)" }}
                                      >
                                        sinal
                                      </span>
                                      <span
                                        className={`badge-${variante(S_VARIANT, t.sinalVM ?? null)}`}
                                        title={
                                          t.sinalVM
                                            ? `Sinal na ${compra ? "compra" : "venda"}: ${t.sinalVM}`
                                            : "Sinal não registrado para movimentações anteriores a este recurso"
                                        }
                                      >
                                        {rotulo(t.sinalVM ?? null)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {carteira.ativos.length === 0 && (
                <p className="text-xs text-center py-3" style={{ color: "var(--color-text-muted)" }}>
                  Sem ativos
                </p>
              )}
            </div>

            {/* Distribuicao por setor - exigida pelo TCC no modulo de simulacao */}
            {carteira.distribuicaoSetores && carteira.distribuicaoSetores.length > 0 && (
              <div className="mb-4">
                <h4
                  className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Distribuição por setor
                </h4>
                <div className="space-y-1.5">
                  {carteira.distribuicaoSetores.map((d) => (
                    <div key={d.setor} className="flex items-center gap-2">
                      <span className="text-xs flex-1 truncate" style={{ color: "var(--color-text)" }}>
                        {d.setor}
                      </span>
                      <div className="h-1.5 rounded-full flex-1" style={{ background: "var(--color-surface-alt)" }}>
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${Math.round(d.percentual * 100)}%`, background: "var(--color-accent)" }}
                        />
                      </div>
                      <span
                        className="text-xs w-12 text-right"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text-muted)" }}
                      >
                        {(d.percentual * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="card p-4 sm:p-6 order-2 lg:order-none flex items-center justify-center">
            <div className="text-center">
              <svg
                className="w-12 h-12 mx-auto mb-3"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}
                style={{ color: "var(--color-border)" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
              </svg>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Selecione uma carteira
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                ou use o botão Nova Carteira
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
