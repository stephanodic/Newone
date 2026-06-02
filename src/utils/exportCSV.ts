import { Transaction, Category } from '../types';
import { resolveCategory } from '../lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { it } from 'date-fns/locale';

export type ExportPeriod = 'current_month' | 'last_3_months' | 'current_year' | 'all';

interface ExportOptions {
  transactions: Transaction[];
  categories: Category[];
  period: ExportPeriod;
}

function filterByPeriod(transactions: Transaction[], period: ExportPeriod): Transaction[] {
  const now = new Date();
  if (period === 'all') return transactions;
  if (period === 'current_month') {
    return transactions.filter(t => isWithinInterval(parseISO(t.date), { start: startOfMonth(now), end: endOfMonth(now) }));
  }
  if (period === 'last_3_months') {
    const start = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 2, 1));
    return transactions.filter(t => isWithinInterval(parseISO(t.date), { start, end: endOfMonth(now) }));
  }
  if (period === 'current_year') {
    return transactions.filter(t => isWithinInterval(parseISO(t.date), { start: startOfYear(now), end: endOfYear(now) }));
  }
  return transactions;
}

function escapeCSV(value: string | number): string {
  const str = String(value);
  const safe = /^[=+\-@]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function exportToCSV({ transactions, categories, period }: ExportOptions): number {
  const filtered = filterByPeriod(transactions, period).sort(
    (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
  );
  if (filtered.length === 0) return 0;

  const headers = ['Data','Giorno','Tipo','Categoria','Emoji','Importo (EUR)','Entrata','Uscita','Note','Ricorrente'].map(escapeCSV).join(',');

  const rows = filtered.map(t => {
    const date = parseISO(t.date);
    const category = resolveCategory(t.category, categories);
    const categoryName = category?.name ?? t.category;
    const isIncome = t.type === 'INCOME';
    const amount = t.amount.toFixed(2);
    return [
      format(date, 'dd/MM/yyyy'),
      format(date, 'EEEE', { locale: it }),
      isIncome ? 'Entrata' : 'Uscita',
      categoryName,
      category?.emoji ?? '',
      isIncome ? amount : `-${amount}`,
      isIncome ? amount : '',
      isIncome ? '' : amount,
      t.note ?? '',
      t.isRecurring ? 'Sì' : 'No',
    ].map(escapeCSV).join(',');
  });

  const totalIncome = filtered.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const totalsRow = ['TOTALE','','','','', escapeCSV((balance >= 0 ? '+' : '') + balance.toFixed(2)), escapeCSV(totalIncome.toFixed(2)), escapeCSV(totalExpense.toFixed(2)),'',''].join(',');

  const periodLabels: Record<ExportPeriod, string> = { current_month: 'Mese corrente', last_3_months: 'Ultimi 3 mesi', current_year: 'Anno corrente', all: 'Tutti i dati' };
  const periodFilenames: Record<ExportPeriod, string> = { current_month: 'mese', last_3_months: '3mesi', current_year: 'anno', all: 'completo' };

  const summary = ['', `"Esportato il ${format(new Date(), "dd/MM/yyyy 'alle' HH:mm", { locale: it })}"`, `"Periodo: ${periodLabels[period]}"`, `"Transazioni: ${filtered.length}"`].join('\n');

  const BOM = '\uFEFF';
  const csvContent = BOM + [headers, ...rows, totalsRow, summary].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `moneytrack_${periodFilenames[period]}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filtered.length;
}


