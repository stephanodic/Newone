/**
 * stats.ts — pure functions, zero React, zero Firestore.
 * Extracted from useTransactions for testability and reuse.
 */
import {
  parseISO,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  subWeeks,
  format,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { Transaction, Category, StatsResult, FilterState } from '../types';
import { resolveCategory } from './utils';

/**
 * Filters transactions to only those matching the active FilterState period.
 */
export function filterByPeriod(
  transactions: Transaction[],
  filters: FilterState,
): Transaction[] {
  return transactions.filter(t => {
    const tDate = parseISO(t.date);
    if (filters.period === 'MONTHLY') {
      const start = startOfMonth(filters.date);
      const end = endOfMonth(filters.date);
      return isWithinInterval(tDate, { start, end });
    }
    if (filters.period === 'DAILY') {
      const start = startOfDay(filters.date);
      const end = endOfDay(filters.date);
      return isWithinInterval(tDate, { start, end });
    }
    if (filters.period === 'CUSTOM') {
      const start = startOfDay(filters.range.from);
      const end = endOfDay(filters.range.to);
      // Avoid isWithinInterval throwing when start > end
      if (start > end) return false;
      return isWithinInterval(tDate, { start, end });
    }
    return false;
  });
}

/**
 * Sorts categories by usage frequency (most-used first), falling back to
 * the explicit `order` field. Used in Dashboard and CategorieTab to surface
 * frequently-used categories at the top of the grid.
 */
export function sortCategoriesByUsage(
  categories: Category[],
  transactions: Transaction[],
): Category[] {
  const count = new Map<string, number>();
  for (const tx of transactions) {
    count.set(tx.category, (count.get(tx.category) ?? 0) + 1);
  }
  return [...categories].sort((a, b) => {
    const diff = (count.get(b.id) ?? 0) - (count.get(a.id) ?? 0);
    if (diff !== 0) return diff;
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return 0;
  });
}

/**
 * Computes derived stats from a filtered list of transactions.
 *
 * @param filtered - transactions already restricted to the current period
 * @param all      - ALL transactions (needed for totalBalance, which is wallet-wide)
 * @param categories - category definitions for label/colour resolution
 */
export function computeStats(
  filtered: Transaction[],
  all: Transaction[],
  categories: Category[],
): StatsResult {
  let income = 0;
  let expense = 0;
  // Keys are always the resolved category *name* (never a raw ID) so that
  // budgetStatus lookups via `c.name` and categoryBreakdown labels are consistent
  // regardless of whether a transaction stores the category by ID or legacy name.
  const catTotal: Record<string, number> = {};

  filtered.forEach(t => {
    if (t.type === 'INCOME') {
      income += t.amount;
    } else {
      expense += t.amount;
      // resolveCategory handles both old name-based and new ID-based references
      const cat = resolveCategory(t.category, categories);
      const key = cat?.name ?? t.category; // fallback: orphaned / unknown category
      catTotal[key] = (catTotal[key] || 0) + t.amount;
    }
  });

  // Build pie-chart breakdown
  const categoryBreakdown = Object.entries(catTotal).map(([nameOrId, amount]) => {
    // `nameOrId` is normally a resolved name; in the edge case of an orphaned
    // transaction whose category was deleted *after* migration, it may be a raw ID.
    const cat =
      categories.find(c => c.name === nameOrId) ??
      categories.find(c => c.id === nameOrId);
    return {
      category: cat?.name ?? nameOrId,
      amount,
      color: cat?.color || '#cbd5e1',
      emoji: cat?.emoji || 'Wallet',
      percentage: expense > 0 ? (amount / expense) * 100 : 0,
    };
  });

  // Budget monitoring — only categories with a monthly limit
  const budgetStatus = categories
    .filter(c => c.monthlyLimit)
    .map(c => {
      const spent = catTotal[c.name] || 0;
      const limit = c.monthlyLimit!;
      return {
        id: c.id,
        name: c.name,
        color: c.color,
        emoji: c.emoji,
        spent,
        limit,
        percentage: (spent / limit) * 100,
        isExceeded: spent > limit,
      };
    });

  // totalBalance is wallet-wide (all transactions, not just the filtered period)
  const totalBalance = all.reduce(
    (acc, t) => acc + (t.type === 'INCOME' ? t.amount : -t.amount),
    0,
  );

  return {
    monthlyIncome: income,
    monthlyExpense: expense,
    balance: income - expense,
    totalBalance,
    categoryBreakdown,
    budgetStatus,
  };
}

/**
 * T2-C — Returns true if a non-recurring EXPENSE category has transactions
 * in ≥3 of the last 4 calendar months. Excludes the current month to avoid
 * triggering on the very first transaction of the month just added.
 */
export function shouldSuggestRecurrence(
  categoryId: string,
  categoryName: string,
  allTransactions: Transaction[],
): boolean {
  const txs = allTransactions.filter(
    t =>
      (t.category === categoryId || t.category === categoryName) &&
      !t.isRecurring &&
      !t.parentId &&
      t.type === 'EXPENSE',
  );
  if (txs.length < 3) return false;
  const months = new Set(txs.map(t => t.date.substring(0, 7)));
  if (months.size < 3) return false;
  const now = new Date();
  let count = 0;
  for (let i = 1; i <= 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (months.has(key)) count++;
  }
  return count >= 3;
}

/**
 * T2-B — Computes last-week and previous-week spending from allTransactions.
 * Returns null when there are no transactions at all.
 */
export function computeWeeklyRecap(
  allTransactions: Transaction[],
  categories: Category[],
): {
  lastWeekTotal: number;
  prevWeekTotal: number;
  weekRange: string;
  topCategories: { name: string; emoji: string; color: string; amount: number }[];
} | null {
  if (allTransactions.length === 0) return null;
  const now = new Date();
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd   = endOfWeek(subWeeks(now, 1),   { weekStartsOn: 1 });
  const prevWeekStart = startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
  const prevWeekEnd   = endOfWeek(subWeeks(now, 2),   { weekStartsOn: 1 });

  const inLastWeek = allTransactions.filter(
    t => t.type === 'EXPENSE' &&
      isWithinInterval(parseISO(t.date), { start: lastWeekStart, end: lastWeekEnd }),
  );
  const inPrevWeek = allTransactions.filter(
    t => t.type === 'EXPENSE' &&
      isWithinInterval(parseISO(t.date), { start: prevWeekStart, end: prevWeekEnd }),
  );

  const lastWeekTotal = inLastWeek.reduce((s, t) => s + t.amount, 0);
  const prevWeekTotal = inPrevWeek.reduce((s, t) => s + t.amount, 0);

  const catTotals: Record<string, number> = {};
  for (const t of inLastWeek) {
    catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
  }
  const topCategories = Object.entries(catTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId || c.name === catId);
      return {
        name: cat?.name ?? catId,
        emoji: cat?.emoji ?? 'Package',
        color: cat?.color ?? '#94a3b8',
        amount,
      };
    });

  return {
    lastWeekTotal,
    prevWeekTotal,
    topCategories,
    weekRange: `${format(lastWeekStart, 'd MMM', { locale: it })} – ${format(lastWeekEnd, 'd MMM yyyy', { locale: it })}`,
  };
}
