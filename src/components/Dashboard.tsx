import { CategoryIcon } from "./CategoryIcon";
import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Target, AlertTriangle } from 'lucide-react';
import { headerGradient } from '../lib/theme';
import { format, isToday, addMonths, startOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { StatsResult } from '../types';
import { User } from 'firebase/auth';
import CalendarDropdown from './CalendarDropdown';
import { useTransactionsContext } from '../context/TransactionsContext';

import { useVoiceInput } from '../hooks/useVoiceInput';
import { haptic } from '../lib/haptic';
import { useCountUp } from '../hooks/useCountUp';

// Budget card estratta per usare useCountUp senza violare rules of hooks nel .map()
const BudgetCard = memo(({ b }: { b: StatsResult['budgetStatus'][number] }) => {
  const animSpent = useCountUp(b.spent, 700);
  const pct = Math.min(b.percentage, 100);
  const isOver = b.isExceeded;
  const isWarn = !isOver && b.percentage >= 80;
  return (
    <div
      className={cn(
        "shrink-0 rounded-2xl px-3 py-2 min-w-[120px] max-w-[140px] border transition-colors",
        isOver
          ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20"
          : isWarn
            ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
            : "bg-white dark:bg-slate-800 border-white dark:border-white/5"
      )}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <CategoryIcon name={b.emoji} size={14} color={b.color} />
        <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 truncate flex-1">{b.name}</span>
        {isOver && <AlertTriangle size={10} className="text-rose-500 shrink-0" />}
      </div>
      <div className="w-full h-[3px] bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
        <div
          className={cn("h-full rounded-full transition-all duration-1000 ease-out",
            isOver ? "bg-rose-500" : isWarn ? "bg-amber-400" : "bg-emerald-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between items-center">
        <span className={cn("text-[10px] font-black",
          isOver ? "text-rose-500" : isWarn ? "text-amber-500" : "text-slate-400 dark:text-slate-500"
        )}>
          {formatCurrency(animSpent)}
        </span>
        <span className="text-[10px] text-slate-300 dark:text-slate-600 font-bold">
          / {formatCurrency(b.limit)}
        </span>
      </div>
    </div>
  );
});
BudgetCard.displayName = 'BudgetCard';

interface DashboardProps {
  user: User | null;
  setMonth: (diff: number) => void;
  onGoToDate?: (date: Date) => void;
  onProfileClick: () => void;
  onAddClick?: (type: 'EXPENSE' | 'INCOME', categoryId?: string) => void;
}

const Dashboard = memo(({
  user, setMonth, onProfileClick, onAddClick, onGoToDate,
}: DashboardProps) => {
  const { stats, transactions, categories, filters, addTransaction } = useTransactionsContext();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');
  const incomeCategories = categories.filter(c => c.type === 'INCOME');

  // T1-D: set di ID categorie usate oggi
  const today = new Date().toISOString().split('T')[0];
  const usedTodayIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const t of transactions) {
      if (t.date === today) ids.add(t.category);
    }
    return ids;
  }, [transactions, today]);

  const lastPressedCat = React.useRef<Category | null>(null);
  const onAddRefDash = React.useRef(addTransaction);
  onAddRefDash.current = addTransaction;

  const { handleTouchStart: _hts, handleTouchMove: _htm, handleTouchEnd: _hte, isListeningState, consumeVoiceActivation } = useVoiceInput(async (amount, note) => {
    const cat = lastPressedCat.current;
    if (cat && onAddRefDash.current) {
      const today = new Date().toISOString().split('T')[0];
      await onAddRefDash.current!({ amount, type: cat.type, category: cat.id, note: note || '', date: today, isRecurring: false, recurrenceInterval: 'NONE' });
    }
  });

  const handleCategoryClick = (category: Category) => { haptic.light?.(); onAddClick?.(category.type, category.id); };
  const handleDateSelect = (date: Date) => { onGoToDate?.(date); setIsCalendarOpen(false); };
  const handleGoToToday = () => { onGoToDate?.(new Date()); setIsCalendarOpen(false); };
  const handlePrevMonth = () => { haptic.light?.(); onGoToDate?.(startOfMonth(addMonths(filters.date, -1))); };
  const handleNextMonth = () => { haptic.light?.(); onGoToDate?.(startOfMonth(addMonths(filters.date, 1))); };

  const swipeStartX = React.useRef<number | null>(null);
  const handleSwipeTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    swipeStartX.current = e.touches[0].clientX;
  };
  const handleSwipeTouchEnd = (e: React.TouchEvent) => {
    if (swipeStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(dx) < 60) return;
    if (dx < 0) handleNextMonth();
    else handlePrevMonth();
  };

  const dateLabel = isToday(filters.date)
    ? 'Oggi'
    : format(filters.date, 'd MMMM yyyy', { locale: it });

  return (
    <div
      className="h-full flex flex-col bg-[#F5F5F0] dark:bg-slate-900 overflow-hidden font-sans transition-colors duration-500"
    >

      {isListeningState && <div style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.85)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'24px'}}><style>{'@keyframes vp{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}'}</style><div style={{width:130,height:130,borderRadius:'50%',background:'rgba(17,204,152,0.12)',border:'3px solid #11cc98',display:'flex',alignItems:'center',justifyContent:'center',animation:'vp 1.1s ease-in-out infinite'}}><svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#11cc98" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg></div><p style={{color:'white',fontSize:20,fontWeight:700,margin:0}}>In ascolto...</p><p style={{color:'rgba(255,255,255,0.45)',fontSize:13,margin:0}}>Es: "caffè 2 euro"</p></div>}
      {/* ── HEADER — swipe sinistra/destra per cambiare mese ── */}
      <div
        className="px-4 pb-5 shrink-0"
        style={{ ...headerGradient, paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
        onTouchStart={handleSwipeTouchStart}
        onTouchEnd={handleSwipeTouchEnd}
      >

        {/* Logo centrato + avatar dx */}
        <div className="flex items-center justify-center relative mb-3">
          <img src="/logo.png" alt="MoneyTrack" className="absolute left-0 h-11 w-11 rounded-xl object-cover flex-shrink-0" />
          <div className="flex flex-col items-center">
            <span className="text-[26px] font-black text-white tracking-tight" style={{fontFamily:"system-ui",letterSpacing:"-0.5px"}}>MoneyTrack</span>
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest text-center">Dashboard</p>
          </div>
          <button
            onClick={() => { haptic.light?.(); onProfileClick(); }}
            className="absolute right-0 w-10 h-10 rounded-full border-2 border-white/50 overflow-hidden active:scale-90 transition-all"
          >
            {user?.photoURL
              ? <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-black">{user?.displayName?.[0] || 'U'}</div>
            }
          </button>
        </div>

        {/* Navigazione mese */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={handlePrevMonth} className="text-white/60 active:scale-95 transition-all">
              <ChevronLeft size={13} strokeWidth={3} className="text-white/60" />
            </button>
            <button onClick={handlePrevMonth} className="text-white/90 text-[13px] font-bold active:scale-95 transition-all capitalize">
              {format(addMonths(filters.date, -1), 'MMM', { locale: it })}
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { haptic.light?.(); setMonth(-1); }} className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center active:scale-90 transition-all">
              <ChevronLeft size={13} className="text-white" strokeWidth={3} />
            </button>
            <button onClick={() => { haptic.light?.(); setIsCalendarOpen(!isCalendarOpen); }} className="flex items-center gap-1.5 active:scale-95 transition-all">
              <CalendarIcon size={15} className="text-white" strokeWidth={2.5} />
              <span className="text-[16px] font-black text-white capitalize">{dateLabel}</span>
            </button>
            <button onClick={() => { haptic.light?.(); setMonth(1); }} className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center active:scale-90 transition-all">
              <ChevronRight size={13} className="text-white" strokeWidth={3} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleNextMonth} className="text-white/90 text-[13px] font-bold active:scale-95 transition-all capitalize">
              {format(addMonths(filters.date, 1), 'MMM', { locale: it })}
            </button>
            <button onClick={handleNextMonth} className="text-white/60 active:scale-95 transition-all">
              <ChevronRight size={13} strokeWidth={3} className="text-white/60" />
            </button>
          </div>
        </div>
      </div>

      <CalendarDropdown
        isOpen={isCalendarOpen}
        selectedDate={filters.date}
        onSelectDate={handleDateSelect}
        onGoToToday={handleGoToToday}
        onClose={() => setIsCalendarOpen(false)}
      />


      {/* ── CATEGORIE — no scroll, 25 uscite + 10 entrate calcolate per iPhone SE ── */}
      {/* Budget: 467px = 4pt + 26sep + 5×50row + 4×8gap + 12mb + 26sep + 2×50row + 1×8gap = 458px */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 pt-1 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] flex flex-col">

        {categories.length === 0 ? (
          <div className="mb-3">
            <div className="grid grid-cols-5 gap-x-1 gap-y-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-11 h-11 rounded-[14px] bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  <div className="w-8 h-2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* USCITE */}
            {expenseCategories.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-[#E24B4A]/40 to-transparent rounded-full" />
                  <span className="text-[10px] font-black text-[#E24B4A] uppercase tracking-[0.15em]">Uscite</span>
                  <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-[#E24B4A]/40 to-transparent rounded-full" />
                </div>
                <div className="grid grid-cols-5 gap-x-1 gap-y-2">
                  {expenseCategories.map((cat) => {
                    const spent = stats.categoryBreakdown.find(s => s.category === cat.name)?.amount || 0;
                    const hasLimit = cat.monthlyLimit && cat.monthlyLimit > 0;
                    const ratio = hasLimit ? spent / (cat.monthlyLimit as number) : 0;
                    const usedToday = usedTodayIds.has(cat.id) || usedTodayIds.has(cat.name);
                    return (
                      <motion.button
                        key={cat.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileTap={{ scale: 0.82 }}
                        onClick={() => { if (consumeVoiceActivation()) return; handleCategoryClick(cat); }}
                        onTouchStart={(e) => { lastPressedCat.current = cat; _hts(e); }}
                        onTouchMove={_htm}
                        onTouchEnd={_hte}
                        onTouchCancel={_hte}
                        className="flex flex-col items-center text-center"
                      >
                        <div className="relative w-10 h-10 flex items-center justify-center shrink-0 floating-emoji">
                          <CategoryIcon name={cat.emoji || "Package"} size={27} color={cat.color} />
                          {usedToday && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#F5F5F0] dark:border-slate-900 rounded-full animate-pulse" />
                          )}
                        </div>
                        <span className="text-[10px] font-semibold mt-0.5 truncate w-full px-0.5 leading-none text-slate-500 dark:text-slate-400">
                          {cat.name.charAt(0).toUpperCase() + cat.name.slice(1).toLowerCase()}
                        </span>
                        {hasLimit && (
                          <div className="w-7 h-[2px] bg-slate-200 dark:bg-slate-700 rounded-full mt-0.5 overflow-hidden">
                            <div
                              className={cn("h-full transition-all duration-1000 ease-out",
                                ratio >= 1 ? "bg-rose-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-emerald-500"
                              )}
                              style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                            />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ENTRATE */}
            {incomeCategories.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-[#1D9E75]/40 to-transparent rounded-full" />
                  <span className="text-[10px] font-black text-[#1D9E75] uppercase tracking-[0.15em]">Entrate</span>
                  <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-[#1D9E75]/40 to-transparent rounded-full" />
                </div>
                <div className="grid grid-cols-5 gap-x-1 gap-y-2">
                  {incomeCategories.map((cat) => {
                    const usedToday = usedTodayIds.has(cat.id) || usedTodayIds.has(cat.name);
                    return (
                      <motion.button
                        key={cat.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileTap={{ scale: 0.82 }}
                        onClick={() => { if (consumeVoiceActivation()) return; handleCategoryClick(cat); }}
                        onTouchStart={(e) => { lastPressedCat.current = cat; _hts(e); }}
                        onTouchMove={_htm}
                        onTouchEnd={_hte}
                        onTouchCancel={_hte}
                        className="flex flex-col items-center text-center"
                      >
                        <div className="relative w-10 h-10 flex items-center justify-center shrink-0 floating-emoji">
                          <CategoryIcon name={cat.emoji || "Package"} size={27} color={cat.color} />
                          {usedToday && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#F5F5F0] dark:border-slate-900 rounded-full animate-pulse" />
                          )}
                        </div>
                        <span className="text-[10px] font-semibold mt-0.5 truncate w-full px-0.5 leading-none text-slate-500 dark:text-slate-400">
                          {cat.name.charAt(0).toUpperCase() + cat.name.slice(1).toLowerCase()}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── BUDGET ALERT — categorie con limite impostato ── */}
        {stats.budgetStatus.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent rounded-full" />
              <div className="flex items-center gap-1">
                <Target size={8} strokeWidth={3} className="text-amber-500" />
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.15em]">Budget</span>
              </div>
              <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent rounded-full" />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {stats.budgetStatus.map((b) => (
                <BudgetCard key={b.id} b={b} />
              ))}
            </div>
          </div>
        )}

        {/* ── EMPTY STATE — nessuna transazione nel mese ── */}
        <AnimatePresence>
          {transactions.length === 0 && (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="mt-auto mb-2 flex flex-col items-center justify-center text-center py-4"
            >
              <span className="text-5xl mb-2">🗓️</span>
              <p className="font-black text-slate-600 dark:text-slate-300 text-sm leading-tight">Nessuna transazione questo mese</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-snug px-4">Tocca un'icona categoria per aggiungere la prima transazione</p>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';
export default Dashboard;
