import { useRef, useCallback } from 'react';
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Transaction } from '../types';
import { parseISO, addDays, addWeeks, addMonths, isAfter } from 'date-fns';

// ---------------------------------------------------------------------------
// Core logic (exported for unit-testing without React hooks)
// ---------------------------------------------------------------------------

/**
 * Generates missing recurring-transaction instances between the last known
 * instance date and `now`, writing them to Firestore in batches of 500.
 *
 * @param allTx     - all transactions in the wallet (from the active snapshot)
 * @param userId    - owner UID
 * @param walletId  - wallet document ID
 * @param batchFn   - injectable `writeBatch` (use the real one in prod, a fake in tests)
 * @param now       - reference "today" (injectable so tests can control time)
 * @returns number of instances created
 */
export async function processRecurringTx(
  allTx: Transaction[],
  userId: string,
  walletId: string,
  batchFn: typeof writeBatch,
  now: Date = new Date(),
): Promise<number> {
  if (!userId || !walletId) return 0;

  const recurringTemplates = allTx.filter(t => t.isRecurring && !t.parentId);
  if (recurringTemplates.length === 0) return 0;

  const BATCH_LIMIT = 500;
  let currentBatch = batchFn(db);
  let total = 0;
  let batchCount = 0;

  const commitIfNeeded = async (force = false) => {
    if (batchCount >= BATCH_LIMIT || (force && batchCount > 0)) {
      await currentBatch.commit();
      currentBatch = batchFn(db);
      batchCount = 0;
    }
  };

  for (const template of recurringTemplates) {
    const instances = allTx.filter(
      t => t.parentId === template.id || t.id === template.id,
    );
    // instances always contains at least the template itself (template.id === template.id)
    const latestInstance = [...instances].sort(
      (a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime(),
    )[0];

    const lastDate = parseISO(latestInstance.date);
    if (isNaN(lastDate.getTime())) {
      console.warn('[Recurring] Invalid date for template:', template.id);
      continue;
    }

    const interval = template.recurrenceInterval;
    if (!interval || interval === 'NONE') continue;

    let nextDate = lastDate;
    const MAX_INSTANCES = 365;
    let instancesGenerated = 0;

    while (true) {
      if (instancesGenerated >= MAX_INSTANCES) break;

      if (interval === 'DAILY') nextDate = addDays(nextDate, 1);
      else if (interval === 'WEEKLY') nextDate = addWeeks(nextDate, 1);
      else if (interval === 'MONTHLY') nextDate = addMonths(nextDate, 1);
      else if (interval === 'BIMONTHLY') nextDate = addMonths(nextDate, 2);

      if (isAfter(nextDate, now)) break;

      const ref = doc(collection(db, `wallets/${walletId}/transactions`));
      currentBatch.set(ref, {
        ...template,
        id: ref.id,
        date: nextDate.toISOString(),
        parentId: template.id,
        createdAt: serverTimestamp(),
      });
      total++;
      batchCount++;
      instancesGenerated++;
      await commitIfNeeded();
    }
  }

  await commitIfNeeded(true);
  if (total > 0) console.log(`[Recurring] Generated ${total} recurring transactions`);
  return total;
}

// ---------------------------------------------------------------------------
// React hook wrapper
// ---------------------------------------------------------------------------

/**
 * Provides `runIfDueToday` — a stable callback that fires `processRecurring`
 * at most once per calendar day (guarded by localStorage).
 *
 * The `isProcessingRef` prevents concurrent runs when onSnapshot fires rapidly.
 */
export function useRecurringEngine(userId: string, walletId: string) {
  const isProcessingRef = useRef(false);
  const lastRecurringCheckRef = useRef<string | null>(
    localStorage.getItem('moneytrack_lastRecurringCheck'),
  );

  const runIfDueToday = useCallback(
    (allTx: Transaction[]) => {
      const today = new Date().toISOString().slice(0, 10);
      if (lastRecurringCheckRef.current === today) return;
      if (isProcessingRef.current) return;

      lastRecurringCheckRef.current = today;
      localStorage.setItem('moneytrack_lastRecurringCheck', today);
      isProcessingRef.current = true;

      processRecurringTx(allTx, userId, walletId, writeBatch)
        .catch(err => console.error('[useRecurringEngine]', err))
        .finally(() => {
          isProcessingRef.current = false;
        });
    },
    [userId, walletId],
  );

  return { runIfDueToday };
}
