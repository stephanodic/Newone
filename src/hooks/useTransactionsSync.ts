import { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Transaction } from '../types';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { toast } from 'sonner';

/**
 * Subscribes to the Firestore transactions collection (last 500, ordered by date desc).
 * Retries automatically after 5 s on snapshot errors.
 *
 * @param onTransactionsLoaded - optional stable callback invoked after every
 *   successful snapshot. Use a ref-backed wrapper at the call site to avoid
 *   re-subscribing on every render.
 */
export function useTransactionsSync(
  userId: string,
  walletId: string,
  onTransactionsLoaded?: (allTx: Transaction[]) => void,
) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(true);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => {
    const s = localStorage.getItem('txLastSyncedAt');
    return s ? new Date(s) : null;
  });

  // Keep the latest callback in a ref so the effect never needs to re-run just
  // because the caller re-creates the function reference on each render.
  const callbackRef = useRef(onTransactionsLoaded);
  callbackRef.current = onTransactionsLoaded;

  useEffect(() => {
    if (!userId || !walletId) {
      setTransactions([]);
      setIsTransactionsLoading(false);
      return;
    }

    const path = `wallets/${walletId}/transactions`;
    const q = query(
      collection(db, path),
      orderBy('date', 'desc'),
      limit(500),
    );
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let unsub: (() => void) | null = null;

    let toastShown = false;
    const subscribe = () => {
      try {
        unsub = onSnapshot(
          q,
          { includeMetadataChanges: true },
          snapshot => {
            try {
              // Update pending-writes flag on every event (metadata or data)
              setHasPendingWrites(snapshot.metadata.hasPendingWrites);

              // Mark synced when server confirms all writes
              if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) {
                const now = new Date();
                setLastSyncedAt(now);
                localStorage.setItem('txLastSyncedAt', now.toISOString());
              }

              // 500-limit toast: only once per subscription, on a real server snapshot
              if (snapshot.docs.length === 500 && !toastShown && !snapshot.metadata.hasPendingWrites) {
                toastShown = true;
                toast('⚠️ Mostrate le ultime 500 transazioni', {
                  icon: '📊',
                  duration: 4000,
                });
              }

              const allTx = snapshot.docs.map(
                d => ({ id: d.id, ...d.data() } as Transaction),
              );
              setTransactions(allTx);
              setIsTransactionsLoading(false);
              callbackRef.current?.(allTx);
            } catch (innerErr) {
              console.error('[useTransactionsSync] Processing error:', innerErr);
              setIsTransactionsLoading(false);
            }
          },
          err => {
            console.error('[useTransactionsSync] Snapshot error:', err);
            setIsTransactionsLoading(false);
            handleFirestoreError(err, OperationType.LIST, path);
            retryTimeout = setTimeout(() => subscribe(), 5000);
          },
        );
      } catch (err) {
        console.error('[useTransactionsSync] Subscribe error:', err);
        setIsTransactionsLoading(false);
      }
    };

    subscribe();

    return () => {
      if (unsub) unsub();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [userId, walletId]);
  // NOTE: onTransactionsLoaded is intentionally excluded from deps — the ref
  // keeps it up-to-date without triggering a re-subscription.

  return { transactions, isTransactionsLoading, hasPendingWrites, lastSyncedAt };
}
