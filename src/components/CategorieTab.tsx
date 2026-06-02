import { CategoryIcon } from "./CategoryIcon";
import React, { memo, useMemo } from 'react';
import { User } from 'firebase/auth';
import { haptic } from '@/lib/haptic';
import { Category, Transaction, TransactionType } from '../types';
import { useTransactionsContext } from '../context/TransactionsContext';
import { MAX_CATEGORIES_EXPENSE, MAX_CATEGORIES_INCOME } from '../utils/constants';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, Target, AlertTriangle } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { headerGradient } from '../lib/theme';

function sortCategoriesByUsage(categories: Category[], transactions: Transaction[]): Category[] {
  const now = Date.now();
  const MS_90 = 90 * 24 * 60 * 60 * 1000;
  const score: Record<string, number> = {};
  for (const t of transactions) {
    const age = now - new Date(t.date).getTime();
    if (age > MS_90) continue;
    score[t.category] = (score[t.category] ?? 0) + (1 - age / MS_90);
  }
  return [...categories].sort((a, b) => {
    const diff = (score[b.id] ?? 0) - (score[a.id] ?? 0);
    return diff !== 0 ? diff : (a.order ?? 999) - (b.order ?? 999);
  });
}

interface CategorieTabProps {
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  user?: User | null;
  onProfileClick?: () => void;
  isLoading?: boolean;
}

const CategorieTab = memo(({ onAdd, onEdit, onDelete, user, onProfileClick, isLoading = false }: CategorieTabProps) => {
  const { categories, allTransactions: transactions, stats } = useTransactionsContext();
  const expenseCategories = useMemo(() =>
    sortCategoriesByUsage(categories.filter(c => c.type === 'EXPENSE'), transactions),
    [categories, transactions]
  );
  const incomeCategories = useMemo(() =>
    sortCategoriesByUsage(categories.filter(c => c.type === 'INCOME'), transactions),
    [categories, transactions]
  );
  const expenseFull = expenseCategories.length >= MAX_CATEGORIES_EXPENSE;
  const incomeFull  = incomeCategories.length  >= MAX_CATEGORIES_INCOME;
  const allFull     = expenseFull && incomeFull;

  return (
    <div className="h-full flex flex-col bg-[#F5F5F0] dark:bg-slate-900 overflow-hidden font-sans transition-colors duration-500">

      {/* ── HEADER ── */}
      <div className="px-4 pb-4 shrink-0" style={{ ...headerGradient, paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
        {/* Logo centrato + avatar dx */}
        <div className="flex items-center justify-center relative mb-3">
          <img src="/logo.png" alt="MoneyTrack" className="absolute left-0 h-11 w-11 rounded-xl object-cover flex-shrink-0" />
          <div className="flex flex-col items-center">
            <span className="text-[26px] font-black text-white tracking-tight" style={{fontFamily:"system-ui",letterSpacing:"-0.5px"}}>MoneyTrack</span>
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest text-center">Categorie</p>
          </div>
          {onProfileClick && (
            <button
              onClick={() => { haptic.light?.(); onProfileClick?.(); }}
              className="absolute right-0 w-10 h-10 rounded-full border-2 border-white/50 overflow-hidden active:scale-90 transition-all"
            >
              {user?.photoURL
                ? <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-black">{user?.displayName?.[0] || 'U'}</div>
              }
            </button>
          )}
        </div>
        {/* Bottone aggiungi — pill compatto */}
        <div className="flex justify-center">
          <button
            onClick={allFull ? undefined : () => { haptic.light?.(); onAdd(); }}
            disabled={allFull}
            className={cn(
              "flex items-center gap-2 rounded-full px-5 py-2 transition-all shadow-sm active:scale-95",
              allFull
                ? "bg-white/10 text-white/30 cursor-not-allowed"
                : "bg-white/25 text-white border border-white/30"
            )}
          >
            <Plus size={13} strokeWidth={3.5} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {allFull ? "Limite raggiunto" : "Nuova categoria"}
            </span>
          </button>
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">

        {/* ── BUDGET OVERVIEW — solo se ci sono categorie con limite ── */}
        {stats.budgetStatus.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-[1.5px] rounded-full bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
              <Target size={10} strokeWidth={2.5} className="text-amber-500 shrink-0" />
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.15em]">Budget mensile</span>
              <Target size={10} strokeWidth={2.5} className="text-amber-500 shrink-0" />
              <div className="flex-1 h-[1.5px] rounded-full bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
            </div>
            <div className="space-y-1.5">
              {stats.budgetStatus.map(b => {
                const pct = Math.min(b.percentage, 100);
                const isOver = b.isExceeded;
                const isWarn = !isOver && b.percentage >= 80;
                const cat = categories.find(c => c.id === b.id);
                return (
                  <button
                    key={b.id}
                    onClick={() => { haptic.light?.(); if (cat) onEdit(cat.id); }}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 border text-left transition-all active:scale-[0.98]",
                      isOver
                        ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20"
                        : isWarn
                          ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
                          : "bg-white dark:bg-slate-800 border-white dark:border-white/5"
                    )}
                  >
                    <CategoryIcon name={b.emoji} size={20} color={b.color} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 truncate">{b.name}</span>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {isOver && <AlertTriangle size={9} className="text-rose-500" />}
                          <span className={cn("text-[10px] font-bold",
                            isOver ? "text-rose-500" : isWarn ? "text-amber-500" : "text-slate-400 dark:text-slate-500"
                          )}>
                            {formatCurrency(b.spent)} / {formatCurrency(b.limit)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-[3px] bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-700 ease-out",
                            isOver ? "bg-rose-500" : isWarn ? "bg-amber-400" : "bg-emerald-500"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CATEGORY GRIDS ── */}
        {(['EXPENSE', 'INCOME'] as TransactionType[]).map((type) => {
          const typeCats = type === 'EXPENSE' ? expenseCategories : incomeCategories;
          const maxForType = type === 'EXPENSE' ? MAX_CATEGORIES_EXPENSE : MAX_CATEGORIES_INCOME;
          const isFull = typeCats.length >= maxForType;
          return (
            <div key={type} className={cn("last:mb-0", type === 'INCOME' && "mt-3")}>
              {/* Separatore stile Dashboard */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-[1.5px] rounded-full"
                  style={{ background: `linear-gradient(to right, transparent, ${type === 'EXPENSE' ? '#E24B4A' : '#1D9E75'}66, transparent)` }} />
                <span className="text-[10px] font-black uppercase tracking-[0.15em]"
                  style={{ color: type === 'EXPENSE' ? '#E24B4A' : '#1D9E75' }}>
                  {type === 'EXPENSE' ? 'Uscite' : 'Entrate'}
                </span>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-full",
                  isFull ? "bg-rose-100 dark:bg-rose-500/20 text-rose-500" : "text-slate-300 dark:text-slate-600"
                )}>
                  {typeCats.length}/{maxForType}
                </span>
                <div className="flex-1 h-[1.5px] rounded-full"
                  style={{ background: `linear-gradient(to right, transparent, ${type === 'EXPENSE' ? '#E24B4A' : '#1D9E75'}66, transparent)` }} />
              </div>

              <div className="grid grid-cols-5 gap-x-1 gap-y-2">
                {/* T3-A: skeleton al primo caricamento */}
                {isLoading && typeCats.length === 0 && (
                  [...Array(type === 'EXPENSE' ? 10 : 5)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                      <div className="h-2 w-7 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                    </div>
                  ))
                )}
                <AnimatePresence mode="popLayout" initial={false}>
                  {typeCats.map((cat) => {
                    const spent = stats.categoryBreakdown.find(s => s.category === cat.name)?.amount ?? 0;
                    const hasLimit = type === 'EXPENSE' && !!cat.monthlyLimit && cat.monthlyLimit > 0;
                    const ratio = hasLimit ? spent / (cat.monthlyLimit as number) : 0;
                    return (
                      <motion.div
                        key={cat.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                        whileTap={{ scale: 0.85 }}
                        className="relative"
                      >
                        <button
                          onClick={() => { haptic(); onEdit(cat.id); }}
                          className="flex flex-col items-center w-full text-center"
                        >
                          <div className="w-10 h-10 flex items-center justify-center shrink-0 floating-emoji">
                            <CategoryIcon name={cat.emoji || "Package"} size={27} color={cat.color} />
                          </div>
                          <span className="text-[10px] font-semibold mt-0.5 truncate w-full px-0.5 leading-none text-slate-500 dark:text-slate-400">
                            {cat.name.charAt(0).toUpperCase() + cat.name.slice(1).toLowerCase()}
                          </span>
                          {hasLimit && (
                            <div className="w-7 h-[2px] bg-slate-200 dark:bg-slate-700 rounded-full mt-0.5 overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all duration-700 ease-out",
                                  ratio >= 1 ? "bg-rose-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-emerald-500"
                                )}
                                style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                              />
                            </div>
                          )}
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

CategorieTab.displayName = 'CategorieTab';
export default CategorieTab;
