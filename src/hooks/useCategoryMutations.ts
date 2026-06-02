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
import { db } from '../services/firebase';
import { Category } from '../types';
import {
  MAX_CATEGORIES_EXPENSE,
  MAX_CATEGORIES_INCOME,
} from '../utils/constants';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { recordWrite } from '../lib/writeRateLimiter';
import { toast } from 'sonner';

/**
 * Returns the 5 category-mutation functions.
 * Needs `categories` (current list) for the per-type limit check in addCategory.
 */
export function useCategoryMutations(
  userId: string,
  walletId: string,
  categories: Category[],
) {
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

  const addCategory = useCallback(
    async (
      category: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'userId'>,
    ) => {
      if (!userId || !walletId || !checkRate()) return;

      // ── Per-type limit check ──────────────────────────────────────────────
      const limitMax =
        category.type === 'EXPENSE'
          ? MAX_CATEGORIES_EXPENSE
          : MAX_CATEGORIES_INCOME;
      const current = categories.filter(c => c.type === category.type).length;
      if (current >= limitMax) {
        toast.error(
          `Limite raggiunto: massimo ${limitMax} categorie ${
            category.type === 'EXPENSE' ? 'spese' : 'entrate'
          }. Elimina una categoria per aggiungerne un'altra.`,
          { duration: 4000 },
        );
        return;
      }
      // ─────────────────────────────────────────────────────────────────────

      const path = `wallets/${walletId}/categories`;
      const toastId = toast.loading('Creazione categoria...');
      try {
        await addDoc(collection(db, path), {
          ...category,
          userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success(`Categoria "${category.name}" creata`, { id: toastId });
      } catch (err: any) {
        console.error('[useCategoryMutations] addCategory failed:', err);
        toast.error('Errore during la creazione della categoria', {
          id: toastId,
        });
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [userId, walletId, categories, checkRate],
  );

  const updateCategory = useCallback(
    async (id: string, updates: Partial<Category>) => {
      if (!userId || !walletId || !checkRate()) return;
      const path = `wallets/${walletId}/categories/${id}`;
      const toastId = toast.loading('Aggiornamento categoria...');
      try {
        await updateDoc(doc(db, path), {
          ...updates,
          updatedAt: serverTimestamp(),
        });
        toast.success('Categoria aggiornata', { id: toastId });
      } catch (err: any) {
        console.error('[useCategoryMutations] updateCategory failed:', err);
        toast.error("Errore durante l'aggiornamento", { id: toastId });
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [userId, walletId, checkRate],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      if (!userId || !walletId || !checkRate()) return;
      const path = `wallets/${walletId}/categories/${id}`;
      const toastId = toast.loading('Eliminazione categoria...');
      try {
        await deleteDoc(doc(db, path));
        toast.success('Categoria eliminata', { id: toastId });
      } catch (err: any) {
        console.error('[useCategoryMutations] deleteCategory failed:', err);
        toast.error('Impossibile eliminare la categoria', { id: toastId });
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [userId, walletId, checkRate],
  );

  const reorderCategories = useCallback(
    async (reorderedCats: Category[]) => {
      if (!userId || !walletId || reorderedCats.length === 0) return;
      const path = `wallets/${walletId}/categories`;
      const toastId = toast.loading('Salvataggio ordine...');
      try {
        const batch = writeBatch(db);
        reorderedCats.forEach((cat, index) => {
          batch.update(doc(db, `${path}/${cat.id}`), {
            order: index,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
        toast.success('Ordine salvato', { id: toastId });
      } catch (err: any) {
        console.error('[useCategoryMutations] reorderCategories failed:', err);
        toast.error("Errore nel salvataggio dell'ordine", { id: toastId });
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [userId, walletId],
  );

  const addCategoriesBatch = useCallback(
    async (
      cats: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'userId'>[],
    ) => {
      if (!userId || !walletId || cats.length === 0) return;
      const path = `wallets/${walletId}/categories`;
      const toastId = toast.loading(`Importazione di ${cats.length} categorie...`);
      try {
        const batch = writeBatch(db);
        cats.forEach(cat => {
          const ref = doc(collection(db, path));
          batch.set(ref, {
            ...cat,
            userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
        toast.success('Importazione completata', { id: toastId });
      } catch (err: any) {
        console.error('[useCategoryMutations] addCategoriesBatch failed:', err);
        toast.error("Errore durante l'importazione", { id: toastId });
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [userId, walletId],
  );

  return {
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    addCategoriesBatch,
  };
}
