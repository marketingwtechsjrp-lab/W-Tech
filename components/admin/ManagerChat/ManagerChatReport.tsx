/**
 * Relatório de uso do Chat de IA da Gerência.
 *
 * Responde à pergunta do dono: "quem está usando, quanto pergunta e quanto
 * isso está custando". Tudo vem de managerChatApi.relatorio(de, ate), que só
 * responde para quem tem a permissão de auditoria.
 *
 * Sobre o custo: parte dele pode vir MEDIDA (o OpenRouter informa o valor
 * cobrado em `usage.cost` a cada resposta) e parte pode continuar ESTIMADA por
 * tabela de preços. A tela distingue os dois e só chama de estimativa o que
 * realmente é — mas nunca o contrário: enquanto o servidor não declarar o valor
 * medido, tudo segue rotulado como estimativa.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, BarChart3, MessagesSquare, MessageCircleQuestion, DollarSign, AlertTriangle,
  Loader2, RefreshCw, Wrench, ArrowUpDown, Info, CalendarDays,
} from 'lucide-react';
import { managerChatApi } from '../../../lib/managerChat';
import type { ManagerChatReport as Relatorio, ManagerChatReportRow } from '../../../lib/managerChat';

// ─── Formatação ─────────────────────────────────────────────────────────────

const numero = (n: number | null | undefined) => (Number(n) || 0).toLocaleString('pt-BR');

/** Custo pequeno merece mais casas decimais para não virar "US$ 0,00". */
function dinheiro(v: number | null | undefined): string {
  const n = Number(v) || 0;
  const casas = n > 0 && n < 1 ? 4 : 2;
  return `US$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}`;
}

function dataHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function dataCurta(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString('pt-BR');
}

/** Data de hoje/N dias atrás no formato YYYY-MM-DD que o input date usa. */
function diaISO(diasAtras = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 10);
}

// ─── Custo medido x estimado ────────────────────────────────────────────────

/**
 * CONFERIDO EM 26/08/2026: a action 'report' de api/manager-chat.ts ainda NÃO
 * devolve custo medido nem contagem de linhas estimadas — só `custo_estimado_usd`.
 * Como o campo está previsto para chegar, lemos de forma defensiva os nomes
 * plausíveis; enquanto nenhum existir, a tela chama TUDO de estimativa.
 *
 * O erro seguro é rotular medido como estimado. O inverso — dizer "medido" sobre
 * um número que saiu de tabela de preço — seria mentir sobre a fatura.
 */
function numeroDe(fonte: unknown, chaves: readonly string[]): number | null {
  if (!fonte || typeof fonte !== 'object') return null;
  const obj = fonte as Record<string, unknown>;
  for (const chave of chaves) {
    const bruto = obj[chave];
    if (bruto === null || bruto === undefined || bruto === '') continue;
    const n = Number(bruto);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Custo já cobrado de verdade pelo provedor (subconjunto do custo total). */
const CHAVES_CUSTO_MEDIDO = ['custo_medido_usd', 'custo_real_usd', 'cost_usd'] as const;
/** Quantas respostas do período ainda não têm custo medido. */
const CHAVES_ESTIMADAS = [
  'respostas_estimadas',
  'linhas_estimadas',
  'perguntas_estimadas',
  'mensagens_estimadas',
] as const;

// ─── Ordenação ──────────────────────────────────────────────────────────────

type Coluna = 'custo' | 'perguntas';
const PERIODOS = [7, 30, 90] as const;

// ─── Componente ─────────────────────────────────────────────────────────────

export const ManagerChatReport: React.FC<{ onFechar: () => void }> = ({ onFechar }) => {
  const [dias, setDias] = useState<number | 'custom'>(30);
  const [de, setDe] = useState(diaISO(30));
  const [ate, setAte] = useState(diaISO(0));

  const [dados, setDados] = useState<Relatorio | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [coluna, setColuna] = useState<Coluna>('custo');
  const [desc, setDesc] = useState(true);

  // Evita corrida: só a última busca disparada pode escrever no estado.
  const buscaAtual = useRef(0);

  const buscar = useCallback(async (inicio: string, fim: string) => {
    const id = ++buscaAtual.current;
    setCarregando(true);
    setErro(null);
    try {
      const r = await managerChatApi.relatorio(inicio, fim);
      if (id !== buscaAtual.current) return;
      setDados(r);
    } catch (e: any) {
      if (id !== buscaAtual.current) return;
      setErro(e?.message || 'Não foi possível carregar o relatório.');
      setDados(null);
    } finally {
      if (id === buscaAtual.current) setCarregando(false);
    }
  }, []);

  // Carga inicial. As buscas seguintes saem dos botões de período / "Aplicar".
  useEffect(() => {
    buscar(de, ate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const escolherPeriodo = (n: number) => {
    const inicio = diaISO(n);
    const fim = diaISO(0);
    setDias(n);
    setDe(inicio);
    setAte(fim);
    buscar(inicio, fim);
  };

  const aplicarPersonalizado = () => {
    if (!de || !ate) return;
    // Intervalo invertido: troca em vez de devolver relatório vazio.
    const [inicio, fim] = de <= ate ? [de, ate] : [ate, de];
    setDe(inicio);
    setAte(fim);
    setDias('custom');
    buscar(inicio, fim);
  };

  const linhas = useMemo<ManagerChatReportRow[]>(() => {
    const base = dados?.porGerente ? [...dados.porGerente] : [];
    base.sort((a, b) => {
      const va = coluna === 'custo' ? Number(a.custo_estimado_usd) || 0 : Number(a.perguntas) || 0;
      const vb = coluna === 'custo' ? Number(b.custo_estimado_usd) || 0 : Number(b.perguntas) || 0;
      if (va === vb) return (a.user_name || '').localeCompare(b.user_name || '', 'pt-BR');
      return desc ? vb - va : va - vb;
    });
    return base;
  }, [dados, coluna, desc]);

  const ferramentas = dados?.ferramentasMaisUsadas || [];
  const maiorUso = ferramentas.reduce((m, f) => Math.max(m, Number(f.vezes) || 0), 0) || 1;

  const alternarOrdem = (c: Coluna) => {
    if (c === coluna) { setDesc((d) => !d); return; }
    setColuna(c);
    setDesc(true);
  };

  // ── Estilos base ──
  const cartao = 'bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5';
  const campo =
    'border border-[var(--admin-border)] rounded-lg px-2.5 py-2 text-sm bg-[var(--admin-surface-2)] ' +
    'text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-colors';
  const th = 'px-3 py-2.5 text-left text-[11px] font-bold uppercase text-[var(--admin-text-secondary)] whitespace-nowrap';
  const td = 'px-3 py-2.5 text-sm text-[var(--admin-text-primary)] whitespace-nowrap';

  const totais = dados?.totais;

  // Leitura que bateu no teto devolve um PISO, não o total. O servidor declara
  // isso em dois lugares (o relatório e os totais) — qualquer um dos dois basta
  // para o número deixar de ser confiável como base de decisão de custo.
  const parcial = !!dados && (dados.parcial === true || totais?.truncado === true);
  // Ressalvas do servidor (ex.: campo que só passou a ser gravado em certa data).
  const avisos = (dados?.avisos ?? []).filter((a) => typeof a === 'string' && a.trim().length > 0);

  // `custo_estimado_usd` continua sendo o custo TOTAL do período (é o único
  // número que o servidor sempre devolve). Quando o custo medido chegar, ele é
  // a PARTE desse total que já veio da fatura do provedor.
  const custoTotal = Number(totais?.custo_estimado_usd) || 0;
  const custoMedido = numeroDe(totais, CHAVES_CUSTO_MEDIDO) ?? numeroDe(dados, CHAVES_CUSTO_MEDIDO);
  const respostasEstimadas = numeroDe(totais, CHAVES_ESTIMADAS) ?? numeroDe(dados, CHAVES_ESTIMADAS);

  // Se o medido passar do total, a suposição "medido ⊂ total" caiu — o servidor
  // mudou o significado dos campos. Nesse caso a tela NÃO tenta reconciliar nem
  // escolhe um dos dois: declara a divergência e mostra os dois números.
  const custoReconciliavel = custoMedido === null || custoMedido <= custoTotal * 1.0001 + 1e-9;
  const parteEstimada =
    custoMedido !== null && custoReconciliavel ? Math.max(0, custoTotal - custoMedido) : null;
  const tudoMedido =
    parteEstimada !== null && parteEstimada <= 1e-9 && (respostasEstimadas === null || respostasEstimadas <= 0);

  // O rótulo do número acompanha o que ele de fato é.
  const rotuloCusto =
    custoMedido === null
      ? 'Custo estimado'
      : !custoReconciliavel
        ? 'Custo (ver ressalva)'
        : tudoMedido
          ? 'Custo medido'
          : 'Custo medido + estimado';

  const rotuloCustoCurto =
    custoMedido === null
      ? 'Custo estimado'
      : !custoReconciliavel
        ? 'Custo'
        : tudoMedido
          ? 'Custo medido'
          : 'Custo (med. + est.)';

  const cartoes = [
    { rotulo: 'Conversas', valor: numero(totais?.threads), Icone: MessagesSquare, cor: 'text-sky-500', fundo: 'bg-sky-500/15' },
    { rotulo: 'Perguntas', valor: numero(totais?.perguntas), Icone: MessageCircleQuestion, cor: 'text-violet-500', fundo: 'bg-violet-500/15' },
    { rotulo: rotuloCusto, valor: dinheiro(custoTotal), Icone: DollarSign, cor: 'text-emerald-500', fundo: 'bg-emerald-500/15' },
    { rotulo: 'Erros', valor: numero(totais?.erros), Icone: AlertTriangle, cor: 'text-red-500', fundo: 'bg-red-500/15' },
  ];

  return (
    // Painel sobre a tela do chat — o container pai precisa ser `relative`.
    <div className="absolute inset-0 z-20 flex flex-col bg-[var(--admin-surface-2)]">
      {/* Cabeçalho */}
      <header className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--admin-border)] bg-[var(--admin-surface-1)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-wtech-gold/15 flex items-center justify-center text-wtech-gold shrink-0">
            <BarChart3 size={22} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-[var(--admin-text-primary)] truncate">Relatório do Chat da Gerência</h3>
            <p className="text-xs text-[var(--admin-text-secondary)] truncate">
              Quem usou, quanto perguntou e quanto custou.
            </p>
          </div>
        </div>
        <button
          onClick={onFechar}
          aria-label="Fechar relatório"
          className="shrink-0 p-2 rounded-lg text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)] transition-colors"
        >
          <X size={20} />
        </button>
      </header>

      {/* Corpo */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-6 max-w-6xl mx-auto pb-10">

          {/* ── Filtro de período ─────────────────────────────────────────── */}
          <section className={cartao}>
            <div className="flex flex-col lg:flex-row lg:items-end gap-4">
              <div>
                <span className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-2">Período</span>
                <div className="flex flex-wrap gap-2">
                  {PERIODOS.map((n) => (
                    <button
                      key={n}
                      onClick={() => escolherPeriodo(n)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        dias === n
                          ? 'bg-wtech-gold text-black'
                          : 'bg-[var(--admin-surface-3)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                      }`}
                    >
                      {n} dias
                    </button>
                  ))}
                  <span
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      dias === 'custom'
                        ? 'bg-wtech-gold text-black'
                        : 'bg-[var(--admin-surface-3)] text-[var(--admin-text-secondary)]'
                    }`}
                  >
                    <CalendarDays size={13} /> Personalizado
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase mb-1">De</label>
                  <input type="date" className={campo} value={de} max={ate} onChange={(e) => setDe(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase mb-1">Até</label>
                  <input type="date" className={campo} value={ate} min={de} onChange={(e) => setAte(e.target.value)} />
                </div>
                <button
                  onClick={aplicarPersonalizado}
                  disabled={carregando}
                  className="bg-wtech-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-lg font-bold text-sm
                             flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {carregando ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Aplicar
                </button>
              </div>
            </div>

            {dados && (
              <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-3">
                Mostrando de {dataCurta(dados.de)} até {dataCurta(dados.ate)}.
              </p>
            )}
          </section>

          {/* ── Erro ──────────────────────────────────────────────────────── */}
          <AnimatePresence>
            {erro && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-4"
              >
                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--admin-text-primary)]">Não deu para carregar o relatório</p>
                  <p className="text-xs text-[var(--admin-text-secondary)] whitespace-pre-wrap">{erro}</p>
                  <button
                    onClick={() => buscar(de, ate)}
                    className="mt-2 text-xs font-bold text-wtech-gold flex items-center gap-1"
                  >
                    <RefreshCw size={13} /> Tentar novamente
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {carregando && !dados ? (
            <div className="flex items-center justify-center py-20 text-[var(--admin-text-tertiary)]">
              <Loader2 className="animate-spin mr-2" /> Carregando relatório...
            </div>
          ) : (
            <>
              {/* ── Números parciais: alerta, nunca rodapé discreto ─────────── */}
              {parcial && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-2xl border-2 border-[var(--admin-warning)] bg-[var(--admin-warning-muted)] p-4"
                >
                  <AlertTriangle size={20} className="text-[var(--admin-warning)] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--admin-text-primary)]">
                      Estes números estão incompletos — são um piso, não o total.
                    </p>
                    <p className="text-xs text-[var(--admin-text-secondary)] mt-1 leading-relaxed">
                      A leitura bateu no teto do servidor e parte deste período ficou de fora. O uso e o custo reais
                      são <strong className="text-[var(--admin-text-primary)]">maiores</strong> do que os mostrados
                      aqui. Reduza o período (7 ou 30 dias) e consulte em recortes antes de decidir qualquer coisa
                      com base neste relatório.
                    </p>
                    {avisos.length > 0 && (
                      <ul className="mt-2 pl-4 list-disc space-y-1 text-xs text-[var(--admin-text-secondary)]">
                        {avisos.map((a, i) => (
                          <li key={`aviso-${i}`} className="leading-relaxed">
                            {a}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Ressalvas sem truncamento: o número fecha, mas tem contexto. */}
              {!parcial && avisos.length > 0 && (
                <div className="flex items-start gap-3 rounded-2xl border border-[var(--admin-warning)]/40 bg-[var(--admin-surface-1)] p-4">
                  <Info size={18} className="text-[var(--admin-warning)] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--admin-text-primary)]">
                      Ressalvas sobre este período
                    </p>
                    <ul className="mt-1.5 pl-4 list-disc space-y-1 text-xs text-[var(--admin-text-secondary)]">
                      {avisos.map((a, i) => (
                        <li key={`ressalva-${i}`} className="leading-relaxed">
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* ── Cartões de totais ──────────────────────────────────────── */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {cartoes.map(({ rotulo, valor, Icone, cor, fundo }) => (
                  <div key={rotulo} className={cartao}>
                    <div className={`w-10 h-10 rounded-xl ${fundo} ${cor} flex items-center justify-center mb-3`}>
                      <Icone size={19} />
                    </div>
                    <p className="text-2xl font-display font-bold text-[var(--admin-text-primary)] leading-tight break-words">
                      {valor}
                    </p>
                    <p className="text-xs text-[var(--admin-text-secondary)] mt-0.5">{rotulo}</p>
                  </div>
                ))}
              </section>

              {/* Aviso obrigatório sobre o custo: só é chamado de estimativa
                  o que realmente é estimativa. */}
              {!custoReconciliavel ? (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border-2 border-[var(--admin-warning)] bg-[var(--admin-warning-muted)] px-4 py-3"
                >
                  <AlertTriangle size={16} className="text-[var(--admin-warning)] shrink-0 mt-0.5" />
                  <p className="text-xs text-[var(--admin-text-secondary)] leading-relaxed">
                    <strong className="text-[var(--admin-text-primary)]">
                      Os dois números de custo não fecham entre si.
                    </strong>{' '}
                    O servidor informou {dinheiro(custoMedido)} de custo medido, valor maior que o total de{' '}
                    {dinheiro(custoTotal)}. Esta tela não sabe como somá-los sem inventar, então mostra os dois como
                    vieram. Trate ambos como indicativos e confira a fatura do provedor antes de decidir qualquer
                    coisa com base neles.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-4 py-3">
                  <Info size={16} className="text-wtech-gold shrink-0 mt-0.5" />
                  <p className="text-xs text-[var(--admin-text-secondary)] leading-relaxed">
                    {custoMedido === null ? (
                      <>
                        <strong className="text-[var(--admin-text-primary)]">O custo é estimado.</strong>{' '}
                        Ele é calculado a partir dos tokens registrados e da tabela de preços pública do modelo. Pode
                        divergir da fatura real (descontos, cache e arredondamentos do provedor não entram nesta
                        conta).
                      </>
                    ) : tudoMedido ? (
                      <>
                        <strong className="text-[var(--admin-text-primary)]">O custo é medido, não estimado.</strong>{' '}
                        Todo o valor deste período veio do que o provedor cobrou em cada resposta. É o mesmo número
                        que aparece na fatura, sem tabela de preço no meio.
                      </>
                    ) : (
                      <>
                        <strong className="text-[var(--admin-text-primary)]">
                          Parte deste custo é medida, parte é estimativa.
                        </strong>{' '}
                        {dinheiro(custoMedido)} vieram do valor que o provedor cobrou em cada resposta. Os{' '}
                        {dinheiro(parteEstimada)} restantes
                        {respostasEstimadas !== null && respostasEstimadas > 0
                          ? ` — ${numero(respostasEstimadas)} ${respostasEstimadas === 1 ? 'resposta' : 'respostas'} —`
                          : ''}{' '}
                        ainda são estimados por tabela de preços e podem divergir da fatura.
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* ── Tabela por gerente ─────────────────────────────────────── */}
              <section className={cartao}>
                <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                  <h4 className="text-sm font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                    <MessagesSquare size={15} /> Uso por gerente ({linhas.length})
                  </h4>
                  <span className="text-[11px] text-[var(--admin-text-tertiary)]">
                    Clique em "Perguntas" ou na coluna de custo para reordenar.
                  </span>
                </div>

                {/* A tabela rola sozinha no celular; a página nunca estoura. */}
                <div className="overflow-x-auto -mx-1 px-1">
                  <table className="w-full min-w-[860px] border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--admin-border)]">
                        <th className={th}>Gerente</th>
                        <th className={`${th} text-right`}>Conversas</th>
                        <th className={`${th} text-right`}>
                          <button
                            onClick={() => alternarOrdem('perguntas')}
                            className={`inline-flex items-center gap-1 uppercase ${coluna === 'perguntas' ? 'text-wtech-gold' : ''}`}
                          >
                            Perguntas <ArrowUpDown size={12} />
                          </button>
                        </th>
                        <th className={`${th} text-right`}>Tokens entrada</th>
                        <th className={`${th} text-right`}>Tokens saída</th>
                        <th className={`${th} text-right`}>Tokens cache</th>
                        <th className={`${th} text-right`}>
                          <button
                            onClick={() => alternarOrdem('custo')}
                            className={`inline-flex items-center gap-1 uppercase ${coluna === 'custo' ? 'text-wtech-gold' : ''}`}
                          >
                            {rotuloCustoCurto} <ArrowUpDown size={12} />
                          </button>
                        </th>
                        <th className={`${th} text-right`}>Erros</th>
                        <th className={th}>Última atividade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhas.map((l) => (
                        <tr key={l.user_id} className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-surface-2)] transition-colors">
                          <td className={`${td} font-bold`}>{l.user_name || 'Sem nome'}</td>
                          <td className={`${td} text-right`}>{numero(l.threads)}</td>
                          <td className={`${td} text-right`}>{numero(l.perguntas)}</td>
                          <td className={`${td} text-right text-[var(--admin-text-secondary)]`}>{numero(l.input_tokens)}</td>
                          <td className={`${td} text-right text-[var(--admin-text-secondary)]`}>{numero(l.output_tokens)}</td>
                          <td className={`${td} text-right text-[var(--admin-text-secondary)]`}>{numero(l.cache_read_tokens)}</td>
                          <td className={`${td} text-right font-bold`}>
                            {dinheiro(l.custo_estimado_usd)}
                            {(() => {
                              // Parte já cobrada de verdade nesta linha. Só aparece
                              // quando há mistura — se tudo é medido, o rótulo da
                              // coluna já disse isso e repetir por linha é ruído.
                              const medidoLinha = numeroDe(l, CHAVES_CUSTO_MEDIDO);
                              if (medidoLinha === null || tudoMedido) return null;
                              const totalLinha = Number(l.custo_estimado_usd) || 0;
                              if (medidoLinha > totalLinha * 1.0001 + 1e-9) return null;
                              return (
                                <span className="block text-[10px] font-normal text-[var(--admin-text-tertiary)]">
                                  {dinheiro(medidoLinha)} medido
                                </span>
                              );
                            })()}
                          </td>
                          <td className={`${td} text-right ${Number(l.erros) > 0 ? 'text-red-500 font-bold' : 'text-[var(--admin-text-tertiary)]'}`}>
                            {numero(l.erros)}
                          </td>
                          <td className={`${td} text-[var(--admin-text-secondary)]`}>{dataHora(l.ultima_atividade)}</td>
                        </tr>
                      ))}

                      {linhas.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-3 py-8 text-center text-xs text-[var(--admin-text-tertiary)]">
                            Ninguém usou o chat neste período.
                          </td>
                        </tr>
                      )}
                    </tbody>

                    {linhas.length > 0 && totais && (
                      <tfoot>
                        <tr className="border-t-2 border-[var(--admin-border)] bg-[var(--admin-surface-2)]">
                          <td className={`${td} font-bold`}>Total</td>
                          <td className={`${td} text-right font-bold`}>{numero(totais.threads)}</td>
                          <td className={`${td} text-right font-bold`}>{numero(totais.perguntas)}</td>
                          <td className={`${td} text-right font-bold`}>{numero(totais.input_tokens)}</td>
                          <td className={`${td} text-right font-bold`}>{numero(totais.output_tokens)}</td>
                          <td className={`${td} text-right font-bold`}>{numero(totais.cache_read_tokens)}</td>
                          <td className={`${td} text-right font-bold`}>{dinheiro(custoTotal)}</td>
                          <td className={`${td} text-right font-bold`}>{numero(totais.erros)}</td>
                          <td className={td}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </section>

              {/* ── Ferramentas mais usadas ────────────────────────────────── */}
              <section className={cartao}>
                <h4 className="text-sm font-bold text-[var(--admin-text-primary)] flex items-center gap-2 mb-1">
                  <Wrench size={15} /> Ferramentas mais usadas
                </h4>
                <p className="text-xs text-[var(--admin-text-secondary)] mb-4">
                  O que a IA consultou no sistema para responder. Todas são de leitura.
                </p>

                <div className="space-y-3">
                  {ferramentas.map((f) => {
                    const largura = Math.max(4, Math.round(((Number(f.vezes) || 0) / maiorUso) * 100));
                    return (
                      <div key={f.name}>
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <span className="text-xs font-bold text-[var(--admin-text-primary)] truncate">{f.name}</span>
                          <span className="text-xs text-[var(--admin-text-secondary)] shrink-0">{numero(f.vezes)}x</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--admin-surface-3)] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${largura}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="h-full rounded-full bg-wtech-gold"
                          />
                        </div>
                      </div>
                    );
                  })}

                  {ferramentas.length === 0 && (
                    <p className="text-xs text-[var(--admin-text-tertiary)] py-3 text-center">
                      Nenhuma ferramenta foi usada neste período.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerChatReport;
