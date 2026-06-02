/**
 * useTransactions — aggregator hook (~80 lines).
 *
 * Composes the 6 focused sub-hooks and 2 pure-logic modules into the same
 * public API that all call-sites expect. App.tsx does NOT change.
 *
 * Sub-hooks:
 *   useFilters            → filter state (period / date / range)
 *   useCategoriesSync     → Firestore categories listener + auto-seed
 *   useRecurringEngine    → daily recurring-transaction catch-up
 *   useTransactionsSync   → Firestore transactions listener (last 500)
 *   useCategoryMigrations → one-shot migrations (name→ID, trim legacy)
 *   useTransactionMutations → addTransaction / updateTransaction / …
 *   useCategoryMutations    → addCategory / updateCategory / …
 *
 * Pure logic:
 *   filterByPeriod  (src/lib/stats.ts)
 *   computeStats    (src/lib/stats.ts)
 */
import React, { useMemo } from 'react';
import { parseISO } from 'date-fns';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocsFromServer,
} from 'firebase/firestore';
import { db } from '../services/firebase';

import { useFilters } from './useFilters';
import { useCategoriesSync } from './useCategoriesSync';
import { useTransactionsSync } from './useTransactionsSync';
import { useRecurringEngine } from './useRecurringEngine';
import { useCategoryMigrations } from './useCategoryMigrations';
import { useTransactionMutations } from './useTransactionMutations';
import { useCategoryMutations } from './useCategoryMutations';
import { filterByPeriod, computeStats, sortCategoriesByUsage } from '../lib/stats';

export function useTransactions(userId: string, walletId: string) {
  console.log(
    `[Transactions] hook — uid=${userId} walletId=${walletId} basePath=wallets/${walletId}`,
  );

  // ── Filters ────────────────────────────────────────────────────────────────
  const { filters, setFilters, setPeriod, navigate, goToDate } = useFilters();

  // ── Categories ─────────────────────────────────────────────────────────────
  const { categories, isCategoriesLoading, refreshCategories } =
    useCategoriesSync(userId, walletId);

  // ── Recurring engine ───────────────────────────────────────────────────────
  const { runIfDueToday } = useRecurringEngine(userId, walletId);

  // ── Transactions ───────────────────────────────────────────────────────────
  const { transactions, isTransactionsLoading, hasPendingWrites, lastSyncedAt } = useTransactionsSync(
    userId,
    walletId,
    runIfDueToday,
  );

  // ── One-shot migrations ────────────────────────────────────────────────────
  useCategoryMigrations(userId, walletId, categories, transactions, {
    isTransactionsLoading,
    isCategoriesLoading,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const txMutations = useTransactionMutations(userId, walletId, transactions);
  const catMutations = useCategoryMutations(userId, walletId, categories);

  // ── Derived data ───────────────────────────────────────────────────────────
  const filteredTransactions = useMemo(
    () => filterByPeriod(transactions, filters),
    [transactions, filters],
  );

  const sortedCategories = useMemo(
    () => sortCategoriesByUsage(categories, transactions),
    [categories, transactions],
  );

  const rawStats = useMemo(
    () => computeStats(filteredTransactions, transactions, sortedCategories),
    [filteredTransactions, transactions, sortedCategories],
  );

  const balanceAtPeriodEnd = useMemo(() => {
    const end = filters.range.to;
    return transactions
      .filter(t => parseISO(t.date) <= end)
      .reduce((acc, t) => acc + (t.type === 'INCOME' ? t.amount : -t.amount), 0);
  }, [transactions, filters.range.to]);

  const stats = useMemo(
    () => ({ ...rawStats, balanceAtPeriodEnd }),
    [rawStats, balanceAtPeriodEnd],
  );

  const recentlyAdded = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => {
          const timeA =
            (a.createdAt as any)?.toMillis?.() ||
            (a.createdAt as any)?.seconds * 1000 ||
            0;
          const timeB =
            (b.createdAt as any)?.toMillis?.() ||
            (b.createdAt as any)?.seconds * 1000 ||
            0;
          return timeB - timeA;
        })
        .slice(0, 5),
    [transactions],
  );

  // Forces a fresh Firestore server read — triggers onSnapshot → UI refresh.
  // Used by pull-to-refresh in App.tsx.
  const refreshFromServer = React.useCallback(async () => {
    if (!userId || !walletId) return;
    await Promise.all([
      getDocsFromServer(collection(db, `wallets/${walletId}/categories`)),
      getDocsFromServer(
        query(
          collection(db, `wallets/${walletId}/transactions`),
          orderBy('date', 'desc'),
          limit(500),
        ),
      ),
    ]);
  }, [userId, walletId]);

  // ── Public API (unchanged surface) ────────────────────────────────────────
  return {
    transactions: filteredTransactions,
    allTransactions: transactions,
    categories: sortedCategories,
    loading: false, // data available immediately from Firestore persistent cache
    stats,
    filters,
    setFilters,
    setPeriod,
    navigate,
    goToDate,
    ...txMutations,
    ...catMutations,
    recentlyAdded,
    refreshCategories,
    refreshFromServer,
    hasPendingWrites,
    lastSyncedAt,
  };
}
