import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { exportToCSV } from '../utils/exportCSV';
import { Transaction, Category, ShoppingItem } from '../types';

interface UseTransactionHandlersProps {
  editingTransaction: Transaction | null;
  setEditingTransaction: (t: Transaction | null) => void;
  updateTransaction: (id: string, data: any) => Promise<void>;
  addTransaction: (data: any) => Promise<void>;
  deleteShoppingItem: (id: string) => void;
  allTransactions: Transaction[];
  categories: Category[];
  closeSheet: () => void;
  navigateToTab: (tab: string) => void;
  setActiveTab: (tab: any) => void;
}

export function useTransactionHandlers({
  editingTransaction, setEditingTransaction,
  updateTransaction, addTransaction,
  deleteShoppingItem, allTransactions, categories,
  closeSheet, navigateToTab, setActiveTab,
}: UseTransactionHandlersProps) {
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingShoppingDeletionRef = useRef<string | null>(null);
  const [pendingConversionNote, setPendingConversionNote] = useState('');

  const debouncedUpdateTransaction = useCallback((id: string, data: any, delay = 800) => {
    if (debounceTimers.current[id]) clearTimeout(debounceTimers.current[id]);
    debounceTimers.current[id] = setTimeout(() => {
      updateTransaction(id, data);
      delete debounceTimers.current[id];
    }, delay);
  }, [updateTransaction]);

  const handleTransactionSubmit = useCallback(async (data: any) => {
    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, data);
    } else {
      await addTransaction(data);
    }
    if (pendingShoppingDeletionRef.current) {
      deleteShoppingItem(pendingShoppingDeletionRef.current);
      pendingShoppingDeletionRef.current = null;
      setPendingConversionNote('');
    }
    setEditingTransaction(null);
    navigateToTab('history');
    setActiveTab('history' as any);
    closeSheet();
  }, [editingTransaction, updateTransaction, addTransaction, deleteShoppingItem,
      setEditingTransaction, navigateToTab, setActiveTab, closeSheet]);

  const handleExport = useCallback(() => {
    const count = exportToCSV({ transactions: allTransactions, categories, period: 'all' });
    if (count > 0) toast.success(`${count} transazioni esportate`);
    else           toast.error('Nessuna transazione da esportare');
  }, [allTransactions, categories]);

  // Only sets the pending refs — caller is responsible for opening the sheet
  const handleConvertShoppingToTransaction = useCallback((item: ShoppingItem) => {
    pendingShoppingDeletionRef.current = item.id;
    setPendingConversionNote(item.name);
  }, []);

  return {
    debouncedUpdateTransaction,
    handleTransactionSubmit,
    handleExport,
    handleConvertShoppingToTransaction,
    pendingShoppingDeletionRef,
    pendingConversionNote,
    setPendingConversionNote,
  };
}
