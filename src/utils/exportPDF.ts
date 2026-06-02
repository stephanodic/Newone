import { Transaction, Category } from '../types';
import { resolveCategory } from '../lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { ExportPeriod } from './exportCSV';

interface ExportOptions {
  transactions: Transaction[];
  categories: Category[];
  period: ExportPeriod;
}

const PERIOD_LABELS: Record<ExportPeriod, string> = {
  current_month: 'Mese corrente',
  last_3_months: 'Ultimi 3 mesi',
  current_year:  'Anno corrente',
  all:           'Tutti i dati',
};
const PERIOD_FILENAMES: Record<ExportPeriod, string> = {
  current_month: 'mese',
  last_3_months: '3mesi',
  current_year:  'anno',
  all:           'completo',
};

function filterByPeriod(txs: Transaction[], period: ExportPeriod): Transaction[] {
  const now = new Date();
  if (period === 'all') return txs;
  if (period === 'current_month')
    return txs.filter(t => isWithinInterval(parseISO(t.date), { start: startOfMonth(now), end: endOfMonth(now) }));
  if (period === 'last_3_months') {
    const start = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 2, 1));
    return txs.filter(t => isWithinInterval(parseISO(t.date), { start, end: endOfMonth(now) }));
  }
  if (period === 'current_year')
    return txs.filter(t => isWithinInterval(parseISO(t.date), { start: startOfYear(now), end: endOfYear(now) }));
  return txs;
}

/**
 * Generates and downloads a PDF report.
 * jsPDF is loaded dynamically so it's excluded from the main bundle.
 * Returns the number of transactions included (0 if nothing to export).
 */
export async function exportToPDF({ transactions, categories, period }: ExportOptions): Promise<number> {
  const filtered = filterByPeriod(transactions, period).sort(
    (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime(),
  );
  if (filtered.length === 0) return 0;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const ml = 14; // margin left
  let y = 0;

  // ── HEADER ──────────────────────────────────────────────────────────────
  doc.setFillColor(29, 158, 117);
  doc.rect(0, 0, pageW, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('MoneyTrack', ml, 18);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(PERIOD_LABELS[period], ml, 27);
  doc.text(
    `Generato il ${format(new Date(), "dd/MM/yyyy 'alle' HH:mm", { locale: it })}`,
    ml, 34,
  );

  y = 48;

  // ── SUMMARY BOXES ────────────────────────────────────────────────────────
  const totalIncome  = filtered.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  type RGB = [number, number, number];
  const boxes: { label: string; value: string; bg: RGB; fg: RGB }[] = [
    { label: 'ENTRATE',  value: `+€${totalIncome.toFixed(2)}`,
      bg: [209, 250, 229], fg: [21, 128, 61]  },
    { label: 'USCITE',   value: `-€${totalExpense.toFixed(2)}`,
      bg: [254, 226, 226], fg: [185, 28, 28]  },
    { label: 'SALDO',    value: `${balance >= 0 ? '+' : ''}€${balance.toFixed(2)}`,
      bg: [241, 245, 249], fg: balance >= 0 ? [21, 128, 61] : [185, 28, 28] },
  ];

  const boxW = (pageW - ml * 2 - 6) / 3;
  boxes.forEach((box, i) => {
    const bx = ml + i * (boxW + 3);
    doc.setFillColor(...box.bg);
    doc.roundedRect(bx, y, boxW, 22, 2, 2, 'F');
    doc.setTextColor(...box.fg);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(box.label, bx + 4, y + 8);
    doc.setFontSize(10);
    doc.text(box.value, bx + 4, y + 17);
  });

  y += 30;

  // ── BAR CHART — top 8 expense categories ────────────────────────────────
  const catTotals: Record<string, { name: string; color: string; amount: number }> = {};
  for (const t of filtered.filter(tx => tx.type === 'EXPENSE')) {
    const cat = resolveCategory(t.category, categories);
    const key = cat?.id ?? t.category;
    if (!catTotals[key]) catTotals[key] = { name: cat?.name ?? t.category, color: cat?.color ?? '#94a3b8', amount: 0 };
    catTotals[key].amount += t.amount;
  }
  const topCats = Object.values(catTotals).sort((a, b) => b.amount - a.amount).slice(0, 8);

  if (topCats.length > 0) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('TOP CATEGORIE (USCITE)', ml, y);
    y += 5;

    const maxAmount = topCats[0].amount;
    const barAreaW = pageW - ml * 2 - 40;
    const barH = 5;
    const barGap = 3;

    topCats.forEach(cat => {
      const ratio = maxAmount > 0 ? cat.amount / maxAmount : 0;
      const barW = Math.max(2, ratio * barAreaW);
      const hex = cat.color.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      doc.setFillColor(r, g, b);
      doc.roundedRect(ml, y, barW, barH, 1, 1, 'F');
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      const label = cat.name.length > 18 ? cat.name.slice(0, 16) + '…' : cat.name;
      doc.text(`${label}   €${cat.amount.toFixed(0)}`, ml + barAreaW + 3, y + barH - 0.5);
      y += barH + barGap;
    });
    y += 6;
  }

  // ── TABLE ────────────────────────────────────────────────────────────────
  // Column definitions
  const COL = {
    date: { x: ml,      w: 18 },
    cat:  { x: ml + 18, w: 44 },
    type: { x: ml + 62, w: 16 },
    note: { x: ml + 78, w: 72 },
    amt:  { x: pageW - ml, w: 0 }, // right-aligned
  };

  // Header
  doc.setFillColor(241, 245, 249);
  doc.rect(ml, y, pageW - ml * 2, 8, 'F');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DATA',      COL.date.x + 1, y + 5.5);
  doc.text('CATEGORIA', COL.cat.x + 1,  y + 5.5);
  doc.text('TIPO',      COL.type.x + 1, y + 5.5);
  doc.text('NOTE',      COL.note.x + 1, y + 5.5);
  doc.text('IMPORTO',   COL.amt.x,      y + 5.5, { align: 'right' });
  y += 10;

  // Rows
  doc.setFontSize(7.5);
  filtered.forEach((t, idx) => {
    if (y > pageH - 28) {
      doc.addPage();
      y = 18;
    }
    const isIncome = t.type === 'INCOME';
    if (idx % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(ml, y - 3, pageW - ml * 2, 9, 'F');
    }
    const cat  = resolveCategory(t.category, categories);
    const catN = (cat?.name ?? t.category);
    const catLabel = catN.length > 20 ? catN.slice(0, 18) + '…' : catN;
    const noteRaw = t.note ?? '';
    const noteLabel = noteRaw.length > 30 ? noteRaw.slice(0, 28) + '…' : noteRaw;

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.text(format(parseISO(t.date), 'dd/MM/yy'), COL.date.x + 1, y + 3);
    doc.text(catLabel,  COL.cat.x + 1,  y + 3);
    doc.text(isIncome ? 'Entrata' : 'Uscita', COL.type.x + 1, y + 3);
    doc.text(noteLabel, COL.note.x + 1, y + 3);

    doc.setFont('helvetica', 'bold');
    isIncome ? doc.setTextColor(21, 128, 61) : doc.setTextColor(185, 28, 28);
    doc.text(`${isIncome ? '+' : '-'}€${t.amount.toFixed(2)}`, COL.amt.x, y + 3, { align: 'right' });
    y += 9;
  });

  // ── TOTAL ROW ────────────────────────────────────────────────────────────
  if (y > pageH - 28) { doc.addPage(); y = 18; }
  y += 2;
  doc.setFillColor(29, 158, 117);
  doc.rect(ml, y, pageW - ml * 2, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTALE (${filtered.length} operazioni)`, ml + 3, y + 6.5);
  doc.text(`${balance >= 0 ? '+' : ''}€${balance.toFixed(2)}`, COL.amt.x, y + 6.5, { align: 'right' });

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const lastPage = (doc.internal as any).getNumberOfPages?.() ?? 1;
  for (let p = 1; p <= lastPage; p++) {
    doc.setPage(p);
    doc.setTextColor(203, 213, 225);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text('MoneyTrack', ml, pageH - 6);
    doc.text(`moneytracknew-v3.vercel.app  ·  pag. ${p}/${lastPage}`, pageW - ml, pageH - 6, { align: 'right' });
  }

  doc.save(`moneytrack_${PERIOD_FILENAMES[period]}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  return filtered.length;
}
