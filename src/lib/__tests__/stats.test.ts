import { describe, it, expect } from 'vitest';
import { startOfMonth, endOfMonth } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import { filterByPeriod, computeStats } from '../stats';
import type { Transaction, Category, FilterState } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal fake Timestamp so tests don't depend on Firebase SDK. */
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

function makeFilters(date = new Date()): FilterState {
  return {
    period: 'MONTHLY',
    date,
    range: { from: startOfMonth(date), to: endOfMonth(date) },
  };
}

function makeTx(overrides: Partial<Transaction> & Pick<Transaction, 'amount' | 'type' | 'category'>): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    date: new Date().toISOString(),
    userId: 'u1',
    createdAt: fakeTs(),
    ...overrides,
  };
}

function makeCat(overrides: Partial<Category> & Pick<Category, 'id' | 'name'>): Category {
  return {
    emoji: 'ShoppingCart',
    color: '#E24B4A',
    type: 'EXPENSE',
    monthlyLimit: null,
    tag: null,
    userId: 'u1',
    createdAt: fakeTs(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests for computeStats
// ---------------------------------------------------------------------------

describe('computeStats', () => {
  it('0 transactions → monthlyIncome === 0, categoryBreakdown.length === 0', () => {
    const stats = computeStats([], [], []);
    expect(stats.monthlyIncome).toBe(0);
    expect(stats.monthlyExpense).toBe(0);
    expect(stats.categoryBreakdown.length).toBe(0);
    expect(stats.budgetStatus.length).toBe(0);
    expect(stats.totalBalance).toBe(0);
  });

  it('3 EXPENSE same category → categoryBreakdown[0].amount correct, percentage === 100', () => {
    const cat = makeCat({ id: 'cat1', name: 'Cibo' });
    const txs = [
      makeTx({ amount: 10, type: 'EXPENSE', category: 'cat1' }),
      makeTx({ amount: 20, type: 'EXPENSE', category: 'cat1' }),
      makeTx({ amount: 30, type: 'EXPENSE', category: 'cat1' }),
    ];
    const stats = computeStats(txs, txs, [cat]);
    expect(stats.categoryBreakdown).toHaveLength(1);
    expect(stats.categoryBreakdown[0].amount).toBe(60);
    expect(stats.categoryBreakdown[0].percentage).toBe(100);
    expect(stats.monthlyExpense).toBe(60);
  });

  it('tx with orphaned category ID → color: #cbd5e1, emoji: Wallet', () => {
    const txs = [makeTx({ amount: 50, type: 'EXPENSE', category: 'non-existent-id' })];
    const stats = computeStats(txs, txs, []);
    expect(stats.categoryBreakdown).toHaveLength(1);
    expect(stats.categoryBreakdown[0].color).toBe('#cbd5e1');
    expect(stats.categoryBreakdown[0].emoji).toBe('Wallet');
  });

  it('budgetStatus with monthlyLimit 100, spent 120 → isExceeded === true', () => {
    const cat = makeCat({ id: 'cat1', name: 'Casa', monthlyLimit: 100 });
    const txs = [makeTx({ amount: 120, type: 'EXPENSE', category: 'cat1' })];
    const stats = computeStats(txs, txs, [cat]);
    expect(stats.budgetStatus).toHaveLength(1);
    expect(stats.budgetStatus[0].isExceeded).toBe(true);
    expect(stats.budgetStatus[0].spent).toBe(120);
    expect(stats.budgetStatus[0].percentage).toBeCloseTo(120);
  });
});

// ---------------------------------------------------------------------------
// Tests for filterByPeriod
// ---------------------------------------------------------------------------

describe('filterByPeriod', () => {
  it('MONTHLY filter only returns transactions in the selected month', () => {
    const now = new Date('2026-03-15');
    const filters = makeFilters(now);
    const inside = makeTx({ amount: 10, type: 'EXPENSE', category: 'c1', date: '2026-03-10T00:00:00.000Z' });
    const outside = makeTx({ amount: 10, type: 'EXPENSE', category: 'c1', date: '2026-02-28T23:59:59.999Z' });
    const result = filterByPeriod([inside, outside], filters);
    expect(result).toContain(inside);
    expect(result).not.toContain(outside);
  });
});
