import { useState, useCallback } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  addMonths,
  addDays,
} from 'date-fns';
import { FilterState } from '../types';

/**
 * Manages the active filter state (period, date, range).
 * No Firestore dependency — pure UI state.
 */
export function useFilters() {
  const [filters, setFilters] = useState<FilterState>({
    period: 'MONTHLY',
    date: new Date(),
    range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
  });

  const setPeriod = useCallback((period: 'MONTHLY' | 'DAILY') => {
    setFilters(prev => {
      const from =
        period === 'MONTHLY' ? startOfMonth(prev.date) : startOfDay(prev.date);
      const to =
        period === 'MONTHLY' ? endOfMonth(prev.date) : endOfDay(prev.date);
      return { ...prev, period, range: { from, to } };
    });
  }, []);

  const navigate = useCallback((offset: number) => {
    setFilters(prev => {
      const newDate =
        offset === 0
          ? new Date()
          : prev.period === 'MONTHLY'
            ? addMonths(prev.date, offset)
            : addDays(prev.date, offset);
      const from =
        prev.period === 'MONTHLY' ? startOfMonth(newDate) : startOfDay(newDate);
      const to =
        prev.period === 'MONTHLY' ? endOfMonth(newDate) : endOfDay(newDate);
      return { ...prev, date: newDate, range: { from, to } };
    });
  }, []);

  const goToDate = useCallback((date: Date) => {
    setFilters(prev => {
      const from =
        prev.period === 'MONTHLY' ? startOfMonth(date) : startOfDay(date);
      const to =
        prev.period === 'MONTHLY' ? endOfMonth(date) : endOfDay(date);
      return { ...prev, date, range: { from, to } };
    });
  }, []);

  return { filters, setFilters, setPeriod, navigate, goToDate };
}
