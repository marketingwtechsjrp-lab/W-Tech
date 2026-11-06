import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { vacuumDayLabel, vacuumItemsShort, vacuumPaymentShort, vacuumSaleDay, type VacuumReport, type VacuumSaleRow } from './vacuumSales';

/**
 * PDF do relatório de vendas da promoção. Fica em um módulo próprio porque o jsPDF é pesado:
 * a tela só o carrega quando alguém pede o arquivo. CPF e telefone ficam de fora de propósito,
 * porque esta folha circula impressa.
 */

export interface VacuumPdfMeta {
    periodLabel: string;
    sellerLabel: string;
    generatedBy: string;
    generatedAt: Date;
}

type Rgb = [number, number, number];
const RED: Rgb = [212, 0, 0];
const INK: Rgb = [17, 17, 20];
const MUTE: Rgb = [105, 105, 115];
const LINE: Rgb = [222, 222, 228];
const SOFT: Rgb = [245, 245, 247];
const AMBER: Rgb = [176, 112, 0];

const MARGIN = 12;
const LEGAL = 'W-TECH BRASIL LTDA. · CNPJ 04.545.824/0001-06 · Uso interno';

const brl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const percent = (value: number) => `${value.toFixed(1).replace('.', ',')}%`;

function lastY(doc: jsPDF): number {
    return (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function place(sale: VacuumSaleRow): string {
    return [sale.delivery_city, sale.delivery_state].filter(Boolean).join('/') || '-';
}

function saleRow(sale: VacuumSaleRow): string[] {
    return [
        sale.order_number || '-',
        vacuumDayLabel(vacuumSaleDay(sale)),
        sale.customer_name,
        place(sale),
        vacuumItemsShort(sale.items),
        vacuumPaymentShort(sale.payment_method),
        sale.manual_sale ? 'Manual' : 'Site',
        brl(sale.total_value),
    ];
}

const SALE_HEAD = ['Pedido', 'Data', 'Cliente', 'Cidade', 'Itens', 'Pagamento', 'Origem', 'Total'];
const SALE_COLUMNS = {
    0: { cellWidth: 29 },
    1: { cellWidth: 21 },
    3: { cellWidth: 34 },
    5: { cellWidth: 27 },
    6: { cellWidth: 15 },
    7: { cellWidth: 26 },
};

type Align = 'center' | 'right';

/** O columnStyles só vale para o corpo: isto alinha também o cabeçalho e o total de cada coluna. */
function alignColumns(aligns: Record<number, Align>) {
    return (hook: { column: { index: number }; cell: { styles: { halign?: string } } }) => {
        const align = aligns[hook.column.index];
        if (align) hook.cell.styles.halign = align;
    };
}
const SALE_ALIGN = alignColumns({ 7: 'right' });

function heading(doc: jsPDF, text: string, y: number, need = 28): number {
    let top = y;
    if (top + need > doc.internal.pageSize.getHeight() - 14) {
        doc.addPage();
        top = 14;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(text, MARGIN, top);
    return top + 2.5;
}

export function buildVacuumReportPdf(report: VacuumReport, meta: VacuumPdfMeta): jsPDF {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const width = doc.internal.pageSize.getWidth();
    const inner = width - MARGIN * 2;

    doc.setFillColor(...INK);
    doc.rect(0, 0, width, 22, 'F');
    doc.setFillColor(...RED);
    doc.rect(MARGIN, 6, 26, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(13);
    doc.text('W-TECH', MARGIN + 13, 13, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Relatório de vendas por vendedor', MARGIN + 31, 10.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text('Vacuum Pump Standard · Black Friday', MARGIN + 31, 16);
    doc.setFontSize(8.5);
    const when = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(meta.generatedAt);
    doc.text(`Gerado em ${when}`, width - MARGIN, 10.5, { align: 'right' });
    doc.text(`Por ${meta.generatedBy}`, width - MARGIN, 16, { align: 'right' });

    doc.setTextColor(...MUTE);
    doc.setFontSize(9.5);
    doc.text(`Período: ${meta.periodLabel}   ·   Vendedor: ${meta.sellerLabel}`, MARGIN, 29);

    const tiles: [string, string][] = [
        ['Máquinas vendidas', String(report.totals.machines)],
        ['Faturamento', brl(report.totals.revenue)],
        ['Ticket médio', brl(report.totals.ticket)],
        ['Manual / Site', `${report.totals.manual} / ${report.totals.site}`],
        ['Acessórios', String(report.totals.accessories)],
    ];
    const gap = 3;
    const tileWidth = (inner - gap * (tiles.length - 1)) / tiles.length;
    tiles.forEach(([label, value], index) => {
        const x = MARGIN + index * (tileWidth + gap);
        doc.setFillColor(...SOFT);
        doc.setDrawColor(...LINE);
        doc.roundedRect(x, 32, tileWidth, 17, 1.5, 1.5, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...MUTE);
        doc.text(label, x + 3, 37.5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...INK);
        doc.text(value, x + 3, 45);
    });

    const tableBase = {
        margin: { left: MARGIN, right: MARGIN, top: 14, bottom: 14 },
        theme: 'grid' as const,
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.6, textColor: INK, lineColor: LINE, lineWidth: 0.15, overflow: 'linebreak' as const },
        headStyles: { fillColor: INK, textColor: [255, 255, 255] as Rgb, fontStyle: 'bold' as const },
        footStyles: { fillColor: SOFT, textColor: INK, fontStyle: 'bold' as const },
    };

    let y = heading(doc, 'Resumo por vendedor', 56);
    autoTable(doc, {
        ...tableBase,
        startY: y,
        head: [['Vendedor', 'Máquinas', 'Manuais', 'Site', 'Acessórios', 'Faturamento', 'Ticket médio', '% do total']],
        body: report.groups.map((group) => [
            group.name,
            String(group.machines),
            String(group.manual),
            String(group.site),
            String(group.accessories),
            brl(group.revenue),
            group.machines ? brl(group.ticket) : '-',
            percent(group.share),
        ]),
        foot: [[
            'Total',
            String(report.totals.machines),
            String(report.totals.manual),
            String(report.totals.site),
            String(report.totals.accessories),
            brl(report.totals.revenue),
            report.totals.machines ? brl(report.totals.ticket) : '-',
            report.totals.revenue > 0 ? '100,0%' : '0,0%',
        ]],
        columnStyles: {
            1: { cellWidth: 22 },
            2: { cellWidth: 22 },
            3: { cellWidth: 18 },
            4: { cellWidth: 24 },
            5: { cellWidth: 36 },
            6: { cellWidth: 32 },
            7: { cellWidth: 24 },
        },
        didParseCell: alignColumns({ 1: 'center', 2: 'center', 3: 'center', 4: 'center', 5: 'right', 6: 'right', 7: 'right' }),
    });
    y = lastY(doc) + 9;

    for (const group of report.groups) {
        if (!group.sales.length) continue;
        const machines = `${group.machines} ${group.machines === 1 ? 'máquina' : 'máquinas'}`;
        y = heading(doc, `${group.name}: ${machines}, ${brl(group.revenue)}`, y);
        autoTable(doc, {
            ...tableBase,
            startY: y,
            head: [SALE_HEAD],
            body: group.sales.map(saleRow),
            foot: [[{ content: `Subtotal de ${group.name}`, colSpan: 7 }, { content: brl(group.revenue), styles: { halign: 'right' } }]],
            columnStyles: SALE_COLUMNS,
            didParseCell: SALE_ALIGN,
        });
        y = lastY(doc) + 9;
    }

    if (report.pending.length) {
        y = heading(doc, `Aguardando pagamento (${report.pending.length}): não somam nos totais acima`, y);
        autoTable(doc, {
            ...tableBase,
            startY: y,
            headStyles: { ...tableBase.headStyles, fillColor: AMBER },
            head: [[...SALE_HEAD.slice(0, 6), 'Vendedor', 'Total']],
            body: report.pending.map((sale) => {
                const row = saleRow(sale);
                row[6] = sale.seller_name || '-';
                return row;
            }),
            columnStyles: { ...SALE_COLUMNS, 6: { cellWidth: 22 } },
            didParseCell: SALE_ALIGN,
        });
        y = lastY(doc) + 6;
    }

    if (!report.totals.machines && !report.pending.length) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...MUTE);
        doc.text('Nenhuma venda neste período.', MARGIN, y);
    }

    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
        doc.setPage(page);
        const bottom = doc.internal.pageSize.getHeight() - 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...MUTE);
        doc.text(LEGAL, MARGIN, bottom);
        doc.text(`Página ${page} de ${pages}`, width - MARGIN, bottom, { align: 'right' });
    }
    return doc;
}

export function downloadVacuumReportPdf(report: VacuumReport, meta: VacuumPdfMeta): void {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(meta.generatedAt);
    buildVacuumReportPdf(report, meta).save(`relatorio-vendas-vacuum-pump-${day}.pdf`);
}

/** Abre o PDF com a janela de impressão. Navegador que bloqueia a aba nova recebe o arquivo. */
export function printVacuumReportPdf(report: VacuumReport, meta: VacuumPdfMeta): void {
    const doc = buildVacuumReportPdf(report, meta);
    doc.autoPrint();
    const opened = window.open(String(doc.output('bloburl')), '_blank');
    if (!opened) downloadVacuumReportPdf(report, meta);
}
