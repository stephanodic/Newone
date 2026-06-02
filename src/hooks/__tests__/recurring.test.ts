/**
 * Tests for the processRecurringTx core logic (no React hooks needed).
 *
 * The mock for firebase/firestore injects a fake writeBatch that records every
 * batch.set() call in an array, making it easy to count generated instances.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Firebase mock — must be hoisted before the import of the module under test
// ---------------------------------------------------------------------------

// Collected set-calls from all batches during a test run
const collectedSets: Array<{ path: string; data: Record<string, unknown> }> = [];

const makeFakeBatch = () => ({
  set: vi.fn((ref: { path: string }, data: Record<string, unknown>) => {
    collectedSets.push({ path: ref.path, data });
  }),
  commit: vi.fn().mockResolvedValue(undefined),
});

vi.mock('firebase/firestore', () => {
  let counter = 0;
  return {
    writeBatch: vi.fn(() => makeFakeBatch()),
    doc: vi.fn((_db: unknown, path: string) => ({
      // Simulate auto-generated doc IDs for new refs (collection + doc)
      id: `gen-${++counter}`,
      path: `${path}/gen-${counter}`,
    })),
    collection: vi.fn((_db: unknown, path: string) => ({ path })),
    serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
  };
});

vi.mock('../../services/firebase', () => ({ db: {} }));

// ---------------------------------------------------------------------------
// Import after mocks are set up
// ---------------------------------------------------------------------------
import { processRecurringTx } from '../useRecurringEngine';
import type { Transaction } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fakeTs(): Timestamp {
  const ms = Date.now();
  return {
    seconds: Math.floor(ms / 1000),
    nanoseconds: 0,
    toMillis: () => ms,
    toDate: () => new Date(ms),
    isEqual: () => false,
    valueOf: () => String(ms),
  } as unknown as Timestamp;
}

function makeTemplate(
  overrides: Partial<Transaction> & Pick<Transaction, 'recurrenceInterval' | 'date'>,
): Transaction {
  return {
    id: 'tmpl-1',
    amount: 100,
    type: 'EXPENSE',
    category: 'cat1',
    userId: 'u1',
    createdAt: fakeTs(),
    isRecurring: true,
    parentId: undefined,
    ...overrides,
  };
}

function fakeBatchFn() {
  return makeFakeBatch() as unknown as ReturnType<typeof import('firebase/firestore').writeBatch>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('processRecurringTx', () => {
  beforeEach(() => {
    collectedSets.length = 0;
  });

  it('MONTHLY template Jan 15 → today Mar 20 generates exactly 2 instances (Feb 15, Mar 15)', async () => {
    const template = makeTemplate({
      recurrenceInterval: 'MONTHLY',
      date: '2026-01-15T00:00:00.000Z',
    });
    const now = new Date('2026-03-20T12:00:00.000Z');

    const count = await processRecurringTx(
      [template],
      'u1',
      'wallet1',
      fakeBatchFn as unknown as typeof import('firebase/firestore').writeBatch,
      now,
    );

    expect(count).toBe(2);
    // Verify the generated dates are Feb 15 and Mar 15
    const dates = collectedSets.map(s => (s.data.date as string).slice(0, 10)).sort();
    expect(dates).toEqual(['2026-02-15', '2026-03-15']);
  });

  it('template with no child instances (only itself) does not crash', async () => {
    const template = makeTemplate({
      id: 'tmpl-solo',
      recurrenceInterval: 'MONTHLY',
      // date is in the future → no instances to generate
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const now = new Date();

    // Should resolve without throwing
    const count = await processRecurringTx(
      [template],
      'u1',
      'wallet1',
      fakeBatchFn as unknown as typeof import('firebase/firestore').writeBatch,
      now,
    );

    expect(count).toBe(0);
  });

  it('DAILY template from 3 years ago → capped at MAX_INSTANCES (365)', async () => {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const template = makeTemplate({
      recurrenceInterval: 'DAILY',
      date: threeYearsAgo.toISOString(),
    });
    const now = new Date();

    const count = await processRecurringTx(
      [template],
      'u1',
      'wallet1',
      fakeBatchFn as unknown as typeof import('firebase/firestore').writeBatch,
      now,
    );

    expect(count).toBe(365);
  });
});
