import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  getDocs,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Category } from '../types';
import {
  DEFAULT_CATEGORIES_EXPENSE,
  DEFAULT_CATEGORIES_INCOME,
} from '../utils/constants';
import { handleFirestoreError, OperationType } from '../lib/utils';

// ---------------------------------------------------------------------------
// Shared sort helper (also used by refreshCategories)
// ---------------------------------------------------------------------------
function sortCategories(cats: Category[]): Category[] {
  return [...cats].sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    const timeA =
      (a.createdAt as any)?.toMillis?.() ||
      (a.createdAt as any)?.seconds * 1000 ||
      0;
    const timeB =
      (b.createdAt as any)?.toMillis?.() ||
      (b.createdAt as any)?.seconds * 1000 ||
      0;
    if (timeA === 0 && timeB !== 0) return 1;
    if (timeB === 0 && timeA !== 0) return -1;
    return timeB - timeA;
  });
}

/**
 * Subscribes to the Firestore categories collection, sorts client-side, and
 * auto-seeds with default categories when the collection is empty.
 *
 * `isSeedingRef` is intentionally LOCAL to this hook — it must not be shared
 * across hook instances.
 */
export function useCategoriesSync(userId: string, walletId: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const isSeedingRef = useRef(false);

  const refreshCategories = useCallback(async () => {
    if (!userId || !walletId) return;
    try {
      const snap = await getDocs(
        collection(db, `wallets/${walletId}/categories`),
      );
      const cats = sortCategories(
        snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)),
      );
      setCategories(cats);
    } catch (err) {
      console.error('[refreshCategories]', err);
    }
  }, [userId, walletId]);

  useEffect(() => {
    if (!userId || !walletId) {
      setCategories([]);
      setIsCategoriesLoading(false);
      return;
    }

    const path = `wallets/${walletId}/categories`;

    const unsubscribe = onSnapshot(
      collection(db, path),
      { includeMetadataChanges: false },
      snapshot => {
        // NON saltare i dati dalla cache: se li scartiamo e le categorie non
        // cambiano sul server, Firestore non spara un secondo evento e la UI
        // resta bloccata in stato di caricamento a tempo indeterminato.
        const cats = sortCategories(
          snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Category)),
        );
        setCategories(cats);
        setIsCategoriesLoading(false);

        if (cats.length === 0) {
          const seed = async () => {
            // Guard: prevent concurrent seed calls (snapshot can fire multiple times)
            if (isSeedingRef.current) return;
            isSeedingRef.current = true;
            try {
              const walletDocRef = doc(db, `wallets/${walletId}`);
              // NON fidarsi del flag categoriesSeeded: verificare con lettura live
              const liveSnap = await getDocs(collection(db, path));
              if (!liveSnap.empty) {
                await setDoc(
                  walletDocRef,
                  { categoriesSeeded: true },
                  { merge: true },
                );
                return;
              }
              // Davvero vuote → seed incondizionale
              const batch = writeBatch(db);
              [
                ...DEFAULT_CATEGORIES_EXPENSE,
                ...DEFAULT_CATEGORIES_INCOME,
              ].forEach((cat, index) => {
                const ref = doc(collection(db, path));
                batch.set(ref, {
                  ...cat,
                  order: index,
                  userId,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
              });
              await batch.commit();
              await setDoc(
                walletDocRef,
                { categoriesSeeded: true },
                { merge: true },
              );
            } catch (err) {
              console.error('[useCategoriesSync] Seeding failed:', err);
            } finally {
              isSeedingRef.current = false;
            }
          };
          seed();
        }
      },
      err => {
        console.error('[useCategoriesSync] Categories error:', err);
        setIsCategoriesLoading(false);
        handleFirestoreError(err, OperationType.LIST, path);
      },
    );

    return unsubscribe;
  }, [userId, walletId]);

  return { categories, isCategoriesLoading, refreshCategories };
}
