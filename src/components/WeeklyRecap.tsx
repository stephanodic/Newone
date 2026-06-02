import React, { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingDown, TrendingUp, BarChart2 } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import { formatCurrency, cn } from '../lib/utils';
import { haptic } from '../lib/haptic';

interface WeeklyRecapProps {
  show: boolean;
  lastWeekTotal: number;
  prevWeekTotal: number;
  weekRange: string;
  topCategories: { name: string; emoji: string; color: string; amount: number }[];
  onClose: () => void;
  onViewCharts: () => void;
}

const WeeklyRecap = memo(({
  show, lastWeekTotal, prevWeekTotal, weekRange,
  topCategories, onClose, onViewCharts,
}: WeeklyRecapProps) => {
  const hasPrev = prevWeekTotal > 0;
  const diffPct = hasPrev ? ((lastWeekTotal - prevWeekTotal) / prevWeekTotal) * 100 : 0;
  const improved = lastWeekTotal < prevWeekTotal;

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[2px]"
            onClick={() => { haptic.light?.(); onClose(); }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-[10000] bg-white dark:bg-slate-800 rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl"
          >
            {/* Handle + header */}
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-600 rounded-full mx-auto mb-5" />
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-0.5">
                  Riepilogo settimana scorsa
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">{weekRange}</p>
              </div>
              <button
                onClick={() => { haptic.light?.(); onClose(); }}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center active:scale-90 transition-all"
              >
                <X size={15} className="text-slate-400" />
              </button>
            </div>

            {/* Totale + confronto */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 mb-4">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Spese totali</p>
              <p className="text-[32px] font-black text-slate-800 dark:text-slate-100 leading-none mb-2">
                {formatCurrency(lastWeekTotal)}
              </p>
              {hasPrev && (
                <div className={cn(
                  "flex items-center gap-1.5 text-[11px] font-bold",
                  improved ? "text-emerald-500" : "text-rose-500"
                )}>
                  {improved
                    ? <TrendingDown size={14} strokeWidth={2.5} />
                    : <TrendingUp size={14} strokeWidth={2.5} />
                  }
                  <span>
                    {improved ? '▼' : '▲'} {Math.abs(diffPct).toFixed(0)}% rispetto alla settimana prima
                    <span className="font-normal text-slate-400 dark:text-slate-500 ml-1">
                      ({formatCurrency(prevWeekTotal)})
                    </span>
                  </span>
                </div>
              )}
              {!hasPrev && (
                <p className="text-[11px] text-slate-300 dark:text-slate-600">Prima settimana registrata</p>
              )}
            </div>

            {/* Top 3 categorie */}
            {topCategories.length > 0 && (
              <div className="mb-5">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-3">
                  Top categorie
                </p>
                <div className="flex flex-col gap-2.5">
                  {topCategories.map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 w-3">{i + 1}</span>
                      <CategoryIcon name={cat.emoji} size={20} color={cat.color} />
                      <span className="flex-1 text-[12px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {cat.name}
                      </span>
                      <span className="text-[12px] font-black text-rose-500">
                        -{formatCurrency(cat.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lastWeekTotal === 0 && (
              <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-4 mb-3">
                Nessuna spesa la settimana scorsa 🎉
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { haptic.light?.(); onClose(); }}
                className="flex-1 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all"
              >
                Chiudi
              </button>
              <button
                onClick={() => { haptic.medium?.(); onViewCharts(); }}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-br from-[#1D9E75] to-[#11cc98] text-white font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <BarChart2 size={14} strokeWidth={2.5} />
                Vedi grafici
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

WeeklyRecap.displayName = 'WeeklyRecap';
export default WeeklyRecap;
