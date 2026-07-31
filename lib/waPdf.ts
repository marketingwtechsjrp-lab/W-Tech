import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AtendenteStats, WaAnalise } from './waAtendentes';
import { CRITERIOS, EvolucaoPonto, WaEvolucao } from './waEvolucao';

/**
 * Exportação em PDF dos relatórios de atendimento por colaborador:
 *   • exportarRelatorioPDF  → relatório de um período (aba "Relatórios IA");
 *   • exportarEvolucaoPDF   → comparação entre períodos (aba "Evolução"), com
 *     gráficos desenhados nativamente no jsPDF (nada de captura de tela, o
 *     resultado é vetorial e legível impresso).
 *
 * Segue o mesmo padrão visual de lib/pdfGenerator.ts (linha dourada, cabeçalho
 * preto nas tabelas, rodapé com paginação).
 */

const MARGEM = 15;
const LARGURA = 210;
const LIMITE_RODAPE = 275;

const DOURADO: [number, number, number] = [212, 175, 55];
const PRETO: [number, number, number] = [0, 0, 0];
const CINZA: [number, number, number] = [100, 100, 100];
const CINZA_CLARO: [number, number, number] = [210, 210, 210];
const AZUL: [number, number, number] = [14, 165, 233];
const LARANJA: [number, number, number] = [245, 158, 11];
const VERDE: [number, number, number] = [22, 163, 74];
const VERMELHO: [number, number, number] = [220, 38, 38];

const fmtData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');
const fmtDataHora = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const sinal = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const nomeArquivo = (base: string) =>
    base.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();

// ─────────────────────────────────────────────────────────────────────────────
// Estrutura do documento
// ─────────────────────────────────────────────────────────────────────────────

/** Cabeçalho institucional + título. Devolve o Y onde o conteúdo começa. */
function cabecalho(doc: jsPDF, titulo: string, subtitulo: string): number {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...PRETO);
    doc.text('W-TECH BRASIL', MARGEM, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...CINZA);
    doc.text('Qualidade de atendimento — WhatsApp', MARGEM, 26);
    doc.text(`Emitido em ${fmtDataHora(new Date().toISOString())}`, LARGURA - MARGEM, 26, { align: 'right' });

    doc.setDrawColor(...DOURADO);
    doc.setLineWidth(0.5);
    doc.line(MARGEM, 31, LARGURA - MARGEM, 31);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...PRETO);
    doc.text(titulo.toUpperCase(), MARGEM, 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...CINZA);
    doc.text(subtitulo, MARGEM, 46);

    return 54;
}

function rodape(doc: jsPDF): void {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Relatório interno W-Tech Brasil · gerado por IA a partir das conversas espelhadas · página ${i} de ${total}`,
            LARGURA / 2, 285, { align: 'center' },
        );
    }
}

/** Quebra de página quando o bloco não cabe; devolve o Y a usar. */
function garantirEspaco(doc: jsPDF, y: number, altura: number): number {
    if (y + altura <= LIMITE_RODAPE) return y;
    doc.addPage();
    return 20;
}

function secao(doc: jsPDF, y: number, titulo: string): number {
    const yy = garantirEspaco(doc, y, 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...PRETO);
    doc.text(titulo, MARGEM, yy);
    return yy + 6;
}

/** Texto corrido com quebra automática de linha e de página. */
function paragrafo(doc: jsPDF, y: number, texto: string, tamanho = 9): number {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(tamanho);
    doc.setTextColor(40, 40, 40);

    const linhas = doc.splitTextToSize(texto, LARGURA - MARGEM * 2) as string[];
    const alturaLinha = tamanho * 0.52;
    let yy = y;

    for (const linha of linhas) {
        yy = garantirEspaco(doc, yy, alturaLinha);
        doc.text(linha, MARGEM, yy);
        yy += alturaLinha;
    }
    return yy;
}

const finalDaTabela = (doc: jsPDF): number => (doc as any).lastAutoTable.finalY + 8;

// ─────────────────────────────────────────────────────────────────────────────
// Gráfico de linha nativo (vetorial, sem html2canvas)
// ─────────────────────────────────────────────────────────────────────────────

interface GraficoOpcoes {
    titulo: string;
    valores: number[];
    rotulos: string[];
    cor: [number, number, number];
    /** Rótulo do eixo Y; quando ausente usa o próprio valor. */
    formatarValor?: (v: number) => string;
    minimo?: number;
    maximo?: number;
}

function desenharGrafico(doc: jsPDF, y: number, opcoes: GraficoOpcoes): number {
    const altura = 46;
    const yy = garantirEspaco(doc, y, altura + 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...PRETO);
    doc.text(opcoes.titulo, MARGEM, yy);

    const topo = yy + 4;
    const base = topo + altura;
    const esquerda = MARGEM + 12;
    const direita = LARGURA - MARGEM;
    const largura = direita - esquerda;

    const min = opcoes.minimo ?? 0;
    const max = opcoes.maximo ?? Math.max(...opcoes.valores, 1) * 1.15;
    const paraY = (v: number) => base - ((v - min) / (max - min || 1)) * altura;
    const paraX = (i: number) =>
        opcoes.valores.length === 1 ? esquerda + largura / 2 : esquerda + (i / (opcoes.valores.length - 1)) * largura;

    // grade + escala
    doc.setFontSize(7);
    doc.setTextColor(...CINZA);
    doc.setLineWidth(0.1);
    for (let i = 0; i <= 4; i++) {
        const valor = min + ((max - min) * i) / 4;
        const linhaY = paraY(valor);
        doc.setDrawColor(...CINZA_CLARO);
        doc.line(esquerda, linhaY, direita, linhaY);
        doc.text(opcoes.formatarValor ? opcoes.formatarValor(valor) : String(Math.round(valor * 10) / 10),
            esquerda - 2, linhaY + 1, { align: 'right' });
    }

    // série
    doc.setDrawColor(...opcoes.cor);
    doc.setLineWidth(0.8);
    for (let i = 1; i < opcoes.valores.length; i++) {
        doc.line(paraX(i - 1), paraY(opcoes.valores[i - 1]), paraX(i), paraY(opcoes.valores[i]));
    }

    doc.setFillColor(...opcoes.cor);
    opcoes.valores.forEach((v, i) => doc.circle(paraX(i), paraY(v), 0.9, 'F'));

    // rótulos do eixo X — só o que couber, para não empilhar texto
    const passo = Math.max(1, Math.ceil(opcoes.rotulos.length / 6));
    doc.setFontSize(6.5);
    doc.setTextColor(...CINZA);
    opcoes.rotulos.forEach((r, i) => {
        if (i % passo !== 0 && i !== opcoes.rotulos.length - 1) return;
        doc.text(r, paraX(i), base + 4, { align: 'center' });
    });

    return base + 12;
}

// ─────────────────────────────────────────────────────────────────────────────
// Relatório de evolução (aba "Evolução")
// ─────────────────────────────────────────────────────────────────────────────

const VEREDITO_LABEL: Record<string, string> = {
    evoluiu: 'EVOLUIU',
    piorou: 'PIOROU',
    estavel: 'ESTÁVEL',
};

export function exportarEvolucaoPDF(evolucao: WaEvolucao): void {
    const { resumo, pontuacoes } = evolucao;
    if (!resumo || !pontuacoes?.length) throw new Error('Esta análise não tem pontuações para exportar.');

    const doc = new jsPDF();
    const nome = evolucao.atendente_nome || 'Colaborador';

    let y = cabecalho(
        doc,
        `Evolução do atendimento — ${nome}`,
        `${evolucao.relatorios_analisados} relatórios comparados · ${resumo.primeiroPeriodo} até ${resumo.ultimoPeriodo} · análise de ${fmtDataHora(evolucao.created_at)}`,
    );

    // Painel de resultado. Cada célula recebe a cor do PRÓPRIO indicador: pintar a
    // linha inteira com a cor do veredito faria "6 min → 9 min" (que piorou)
    // aparecer em verde num relatório com veredito positivo.
    const temTempo = resumo.tempoRespostaInicial !== null && resumo.tempoRespostaFinal !== null;
    const deltaTempo = temTempo ? resumo.tempoRespostaFinal! - resumo.tempoRespostaInicial! : 0;
    const coresPainel: ([number, number, number] | null)[] = [
        resumo.veredito === 'evoluiu' ? VERDE : resumo.veredito === 'piorou' ? VERMELHO : CINZA,
        resumo.deltaGeral > 0 ? VERDE : resumo.deltaGeral < 0 ? VERMELHO : CINZA,
        !temTempo || deltaTempo === 0 ? CINZA : deltaTempo < 0 ? VERDE : VERMELHO,
        null,
    ];

    autoTable(doc, {
        startY: y,
        head: [['Veredito', 'Nota geral', 'Tempo de resposta', 'Média início → fim']],
        body: [[
            VEREDITO_LABEL[resumo.veredito] || resumo.veredito,
            `${resumo.notaInicial} → ${resumo.notaFinal}  (${sinal(resumo.deltaGeral)})`,
            temTempo
                ? `${resumo.tempoRespostaInicial} min → ${resumo.tempoRespostaFinal} min (${sinal(deltaTempo)} min)`
                : 'sem dados',
            `${resumo.mediaInicial} → ${resumo.mediaFinal}`,
        ]],
        headStyles: { fillColor: PRETO, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9.5, fontStyle: 'bold', textColor: [40, 40, 40] },
        margin: { left: MARGEM, right: MARGEM },
        theme: 'grid',
        didParseCell: dados => {
            if (dados.section !== 'body') return;
            const cor = coresPainel[dados.column.index];
            if (cor) dados.cell.styles.textColor = cor;
        },
    });
    y = finalDaTabela(doc);

    // Gráficos
    y = desenharGrafico(doc, y, {
        titulo: 'Nota geral por período (0 a 10)',
        valores: pontuacoes.map(p => p.notas.geral),
        rotulos: pontuacoes.map(p => p.label.split('→').pop()?.trim() || p.label),
        cor: AZUL,
        minimo: 0,
        maximo: 10,
    });

    const comTempo = pontuacoes.filter(p => p.metricas?.tempoRespostaMin != null);
    if (comTempo.length >= 2) {
        y = desenharGrafico(doc, y, {
            titulo: 'Tempo médio de resposta (quanto menor, melhor)',
            valores: comTempo.map(p => p.metricas!.tempoRespostaMin as number),
            rotulos: comTempo.map(p => p.label.split('→').pop()?.trim() || p.label),
            cor: LARANJA,
            formatarValor: v => `${Math.round(v)}m`,
        });
    }

    // Notas por critério
    y = secao(doc, y, 'Notas por critério');
    const primeiro = pontuacoes[0];
    const ultimo = pontuacoes[pontuacoes.length - 1];
    autoTable(doc, {
        startY: y,
        head: [['Critério', 'Primeiro relatório', 'Último relatório', 'Variação']],
        body: CRITERIOS.map(c => [
            c.label,
            String(primeiro.notas[c.key]),
            String(ultimo.notas[c.key]),
            sinal(resumo.deltas[c.key]),
        ]),
        headStyles: { fillColor: PRETO, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: MARGEM, right: MARGEM },
        theme: 'striped',
        didParseCell: dados => {
            if (dados.section !== 'body' || dados.column.index !== 3) return;
            const valor = Number(String(dados.cell.raw).replace('+', ''));
            dados.cell.styles.textColor = valor > 0 ? VERDE : valor < 0 ? VERMELHO : CINZA;
            dados.cell.styles.fontStyle = 'bold';
        },
    });
    y = finalDaTabela(doc);

    // Período a período
    y = secao(doc, y, 'Histórico período a período');
    autoTable(doc, {
        startY: y,
        head: [['Período', 'Nota', 'Conversas', 'Resposta média', 'Observação da IA']],
        body: pontuacoes.map((p: EvolucaoPonto) => [
            p.label,
            String(p.notas.geral),
            p.metricas ? String(p.metricas.conversas) : '—',
            p.metricas?.tempoRespostaMin != null ? `${p.metricas.tempoRespostaMin} min` : '—',
            p.destaque + (p.confianca === 'baixa' ? ' (pouca base)' : ''),
        ]),
        headStyles: { fillColor: PRETO, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: { 4: { cellWidth: 70 } },
        margin: { left: MARGEM, right: MARGEM },
        theme: 'striped',
    });
    y = finalDaTabela(doc);

    // Relatório completo
    y = secao(doc, y, 'Relatório comparativo completo');
    paragrafo(doc, y, evolucao.relatorio);

    rodape(doc);
    doc.save(`evolucao_${nomeArquivo(nome)}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Relatório de um período (aba "Relatórios IA")
// ─────────────────────────────────────────────────────────────────────────────

export function exportarRelatorioPDF(analise: WaAnalise): void {
    const doc = new jsPDF();
    const nome = analise.atendente_nome || 'Todos os atendentes';
    const stats: AtendenteStats[] = analise.stats?.porAtendente || [];

    let y = cabecalho(
        doc,
        `Relatório de atendimento — ${nome}`,
        `Período de ${fmtData(analise.periodo_inicio)} a ${fmtData(analise.periodo_fim)} · análise de ${fmtDataHora(analise.created_at)}` +
        (analise.stats?.totalMensagens ? ` · ${analise.stats.totalMensagens} mensagens analisadas` : ''),
    );

    if (stats.length) {
        y = secao(doc, y, 'Métricas do período');
        autoTable(doc, {
            startY: y,
            head: [['Atendente', 'Conversas', 'Mensagens', 'Enviadas', 'Recebidas', 'Aguardando', 'Resposta média']],
            body: stats.map(s => [
                s.atendente,
                String(s.conversas),
                String(s.total),
                String(s.enviadas),
                String(s.recebidas),
                String(s.aguardandoResposta),
                s.tempoMedioRespostaMin !== null ? `${s.tempoMedioRespostaMin} min` : '—',
            ]),
            headStyles: { fillColor: PRETO, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            margin: { left: MARGEM, right: MARGEM },
            theme: 'striped',
        });
        y = finalDaTabela(doc);
    }

    y = secao(doc, y, 'Análise da IA');
    paragrafo(doc, y, analise.relatorio);

    rodape(doc);
    doc.save(`relatorio_${nomeArquivo(nome)}_${fmtData(analise.periodo_fim).replace(/\//g, '-')}.pdf`);
}
