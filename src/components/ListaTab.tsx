import { CategoryIcon } from "./CategoryIcon";
import { Repeat, Search, ShoppingCart, Globe } from "lucide-react";
import { headerGradient } from '../lib/theme';
import React, { useState, useMemo, memo, useEffect, useCallback, useRef } from 'react';
import { Transaction, Category } from '../types';
import { User } from 'firebase/auth';
import { useTransactionsContext } from '../context/TransactionsContext';
import { useWalletContext } from '../context/WalletContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, cn, resolveCategory } from '../lib/utils';
import { haptic } from '../lib/haptic';
import { format, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCountUp } from '../hooks/useCountUp';

interface WalletMember { uid: string; displayName: string; email: string; }

interface ListaTabProps {
  onUpdateAmount: (id: string, amount: number) => Promise<void>;
  onDelete: (id: string) => void;
  onDuplicate?: (t: Transaction) => Promise<void>;
  onDeleteAll?: () => void;
  onItemClick: (id: string) => void;
  onAddTransaction?: (data: Omit<import("../types").Transaction, "id" | "userId" | "createdAt">) => Promise<void>;
  onAddClick?: (type: 'EXPENSE' | 'INCOME', categoryId?: string) => void;
  user?: User | null;
  onProfileClick?: () => void;
  onShoppingClick?: () => void;
  isLoading?: boolean;
}

function getMemberBadge(
  txUserId: string,
  currentUserId: string | undefined,
  members: WalletMember[]
): { label: string; isMe: boolean } | null {
  if (members.length < 2) return null;
  if (txUserId === currentUserId) return { label: 'Tu', isMe: true };
  const m = members.find(x => x.uid === txUserId);
  if (!m) return null;
  const name = (m.displayName || m.email.split('@')[0]).split(' ')[0].slice(0, 8);
  return { label: name, isMe: false };
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <div className="px-4 py-2.5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
    <div className="flex flex-col gap-1.5 flex-1">
      <div className="w-24 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-1/3" />
    </div>
    <div className="h-3 w-14 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
  </div>
);

// ── TxRow: tap semplice → apre dettaglio transazione ─────────────────────────
const TxRow = memo(({
  t, category, badge, onTap, onTagClick,
}: {
  t: Transaction;
  category: Category | undefined;
  badge: { label: string; isMe: boolean } | null;
  onTap: () => void;
  onTagClick?: (tag: string) => void;
}) => (
  <motion.div
    className="border-b border-slate-100 dark:border-slate-800"
    whileTap={{ opacity: 0.6 }}
    onClick={onTap}
    role="button"
    aria-label={`${category?.name || 'transazione'} ${t.type === 'INCOME' ? '+' : '-'}${formatCurrency(t.amount)}`}
  >
    <div className="px-4 py-2.5 flex items-center gap-3 bg-white dark:bg-slate-900 active:bg-slate-50 dark:active:bg-slate-800 transition-colors select-none cursor-pointer">
      <div className="w-8 h-8 flex items-center justify-center shrink-0 floating-emoji">
        <CategoryIcon name={category?.emoji || "Package"} size={22} color={category?.color || "#94a3b8"} />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-[13px] font-semibold leading-tight truncate text-slate-700 dark:text-slate-200">
          {category ? category.name : (
            <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">{t.category || 'Sconosciuta'}</span>
          )}
          {t.isRecurring && <Repeat size={10} strokeWidth={2.5} className="text-slate-400 inline ml-1.5" />}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-tight bg-slate-100 dark:bg-slate-700/60 text-slate-400 dark:text-slate-500">
            {format(parseISO(t.date), 'd MMM', { locale: it })}
          </span>
          {badge && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-tight shrink-0 bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
              {badge.label}
            </span>
          )}
          {t.note && <span className="text-[10px] text-slate-300 dark:text-slate-600 truncate max-w-[120px]">{t.note}</span>}
          {t.tags && t.tags.length > 0 && t.tags.slice(0, 2).map(tag => (
            <button
              key={tag}
              onPointerDown={e => { e.stopPropagation(); e.preventDefault(); onTagClick?.(tag); }}
              className="text-[7px] font-black bg-violet-100 dark:bg-violet-500/20 text-violet-500 dark:text-violet-300 rounded-full px-1.5 py-0.5 shrink-0 active:scale-90 transition-all"
            >
              #{tag}
            </button>
          ))}
          {t.tags && t.tags.length > 2 && (
            <span className="text-[7px] text-slate-300 dark:text-slate-600">+{t.tags.length - 2}</span>
          )}
        </div>
      </div>
      <span className={cn("text-[13px] font-bold shrink-0", t.type === 'INCOME' ? "text-emerald-500" : "text-rose-500")}>
        {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
      </span>
    </div>
  </motion.div>
));
TxRow.displayName = 'TxRow';

// ── Main component ────────────────────────────────────────────────────────────
const ListaTab = memo(({
  onUpdateAmount, onDelete, onDuplicate, onDeleteAll, onItemClick,
  onAddTransaction, onAddClick, user, onProfileClick, onShoppingClick,
  isLoading = false,
}: ListaTabProps) => {
  const { allTransactions: transactions, categories, filters, navigate, setPeriod, stats } = useTransactionsContext();
  const { wallet } = useWalletContext();
  const walletMembers: WalletMember[] = wallet?.memberEmails ?? [];
  const currentUserId = user?.uid;

  const [inputValue, setInputValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'EXPENSE'), [categories]);
  const incomeCategories = useMemo(() => categories.filter(c => c.type === 'INCOME'), [categories]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const clearSearch = useCallback(() => {
    setInputValue('');
    setDebouncedSearch('');
  }, []);

  const [sortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');

  const previousBalance = useMemo(() => {
    const startDate = filters.period === 'MONTHLY' ? startOfMonth(filters.date) : startOfDay(filters.date);
    return transactions
      .filter(t => parseISO(t.date) < startDate)
      .reduce((acc, t) => t.type === 'INCOME' ? acc + t.amount : acc - t.amount, 0);
  }, [transactions, filters.date, filters.period]);

  // T3-D: quando c'è una ricerca attiva, bypassa il filtro periodo e cerca su tutto
  const isGlobalSearch = debouncedSearch.length > 0;

  const filteredAndSorted = useMemo(() => {
    let filtered: Transaction[];

    if (isGlobalSearch) {
      // Ricerca globale — tutti i mesi
      const q = debouncedSearch.toLowerCase().trim();
      filtered = transactions.filter(t => {
        const category = resolveCategory(t.category, categories);
        const amountStr = t.amount.toString().replace('.', ',');
        const dateStr = format(parseISO(t.date), 'd MMMM yyyy', { locale: it }).toLowerCase();
        return (
          (category && category.name.toLowerCase().includes(q)) ||
          (t.note && t.note.toLowerCase().includes(q)) ||
          amountStr.includes(q) ||
          t.amount.toFixed(2).includes(q) ||
          dateStr.includes(q) ||
          (t.tags && t.tags.some(tag => tag.includes(q)))
        );
      });
    } else {
      // Filtro normale per periodo
      filtered = transactions.filter(t => {
        const tDate = parseISO(t.date);
        return filters.period === 'MONTHLY'
          ? isWithinInterval(tDate, { start: startOfMonth(filters.date), end: endOfMonth(filters.date) })
          : isWithinInterval(tDate, { start: startOfDay(filters.date), end: endOfDay(filters.date) });
      });
    }

    return filtered.sort((a, b) => {
      if (sortBy === "date") {
        const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (timeDiff !== 0) return sortOrder === "desc" ? timeDiff : -timeDiff;
        const aSec = (a.createdAt as any)?.seconds || 0;
        const bSec = (b.createdAt as any)?.seconds || 0;
        return bSec - aSec;
      } else {
        const amountDiff = b.amount - a.amount;
        if (amountDiff !== 0) return sortOrder === "desc" ? amountDiff : -amountDiff;
        const aSec = (a.createdAt as any)?.seconds || 0;
        const bSec = (b.createdAt as any)?.seconds || 0;
        return bSec - aSec;
      }
    });
  }, [transactions, filters.date, filters.period, sortBy, sortOrder, debouncedSearch, categories, isGlobalSearch]);

  const getCategoryForTransaction = (t: Transaction): Category | undefined =>
    resolveCategory(t.category, categories);

  type FlatItem =
    | { kind: 'section'; key: string; label: string; color: string }
    | { kind: 'header';  key: string; date: string; total: number }
    | { kind: 'tx';      key: string; transaction: Transaction };

  const flatItems = useMemo<FlatItem[]>(() => {
    const buildSection = (txs: Transaction[]) => {
      const groups: Record<string, { date: string; total: number; items: Transaction[] }> = {};
      txs.forEach(t => {
        const dk = format(parseISO(t.date), 'yyyy-MM-dd');
        if (!groups[dk]) groups[dk] = { date: format(parseISO(t.date), 'd MMMM yyyy', { locale: it }), total: 0, items: [] };
        groups[dk].items.push(t);
        groups[dk].total += t.amount;
      });
      return Object.entries(groups).sort((a, b) =>
        sortOrder === 'desc' ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0])
      );
    };

    const expenses = filteredAndSorted.filter(t => t.type === 'EXPENSE');
    const incomes  = filteredAndSorted.filter(t => t.type === 'INCOME');
    const result: FlatItem[] = [];

    if (expenses.length > 0) {
      result.push({ kind: 'section', key: 'sec-uscite', label: 'Uscite', color: '#E24B4A' });
      for (const [dk, g] of buildSection(expenses)) {
        result.push({ kind: 'header', key: `h-exp-${dk}`, date: g.date, total: g.total });
        for (const t of g.items) result.push({ kind: 'tx', key: t.id, transaction: t });
      }
    }
    if (incomes.length > 0) {
      result.push({ kind: 'section', key: 'sec-entrate', label: 'Entrate', color: '#1D9E75' });
      for (const [dk, g] of buildSection(incomes)) {
        result.push({ kind: 'header', key: `h-inc-${dk}`, date: g.date, total: g.total });
        for (const t of g.items) result.push({ kind: 'tx', key: t.id, transaction: t });
      }
    }
    return result;
  }, [filteredAndSorted, sortOrder]);

  const listRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => listRef.current,
    estimateSize: (i) => flatItems[i]?.kind === 'section' ? 32 : flatItems[i]?.kind === 'header' ? 36 : 68,
    overscan: 8,
  });

  const animBalance = useCountUp(stats?.balanceAtPeriodEnd ?? stats?.totalBalance ?? 0, 600);
  const animIncome  = useCountUp(stats?.monthlyIncome ?? 0, 500);
  const animExpense = useCountUp(stats?.monthlyExpense ?? 0, 500);

  return (
    <div className="h-full flex flex-col bg-[#F5F5F0] dark:bg-slate-900 overflow-hidden font-sans transition-colors duration-500">

      {/* ── HEADER ── */}
      <div className="px-4 pb-6 shrink-0" style={{ ...headerGradient, paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
        <div className="flex items-center justify-center relative mb-3">
          {onShoppingClick && (
            <button
              onClick={onShoppingClick}
              className="absolute left-0 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white active:scale-90 transition-all"
            >
              <ShoppingCart size={16} strokeWidth={2.5} />
            </button>
          )}
          <div>
            <img src="/logo.png" alt="MoneyTrack" className="absolute left-0 h-11 w-11 rounded-xl object-cover flex-shrink-0" />
            <span className="text-[26px] font-black text-white tracking-tight" style={{fontFamily:"system-ui",letterSpacing:"-0.5px"}}>MoneyTrack</span>
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-1 text-center w-full">Cronologia</p>
          </div>
          {onProfileClick && (
            <button
              onClick={onProfileClick}
              className="absolute right-0 w-10 h-10 rounded-full border-2 border-white/50 overflow-hidden active:scale-90 transition-all"
            >
              {user?.photoURL
                ? <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-black">{user?.displayName?.[0] || 'U'}</div>
              }
            </button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <button onClick={() => { haptic.light?.(); navigate(-1); }} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center active:scale-90 transition-all">
            <ChevronLeft size={16} strokeWidth={3} className="text-white" />
          </button>
          <span className="text-[14px] font-bold text-white capitalize">
            {format(filters.date, filters.period === 'DAILY' ? 'd MMMM yyyy' : 'MMMM yyyy', { locale: it })}
          </span>
          <button onClick={() => { haptic.light?.(); navigate(1); }} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center active:scale-90 transition-all">
            <ChevronRight size={16} strokeWidth={3} className="text-white" />
          </button>
        </div>
      </div>

      {/* ── CARD EMERGENTE con filtri ── */}
      <div className="mx-3 -mt-4 z-10 relative bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-black/10 border border-white/80 dark:border-white/5 px-3 py-3 shrink-0">
        {stats && (
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Saldo</span>
              <span
                className={cn("font-black leading-none tracking-tight tabular-nums", animBalance >= 0 ? "text-emerald-500" : "text-rose-500")}
                style={{ fontSize: 'clamp(1rem, 4.5vw, 1.25rem)' }}
              >
                {formatCurrency(animBalance)}
              </span>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Entrate</span>
                <span className="text-[12px] font-black text-emerald-500 tabular-nums">{formatCurrency(animIncome)}</span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Uscite</span>
                <span className="text-[12px] font-black text-rose-500 tabular-nums">{formatCurrency(animExpense)}</span>
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-2 mb-2.5">
          <button
            onClick={() => { haptic.light?.(); setPeriod("MONTHLY"); }}
            className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold active:scale-95 transition-all",
              filters.period === 'MONTHLY' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
            )}
          >Mensile</button>
          <button
            onClick={() => { haptic.light?.(); setPeriod("DAILY"); }}
            className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold active:scale-95 transition-all",
              filters.period === 'DAILY' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
            )}
          >Giornaliero</button>
        </div>
        {/* Search bar con badge globale (T3-D) */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-2">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Cerca per categoria, nota, importo..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            className="bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none w-full placeholder:text-slate-400"
          />
          {inputValue.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              {isGlobalSearch && (
                <div className="flex items-center gap-1 bg-violet-100 dark:bg-violet-500/20 rounded-full px-1.5 py-0.5">
                  <Globe size={9} className="text-violet-500" />
                  <span className="text-[10px] font-black text-violet-500 uppercase tracking-wider">tutti</span>
                </div>
              )}
              <span className="text-[10px] font-bold text-emerald-500">{filteredAndSorted.length}</span>
              <button onClick={() => { haptic.light?.(); clearSearch(); }} className="text-slate-400 active:scale-90 transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          )}
        </div>
        {/* Banner ricerca globale */}
        {isGlobalSearch && (
          <div className="mt-2 flex items-center gap-1.5 px-1">
            <Globe size={10} className="text-violet-500 shrink-0" />
            <span className="text-[10px] font-black text-violet-500">
              Ricerca globale — {filteredAndSorted.length} {filteredAndSorted.length === 1 ? 'risultato' : 'risultati'}
            </span>
          </div>
        )}
      </div>

      {/* ── LISTA VIRTUALIZZATA ── */}
      <div ref={listRef} className="flex-1 overflow-y-auto no-scrollbar pb-[calc(env(safe-area-inset-bottom)+5.5rem)] mt-3">

        {/* SALDO PRECEDENTE */}
        {previousBalance !== 0 && !isGlobalSearch && (
          <div className="px-4 mb-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-semibold text-slate-300 dark:text-slate-600 uppercase tracking-wider">Saldo precedente</span>
              <span className={cn("text-xs font-bold", previousBalance >= 0 ? "text-emerald-500" : "text-rose-500")}>
                {formatCurrency(previousBalance)}
              </span>
            </div>
          </div>
        )}

        {/* T3-A: skeleton al primo caricamento */}
        {isLoading && flatItems.length === 0 ? (
          <div>
            {[...Array(6)].map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : flatItems.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col items-center justify-center py-16 text-center px-8">
            <div className="relative mb-6">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                <circle cx="60" cy="60" r="50" fill="#F0FDF4"/>
                <rect x="35" y="38" width="50" height="44" rx="8" fill="#D1FAE5"/>
                <rect x="35" y="38" width="50" height="12" rx="8" fill="#6EE7B7"/>
                <rect x="43" y="58" width="20" height="3" rx="1.5" fill="#A7F3D0"/>
                <rect x="43" y="65" width="30" height="3" rx="1.5" fill="#A7F3D0"/>
                <rect x="43" y="72" width="14" height="3" rx="1.5" fill="#A7F3D0"/>
              </svg>
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} style={{position:'absolute',top:0,right:0}} onClick={() => setShowCategoryPicker(true)} className="cursor-pointer active:scale-95 transition-all">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="18" r="16" fill="#ECFDF5" stroke="#6EE7B7" strokeWidth="2"/>
                  <line x1="18" y1="11" x2="18" y2="25" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="11" y1="18" x2="25" y2="18" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </motion.div>
            </div>
            <span className="text-base font-bold text-slate-500 dark:text-slate-400 mb-1">
              {isGlobalSearch ? 'Nessun risultato' : 'Nessuna operazione'}
            </span>
            <span className="text-xs text-slate-300 dark:text-slate-600 leading-relaxed">
              {isGlobalSearch
                ? 'Nessuna transazione corrisponde alla ricerca.'
                : 'Non ci sono movimenti per questo periodo.\nAggiungi la tua prima spesa!'}
            </span>
          </motion.div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map(vi => {
              const item = flatItems[vi.index];
              return (
                <div
                  key={vi.key}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)` }}
                >
                  {item.kind === 'section' ? (
                    <div className="flex items-center gap-3 px-4 pt-4 pb-1">
                      <div className="flex-1 h-[1.5px] rounded-full" style={{ background: `linear-gradient(to right, transparent, ${item.color}66, transparent)` }} />
                      <span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: item.color }}>{item.label}</span>
                      <div className="flex-1 h-[1.5px] rounded-full" style={{ background: `linear-gradient(to right, transparent, ${item.color}66, transparent)` }} />
                    </div>
                  ) : item.kind === 'header' ? (
                    <div className="flex items-center justify-between px-4 pt-2 pb-1">
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{item.date}</span>
                      {item.total > 0 && <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{formatCurrency(item.total)}</span>}
                    </div>
                  ) : (
                    <TxRow
                      t={item.transaction}
                      category={getCategoryForTransaction(item.transaction)}
                      badge={getMemberBadge(item.transaction.userId, currentUserId, walletMembers)}
                      onTap={() => { haptic.light?.(); onItemClick(item.transaction.id); }}
                      onTagClick={tag => { haptic.light?.(); setInputValue(tag); }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ── Category picker sheet — mese senza transazioni ── */}
      <AnimatePresence>
        {showCategoryPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/40"
            onClick={() => setShowCategoryPicker(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.75 }}
              className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-3xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Aggiungi transazione</p>

              {categories.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-6 h-6 border-2 border-[#1D9E75]/40 border-t-[#1D9E75] rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {expenseCategories.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-[#E24B4A]/40 to-transparent rounded-full" />
                        <span className="text-[10px] font-black text-[#E24B4A] uppercase tracking-[0.15em]">Spese</span>
                        <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-[#E24B4A]/40 to-transparent rounded-full" />
                      </div>
                      <div className="grid grid-cols-5 gap-x-1 gap-y-2">
                        {expenseCategories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => { haptic.medium?.(); setShowCategoryPicker(false); onAddClick?.('EXPENSE', cat.id); }}
                            className="flex flex-col items-center text-center active:scale-90 transition-all"
                          >
                            <div className="w-10 h-10 flex items-center justify-center">
                              <CategoryIcon name={cat.emoji || 'Package'} size={27} color={cat.color} />
                            </div>
                            <span className="text-[10px] font-semibold mt-0.5 truncate w-full px-0.5 leading-none text-slate-500 dark:text-slate-400">
                              {cat.name.charAt(0).toUpperCase() + cat.name.slice(1).toLowerCase()}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {incomeCategories.length > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-[#1D9E75]/40 to-transparent rounded-full" />
                        <span className="text-[10px] font-black text-[#1D9E75] uppercase tracking-[0.15em]">Entrate</span>
                        <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-[#1D9E75]/40 to-transparent rounded-full" />
                      </div>
                      <div className="grid grid-cols-5 gap-x-1 gap-y-2">
                        {incomeCategories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => { haptic.medium?.(); setShowCategoryPicker(false); onAddClick?.('INCOME', cat.id); }}
                            className="flex flex-col items-center text-center active:scale-90 transition-all"
                          >
                            <div className="w-10 h-10 flex items-center justify-center">
                              <CategoryIcon name={cat.emoji || 'Package'} size={27} color={cat.color} />
                            </div>
                            <span className="text-[10px] font-semibold mt-0.5 truncate w-full px-0.5 leading-none text-slate-500 dark:text-slate-400">
                              {cat.name.charAt(0).toUpperCase() + cat.name.slice(1).toLowerCase()}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
});

ListaTab.displayName = 'ListaTab';
export default ListaTab;
