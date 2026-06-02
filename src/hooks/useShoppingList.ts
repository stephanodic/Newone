import { useState, useEffect, useCallback } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy, writeBatch,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { ShoppingItem } from '../types';

export function useShoppingList(walletId: string | null, userId: string) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletId) { setLoading(false); return; }

    const q = query(
      collection(db, `wallets/${walletId}/shoppingList`),
      orderBy('createdAt', 'asc'),
    );

    const unsub = onSnapshot(
      q,
      snap => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as ShoppingItem)));
        setLoading(false);
      },
      err => {
        console.error('[ShoppingList] snapshot error:', err);
        setLoading(false);
      },
    );

    return unsub;
  }, [walletId]);

  const addItem = useCallback(async (name: string, quantity?: string, icon?: string) => {
    if (!walletId || !name.trim()) return;
    try {
      await addDoc(collection(db, `wallets/${walletId}/shoppingList`), {
        name: name.trim(),
        quantity: quantity?.trim() || null,
        icon: icon ?? null,
        bought: false,
        addedBy: userId,
        createdAt: serverTimestamp(),
      });
    } catch {
      // silent fail
    }
  }, [walletId, userId]);

  const toggleItem = useCallback(async (id: string, bought: boolean) => {
    if (!walletId) return;
    try {
      await updateDoc(doc(db, `wallets/${walletId}/shoppingList/${id}`), { bought });
    } catch {
      // silent fail
    }
  }, [walletId]);

  const deleteItem = useCallback(async (id: string) => {
    if (!walletId) return;
    try {
      await deleteDoc(doc(db, `wallets/${walletId}/shoppingList/${id}`));
    } catch {
      // silent fail
    }
  }, [walletId]);

  const clearBought = useCallback(async () => {
    if (!walletId) return;
    const boughtItems = items.filter(i => i.bought);
    if (!boughtItems.length) return;
    try {
      const batch = writeBatch(db);
      boughtItems.forEach(i =>
        batch.delete(doc(db, `wallets/${walletId}/shoppingList/${i.id}`)),
      );
      await batch.commit();
    } catch {
      // silent fail
    }
  }, [walletId, items]);

  const updateItem = useCallback(async (id: string, updates: Partial<ShoppingItem>) => {
    if (!walletId) return;
    try {
      await updateDoc(doc(db, `wallets/${walletId}/shoppingList/${id}`), updates as Record<string, unknown>);
    } catch {
      // silent fail
    }
  }, [walletId]);

  const assignItem = useCallback(async (id: string, assignedTo: string | null) => {
    if (!walletId) return;
    try {
      await updateDoc(doc(db, `wallets/${walletId}/shoppingList/${id}`), { assignedTo });
    } catch {
      // silent fail
    }
  }, [walletId]);

  return { items, loading, addItem, updateItem, toggleItem, deleteItem, clearBought, assignItem };
}
