import React, { createContext, useContext } from 'react';
import { Transaction, Category, StatsResult, FilterState, CreateTransactionInput, UpdateTransactionInput, CategoryFormData } from '../types';

interface TransactionsContextValue {
  transactions: Transaction[];
  allTransactions: Transaction[];
  categories: Category[];
  stats: StatsResult;
  filters: FilterState;
  addTransaction: (data: CreateTransactionInput) => Promise<void>;
  updateTransaction: (id: string, data: UpdateTransactionInput) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteMultipleTransactions: (ids: string[]) => Promise<void>;
  addCategory: (data: CategoryFormData) => Promise<void>;
  updateCategory: (id: string, data: Partial<CategoryFormData>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  navigate: (diff: number) => void;
  goToDate: (date: Date) => void;
  setPeriod: (period: 'MONTHLY' | 'DAILY') => void;
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null);

export function useTransactionsContext() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactionsContext must be used within TransactionsProvider');
  return ctx;
}

export const TransactionsProvider: React.FC<{
  children: React.ReactNode;
  value: TransactionsContextValue;
}> = ({ children, value }) => (
  <TransactionsContext.Provider value={value}>
    {children}
  </TransactionsContext.Provider>
);
