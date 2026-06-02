import { useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { parseISO, isBefore } from 'date-fns';
import { db } from '../services/firebase';
import { Transaction } from '../types';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { recordWrite } from '../lib/writeRateLimiter';
import { toast } from 'sonner';

/**
 * Returns the 5 transaction-mutation functions.
 * Needs `transactions` (all) for deleteRecurringTransaction family lookups.
 */
export function useTransactionMutations(
  userId: string,
  walletId: string,
  transactions: Transaction[],
) {
  // Internal rate-limit check — not exposed to callers
  const checkRate = useCallback((): boolean => {
    const status = recordWrite();
    if (status === 'blocked') {
      toast.error(
        'Troppe operazioni in poco tempo. Riprova tra qualche secondo.',
        { duration: 4000 },
      );
      return false;
    }
    if (status === 'warn') {
      toast.warning('Stai effettuando molte operazioni di seguito.', {
        duration: 3000,
      });
    }
    return true;
  }, []);

  const addTransaction = useCallback(
    async (data: Omit<Transaction, 'id' | 'userId' | 'createdAt'>) => {
      if (!userId || !walletId || !checkRate()) return;
      const path = `wallets/${walletId}/transactions`;
      try {
        await addDoc(collection(db, path), {
          ...data,
          userId,
          createdAt: serverTimestamp(),
        });
      } catch (err: any) {
        console.error('[useTransactionMutations] addTransaction failed:', err);
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [userId, walletId, checkRate],
  );

  const updateTransaction = useCallback(
    async (id: string, updates: Partial<Transaction>) => {
      if (!userId || !walletId || !checkRate()) return;
      const path = `wallets/${walletId}/transactions/${id}`;
      const toastId = toast.loading('Aggiornamento in corso...');
      try {
        await updateDoc(doc(db, path), { ...updates });
        toast.success('Operazione aggiornata', { id: toastId });
      } catch (err: any) {
        console.error('[useTransactionMutations] updateTransaction failed:', err);
        toast.error("Errore durante l'aggiornamento", { id: toastId });
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [userId, walletId, checkRate],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!userId || !walletId || !checkRate()) return;
      const path = `wallets/${walletId}/transactions/${id}`;
      const toastId = toast.loading('Eliminazione in corso...');
      try {
        await deleteDoc(doc(db, path));
        toast.success('Operazione eliminata', { id: toastId });
      } catch (err: any) {
        console.error('[useTransactionMutations] deleteTransaction failed:', err);
        toast.error("Impossibile eliminare l'operazione", { id: toastId });
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [userId, walletId, checkRate],
  );

  const deleteMultipleTransactions = useCallback(
    async (ids: string[]) => {
      if (!userId || !walletId || ids.length === 0 || !checkRate()) return;
      const path = `wallets/${walletId}/transactions`;
      const toastId = toast.loading(`Eliminazione di ${ids.length} operazioni...`);
      try {
        const BATCH_SIZE = 500;
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          const chunk = ids.slice(i, i + BATCH_SIZE);
          const batch = writeBatch(db);
          chunk.forEach(id => batch.delete(doc(db, `${path}/${id}`)));
          await batch.commit();
        }
        toast.success(`${ids.length} operazioni eliminate`, { id: toastId });
      } catch (err: any) {
        console.error('[useTransactionMutations] deleteMultiple failed:', err);
        toast.error("Errore durante l'eliminazione multipla", { id: toastId });
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [userId, walletId, checkRate],
  );

  const deleteRecurringTransaction = useCallback(
    async (
      transaction: Transaction,
      mode: 'single' | 'future' | 'all',
    ) => {
      if (!userId || !walletId) return;

      if (mode === 'single') {
        await deleteDoc(
          doc(db, `wallets/${walletId}/transactions/${transaction.id}`),
        );
        return;
      }

      const templateId = transaction.parentId || transaction.id;
      const transactionDate = parseISO(transaction.date);

      if (mode === 'all') {
        const toDelete = transactions.filter(
          t => t.id === templateId || t.parentId === templateId,
        );
        const BATCH_SIZE = 500;
        for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
          const chunk = toDelete.slice(i, i + BATCH_SIZE);
          const batch = writeBatch(db);
          chunk.forEach(t =>
            batch.delete(doc(db, `wallets/${walletId}/transactions/${t.id}`)),
          );
          await batch.commit();
        }
        return;
      }

      if (mode === 'future') {
        const toDelete = transactions.filter(t => {
          const sameFamily = t.id === templateId || t.parentId === templateId;
          const isCurrentOrFuture = !isBefore(parseISO(t.date), transactionDate);
          return sameFamily && isCurrentOrFuture;
        });
        const BATCH_SIZE = 500;
        for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
          const chunk = toDelete.slice(i, i + BATCH_SIZE);
          const batch = writeBatch(db);
          chunk.forEach(t =>
            batch.delete(doc(db, `wallets/${walletId}/transactions/${t.id}`)),
          );
          await batch.commit();
        }
      }
    },
    [userId, walletId, transactions],
  );

  return {
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteMultipleTransactions,
    deleteRecurringTransaction,
  };
}
