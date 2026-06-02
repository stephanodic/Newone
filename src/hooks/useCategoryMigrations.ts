import { useEffect, useRef } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Transaction, Category } from '../types';
import {
  MAX_CATEGORIES_EXPENSE,
  MAX_CATEGORIES_INCOME,
  DEFAULT_CATEGORIES_EXPENSE,
  DEFAULT_CATEGORIES_INCOME,
} from '../utils/constants';

interface LoadingFlags {
  isTransactionsLoading: boolean;
  isCategoriesLoading: boolean;
}

/**
 * Runs two one-shot migrations per wallet session:
 *
 * 1. Migration v1 — converts `transaction.category` from legacy name to category ID.
 * 2. Trim v1 — removes legacy categories that exceed the new per-type limits.
 *
 * Both `hasMigratedRef` and `hasTrimmedRef` are intentionally LOCAL to this hook.
 * They must NOT be shared across hook instances or sessions.
 *
 * This hook exposes no return value — it is pure side-effect.
 */
export function useCategoryMigrations(
  userId: string,
  walletId: string,
  categories: Category[],
  transactions: Transaction[],
  { isTransactionsLoading, isCategoriesLoading }: LoadingFlags,
) {
  const hasMigratedRef = useRef(false);
  const hasTrimmedRef = useRef(false);
  const hasResetV2Ref = useRef(false);

  // --- Migration v1: category name → category ID ---
  useEffect(() => {
    if (hasMigratedRef.current) return;
    if (!userId || !walletId || isTransactionsLoading || isCategoriesLoading) return;
    if (categories.length === 0) return;

    hasMigratedRef.current = true;

    const migrate = async () => {
      const walletDocRef = doc(db, `wallets/${walletId}`);
      const walletDoc = await getDoc(walletDocRef);
      if (walletDoc.exists() && walletDoc.data()?.categoryMigrationV1) return;

      const categoryIds = new Set(categories.map(c => c.id));
      const toMigrate = transactions.filter(t => !categoryIds.has(t.category));

      if (toMigrate.length === 0) {
        await setDoc(walletDocRef, { categoryMigrationV1: true }, { merge: true });
        return;
      }

      let count = 0;
      const BATCH_SIZE = 500;
      for (let i = 0; i < toMigrate.length; i += BATCH_SIZE) {
        const chunk = toMigrate.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        for (const tx of chunk) {
          // When there are name duplicates, always pick the OLDEST category
          // (ascending createdAt) so migration and cleanup stay in sync.
          const sameName = categories.filter(
            c =>
              c.name.trim().toLowerCase() === tx.category.trim().toLowerCase(),
          );
          if (sameName.length === 0) {
            // Broken reference (deleted category) — skip and let cleanup repair it.
            console.warn(
              `[Migration] Ref rotta ignorata: tx=${tx.id} category="${tx.category}"`,
            );
            continue;
          }
          const cat = sameName.reduce((oldest, c) => {
            const tO =
              (oldest.createdAt as any)?.toMillis?.() ??
              ((oldest.createdAt as any)?.seconds ?? 0) * 1000;
            const tC =
              (c.createdAt as any)?.toMillis?.() ??
              ((c.createdAt as any)?.seconds ?? 0) * 1000;
            return tC < tO ? c : oldest;
          });
          batch.update(
            doc(db, `wallets/${walletId}/transactions/${tx.id}`),
            { category: cat.id },
          );
          count++;
        }
        await batch.commit();
      }

      await setDoc(walletDocRef, { categoryMigrationV1: true }, { merge: true });
      if (count > 0)
        console.log(
          `[Migration] Convertite ${count} transazioni al category ID (oldest-first)`,
        );
    };

    migrate().catch(err =>
      console.error('[Migration] Errore migrazione categorie:', err),
    );
  }, [
    userId,
    walletId,
    isTransactionsLoading,
    isCategoriesLoading,
    categories,
    transactions,
  ]);

  // --- Trim v1: remove categories that exceed the new per-type limits ---
  useEffect(() => {
    if (hasTrimmedRef.current) return;
    if (!userId || !walletId || isCategoriesLoading) return;
    if (categories.length === 0) return;

    const expenseCats = categories.filter(c => c.type === 'EXPENSE');
    const incomeCats = categories.filter(c => c.type === 'INCOME');
    if (
      expenseCats.length <= MAX_CATEGORIES_EXPENSE &&
      incomeCats.length <= MAX_CATEGORIES_INCOME
    ) {
      hasTrimmedRef.current = true;
      return;
    }

    hasTrimmedRef.current = true;

    const trim = async () => {
      const walletDocRef = doc(db, `wallets/${walletId}`);
      const walletDoc = await getDoc(walletDocRef);
      if (walletDoc.exists() && walletDoc.data()?.categoryTrimV1) return;

      const REMOVED_EXPENSE = ['auto', 'viaggi', 'salute', 'regali', 'bambini'];
      const REMOVED_INCOME = ['altro'];

      const toDelete: string[] = [];

      if (expenseCats.length > MAX_CATEGORIES_EXPENSE) {
        expenseCats
          .filter(c => REMOVED_EXPENSE.includes(c.name.trim().toLowerCase()))
          .forEach(c => toDelete.push(c.id));
      }
      if (incomeCats.length > MAX_CATEGORIES_INCOME) {
        incomeCats
          .filter(c => REMOVED_INCOME.includes(c.name.trim().toLowerCase()))
          .forEach(c => toDelete.push(c.id));
      }

      if (toDelete.length > 0) {
        const batch = writeBatch(db);
        toDelete.forEach(id =>
          batch.delete(doc(db, `wallets/${walletId}/categories/${id}`)),
        );
        await batch.commit();
        console.log(
          `[Trim] Rimosse ${toDelete.length} categorie legacy oltre il limite`,
        );
      }

      await setDoc(walletDocRef, { categoryTrimV1: true }, { merge: true });
    };

    trim().catch(err =>
      console.error('[Trim] Errore pulizia categorie extra:', err),
    );
  }, [userId, walletId, isCategoriesLoading, categories]);

  // --- Migration v2: reset all categories to new defaults ---
  useEffect(() => {
    if (hasResetV2Ref.current) return;
    if (!userId || !walletId || isCategoriesLoading) return;
    if (categories.length === 0) return;

    hasResetV2Ref.current = true;

    const reset = async () => {
      const walletDocRef = doc(db, `wallets/${walletId}`);
      const walletDoc = await getDoc(walletDocRef);
      if (walletDoc.exists() && walletDoc.data()?.categoryResetV2) return;

      const catPath = `wallets/${walletId}/categories`;
      const txPath  = `wallets/${walletId}/transactions`;
      const norm    = (s: string) => s.trim().toLowerCase();

      // Old name → new name for categories that were renamed
      const RENAMES: Record<string, string> = {
        'mangiar fuori/bar': 'mangiar fuori',
      };
      // Old orphan name → new category name (for remapping transactions)
      const ORPHAN_REMAP: Record<string, string> = {
        'freelance': 'part-time',
        'regalo':    'premi',
        'vendite':   'altri',
      };

      const allNewDefaults = [
        ...DEFAULT_CATEGORIES_EXPENSE,
        ...DEFAULT_CATEGORIES_INCOME,
      ];

      const existingByNorm = new Map(categories.map(c => [norm(c.name), c]));

      // Pre-generate IDs and build newIdMap: norm(new name) → docId
      const newIdMap = new Map<string, string>();
      const catBatch = writeBatch(db);

      allNewDefaults.forEach((newCat, index) => {
        const normNew = norm(newCat.name);
        // Try direct name match, then rename match
        const oldNormKey = Object.entries(RENAMES).find(([, v]) => v === normNew)?.[0];
        const existing   = existingByNorm.get(normNew) ?? (oldNormKey ? existingByNorm.get(oldNormKey) : undefined);

        if (existing) {
          newIdMap.set(normNew, existing.id);
          catBatch.update(doc(db, `${catPath}/${existing.id}`), {
            name:      newCat.name,
            emoji:     newCat.emoji,
            color:     newCat.color,
            order:     index,
            updatedAt: serverTimestamp(),
          });
        } else {
          const ref = doc(collection(db, catPath));
          newIdMap.set(normNew, ref.id);
          catBatch.set(ref, {
            ...newCat,
            order:     index,
            userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      });

      // Determine orphans (old categories not matched to any new default)
      const matchedOldIds = new Set<string>();
      allNewDefaults.forEach(newCat => {
        const normNew   = norm(newCat.name);
        const direct    = existingByNorm.get(normNew);
        if (direct) matchedOldIds.add(direct.id);
        const oldNormKey = Object.entries(RENAMES).find(([, v]) => v === normNew)?.[0];
        if (oldNormKey) {
          const renamed = existingByNorm.get(oldNormKey);
          if (renamed) matchedOldIds.add(renamed.id);
        }
      });

      const orphans = categories.filter(c => !matchedOldIds.has(c.id));

      // Build orphan → target ID map and remap transactions
      if (orphans.length > 0) {
        const txSnap = await getDocs(collection(db, txPath));
        const orphanToTarget = new Map<string, string>();

        for (const orphan of orphans) {
          const remapNorm = ORPHAN_REMAP[norm(orphan.name)];
          const fallback  = allNewDefaults.find(c => c.type === orphan.type);
          const targetId  =
            (remapNorm ? newIdMap.get(remapNorm) : undefined) ??
            (fallback  ? newIdMap.get(norm(fallback.name)) : undefined);
          if (targetId) orphanToTarget.set(orphan.id, targetId);
          catBatch.delete(doc(db, `${catPath}/${orphan.id}`));
        }

        const toRemap = txSnap.docs.filter(d => orphanToTarget.has(d.data().category));
        const CHUNK = 490;
        for (let i = 0; i < toRemap.length; i += CHUNK) {
          const txBatch = writeBatch(db);
          toRemap.slice(i, i + CHUNK).forEach(d => {
            txBatch.update(doc(db, `${txPath}/${d.id}`), {
              category: orphanToTarget.get(d.data().category)!,
            });
          });
          await txBatch.commit();
        }
      }

      await catBatch.commit();
      await setDoc(walletDocRef, { categoryResetV2: true }, { merge: true });
      console.log(`[Migration v2] Categorie aggiornate — ${allNewDefaults.length} default applicati`);
    };

    reset().catch(err => console.error('[Migration v2] Errore:', err));
  }, [userId, walletId, isCategoriesLoading, categories]);
}
