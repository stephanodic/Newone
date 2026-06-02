import React, { memo, useState, useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import { headerGradient } from '../lib/theme';
import { User } from 'firebase/auth';
import { formatCurrency, cn, resolveCategory } from '../lib/utils';
import { haptic } from '../lib/haptic';
import { CategoryIcon } from './CategoryIcon';
import { useTransactionsContext } from '../context/TransactionsContext';

import { motion } from 'motion/react';
import {
  TrendingUp, TrendingDown, ChevronRight, ChevronLeft,
  PieChart as PieChartIcon, Calendar,
  Eye, EyeOff, Flame
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, subMonths,
  isWithinInterval, parseISO,
  startOfWeek, endOfWeek, startOfYear, endOfYear
} from 'date-fns';
import { it } from 'date-fns/locale';

interface GraficiTabProps {
  user?: User | null;
  onProfileClick?: () => void;
}

type TimeFrame = 'settimana' | 'mese' | 'anno';
type Section = 'overview' | 'trend' | 'categorie';

const tabs: { id: Section, label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'trend', label: 'Trend' },
  { id: 'categorie', label: 'Categorie' }
];

const GraficiTab = memo(({ user, onProfileClick }: GraficiTabProps) => {
  const { stats: monthlyStats, categories, filters, allTransactions, navigate: setMonth } = useTransactionsContext();
  const [isPrivate, setIsPrivate] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('mese');

  const val = (v: number) => isPrivate ? '••••' : formatCurrency(v);
  const pct = (v: number) => isPrivate ? '••%' : `${Math.round(v)}%`;

  const filteredTransactions = useMemo(() => {
    let start, end;
    if (timeFrame === 'settimana') {
      start = startOfWeek(filters.date, { weekStartsOn: 1 });
      end = endOfWeek(filters.date, { weekStartsOn: 1 });
    } else if (timeFrame === 'mese') {
      start = startOfMonth(filters.date);
      end = endOfMonth(filters.date);
    } else {
      start = startOfYear(filters.date);
      end = endOfYear(filters.date);
    }
    return allTransactions.filter(t =>
      isWithinInterval(parseISO(t.date), { start, end })
    );
  }, [allTransactions, filters.date, timeFrame]);

  const periodStats = useMemo(() => {
    let income = 0, expense = 0;
    const catTotal: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (t.type === 'INCOME') { income += t.amount; }
      else {
        expense += t.amount;
        const cat = resolveCategory(t.category, categories);
        const name = cat?.name || t.category;
        catTotal[name] = (catTotal[name] || 0) + t.amount;
      }
    });
    const categoryBreakdown = Object.entries(catTotal).map(([name, amount]) => {
      const cat = categories.find(c => c.name === name);
      return { category: name, amount, color: cat?.color || '#cbd5e1', emoji: cat?.emoji || 'Package', percentage: expense > 0 ? (amount / expense) * 100 : 0 };
    }).sort((a, b) => b.amount - a.amount);
    return { income, expense, categoryBreakdown };
  }, [filteredTransactions, categories]);

  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(filters.date, 5 - i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const txs = allTransactions.filter(t => isWithinInterval(parseISO(t.date), { start, end }));
      const income = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const expense = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      return { month: format(date, 'MMM', { locale: it }), Entrate: income, Uscite: expense, Saldo: income - expense };
    });
  }, [allTransactions, filters.date]);

  // T5-C: 12 mesi per grafico a barre affiancate
  const trend12Data = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(filters.date, 11 - i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const txs = allTransactions.filter(t => isWithinInterval(parseISO(t.date), { start, end }));
      const income = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const expense = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      return { month: format(date, 'MMM yy', { locale: it }), Entrate: income, Uscite: expense, Saldo: income - expense };
    });
  }, [allTransactions, filters.date]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const color = payload[0].color || payload[0].fill || '#1D9E75';
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border-l-4" style={{ borderColor: color }}>
          {label && <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>}
          <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color }}>{payload[0].name}</p>
          <p className="text-[15px] font-black text-slate-900 dark:text-slate-100">{isPrivate ? '••••' : formatCurrency(payload[0].value)}</p>
          {payload.length > 1 && payload.slice(1).map((p: any, i: number) => (
            <p key={i} className="text-[12px] font-bold mt-0.5" style={{ color: p.color || p.fill }}>{p.name}: {isPrivate ? '••' : formatCurrency(p.value)}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col bg-[#F5F5F0] dark:bg-slate-900 overflow-hidden font-sans relative transition-colors duration-500">
      <div className="absolute top-[-5%] left-[-10%] w-64 h-64 bg-[#11cc98]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[40%] right-[-15%] w-56 h-56 bg-[#ff5f5e]/5 rounded-full blur-3xl pointer-events-none" />

      {/* ── HEADER ── */}
      <div className="px-4 pb-6 shrink-0" style={{ ...headerGradient, paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
        <div className="flex items-center justify-center relative mb-3">
          <img src="/logo.png" alt="MoneyTrack" className="absolute left-0 h-11 w-11 rounded-xl object-cover flex-shrink-0" />
          <div className="flex flex-col items-center">
            <span className="text-[26px] font-black text-white tracking-tight" style={{fontFamily:"system-ui",letterSpacing:"-0.5px"}}>MoneyTrack</span>
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest text-center">Statistiche</p>
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
        <div className="flex items-center justify-center gap-1.5">
          <button onClick={() => { haptic.light?.(); setIsPrivate(p => !p); }} className="w-9 h-9 flex items-center justify-center bg-white/20 rounded-xl text-white active:scale-90 transition-all">
            {isPrivate ? <EyeOff size={15} strokeWidth={2.5} /> : <Eye size={15} strokeWidth={2.5} />}
          </button>
          <div className="flex items-center gap-0.5 bg-white/20 rounded-full px-2 py-1">
            <button onClick={() => { haptic.light?.(); setMonth(-1); }} className="p-1 text-white/70 active:scale-90"><ChevronLeft size={13} strokeWidth={3} /></button>
            <div className="flex items-center gap-1 px-1">
              <Calendar size={11} className="text-white" strokeWidth={2.5} />
              <span className="text-[10px] font-black text-white uppercase tracking-wider">{format(filters.date, 'MMM yy', { locale: it })}</span>
            </div>
            <button onClick={() => { haptic.light?.(); setMonth(1); }} className="p-1 text-white/70 active:scale-90"><ChevronRight size={13} strokeWidth={3} /></button>
          </div>
        </div>
      </div>

      {/* ── CARD EMERGENTE con timeframe + tabs ── */}
      <div className="mx-3 -mt-6 z-10 relative bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-black/10 border border-white/80 dark:border-white/5 px-3 py-3 shrink-0">

        <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { haptic.light?.(); setActiveSection(t.id); }} className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all", activeSection === t.id ? "bg-emerald-500 text-white" : "text-slate-500 dark:text-slate-400")} style={{ WebkitTapHighlightColor: 'transparent' }}>

              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">

        {/* ── EMPTY STATE — nessuna transazione nel periodo ── */}
        {filteredTransactions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center py-14 px-8 text-center"
          >
            <div className="relative mb-6">
              <svg width="130" height="130" viewBox="0 0 130 130" fill="none">
                <circle cx="65" cy="65" r="54" fill="#F0FDF4" />
                <circle cx="65" cy="65" r="38" fill="#D1FAE5" />
                <circle cx="65" cy="65" r="28" fill="#6EE7B7" strokeWidth="0" />
                <path d="M52 65 L62 76 L80 52" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="97" cy="34" r="10" fill="#FEF3C7" />
                <path d="M97 29 L97 34" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="97" cy="38" r="1.5" fill="#F59E0B" />
                <circle cx="30" cy="92" r="8" fill="#EFF6FF" />
                <path d="M27 92 L33 92 M30 89 L30 95" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', top: -6, right: -6 }}
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="14" r="12" fill="#ECFDF5" stroke="#6EE7B7" strokeWidth="2" />
                  <path d="M9 14 L19 14 M14 9 L14 19" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </motion.div>
            </div>
            <p className="text-[15px] font-black text-slate-600 dark:text-slate-300 mb-1.5">
              Nessuna transazione
            </p>
            <p className="text-[12px] text-slate-400 dark:text-slate-500 leading-relaxed max-w-[220px]">
              Aggiungi transazioni per vedere grafici e statistiche dettagliate
            </p>
          </motion.div>
        )}

        {/* OVERVIEW — donut chart */}
        {activeSection === 'overview' && filteredTransactions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 px-2">
            {/* Schede entrate/uscite/saldo */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-[20px] p-3 border border-emerald-100 dark:border-emerald-500/20 shadow-sm flex flex-col gap-1">
                <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-sm"><TrendingUp size={13} strokeWidth={3} /></div>
                <p className="text-[10px] font-black text-emerald-600/50 uppercase tracking-widest">Entrate</p>
                <p className="text-[13px] font-black text-emerald-600 tracking-tight leading-tight">{val(periodStats.income)}</p>
              </div>
              <div className="bg-rose-50 dark:bg-rose-500/10 rounded-[20px] p-3 border border-rose-100 dark:border-rose-500/20 shadow-sm flex flex-col gap-1">
                <div className="w-7 h-7 bg-rose-500 rounded-lg flex items-center justify-center text-white shadow-sm"><TrendingDown size={13} strokeWidth={3} /></div>
                <p className="text-[10px] font-black text-rose-600/50 uppercase tracking-widest">Uscite</p>
                <p className="text-[13px] font-black text-rose-600 tracking-tight leading-tight">{val(periodStats.expense)}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-[20px] p-3 border border-slate-100 dark:border-white/5 shadow-sm flex flex-col gap-1">
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm", periodStats.income - periodStats.expense >= 0 ? "bg-slate-700 dark:bg-slate-600" : "bg-slate-400")}>
                  <span className="text-[11px] font-black">=</span>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo</p>
                <p className={cn("text-[13px] font-black tracking-tight leading-tight", periodStats.income - periodStats.expense >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {val(periodStats.income - periodStats.expense)}
                </p>
              </div>
            </div>

            {/* Donut chart spese per categoria */}
            <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-50 dark:border-white/5 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Spese per categoria</h3>
                <PieChartIcon size={14} className="text-slate-300" />
              </div>
              {periodStats.categoryBreakdown.length > 0 ? (
                <>
                  <div className="relative h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={periodStats.categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={88}
                          paddingAngle={2}
                          dataKey="amount"
                          strokeWidth={0}
                          isAnimationActive={true}
                          animationBegin={0}
                          animationDuration={800}
                        >
                          {periodStats.categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded-2xl shadow-xl border border-slate-100 dark:border-white/10">
                                <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: d.color }}>{d.category}</p>
                                <p className="text-[14px] font-black text-slate-900 dark:text-slate-100">{isPrivate ? '••••' : formatCurrency(d.amount)}</p>
                                <p className="text-[10px] font-bold text-slate-400">{pct(d.percentage)}</p>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Centro donut */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Totale</span>
                      <span className="text-[18px] font-black text-rose-500 leading-tight">{val(periodStats.expense)}</span>
                    </div>
                  </div>
                  {/* Legenda */}
                  <div className="mt-3 space-y-2">
                    {periodStats.categoryBreakdown.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <div className="w-5 h-5 flex items-center justify-center">
                            <CategoryIcon name={item.emoji || 'Package'} size={14} color={item.color} />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{item.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-300">{pct(item.percentage)}</span>
                          <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">{val(item.amount)}</span>
                        </div>
                      </div>
                    ))}
                    {periodStats.categoryBreakdown.length > 5 && (
                      <p className="text-[10px] font-black text-slate-300 text-center uppercase tracking-widest pt-1">
                        +{periodStats.categoryBreakdown.length - 5} altre categorie
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="min-h-[150px] flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center text-slate-200 dark:text-slate-600 mb-4">
                    <PieChartIcon size={32} strokeWidth={1} />
                  </div>
                  <p className="text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Nessuna spesa</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TREND */}
        {activeSection === 'trend' && filteredTransactions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 px-2">
            <div className="grid grid-cols-3 gap-2">
              {trendData.slice(-3).map((d, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-[20px] p-3 border border-slate-50 dark:border-white/5 shadow-sm flex flex-col gap-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{d.month}</span>
                  <span className="text-[11px] font-black text-emerald-500">{isPrivate ? '••' : '+' + Math.round(d.Entrate)}</span>
                  <span className="text-[11px] font-black text-rose-500">{isPrivate ? '••' : '-' + Math.round(d.Uscite)}</span>
                  <span className={cn("text-[10px] font-black border-t border-slate-100 dark:border-white/5 pt-1", d.Saldo >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {isPrivate ? '••' : (d.Saldo >= 0 ? '+' : '') + Math.round(d.Saldo)}
                  </span>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-50 dark:border-white/5 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4 px-1">
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Trend 6 Mesi</h3>
                  <p className="text-[13px] font-black text-slate-700 dark:text-slate-200 mt-0.5">Entrate vs Uscite</p>
                </div>
                <motion.div animate={{ rotate: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="w-9 h-9 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                  <Flame size={18} fill="currentColor" strokeWidth={0} />
                </motion.div>
              </div>
              <div className="flex items-center justify-between mb-4 px-1">
                <div>
                  <div className="text-[11px] text-slate-400 font-black uppercase tracking-widest">Saldo {format(filters.date, 'MMM', { locale: it })}</div>
                  <div className={cn("text-[28px] font-black tracking-tight", trendData[5].Saldo >= 0 ? "text-emerald-500" : "text-rose-500")}>
                    {isPrivate ? '••••' : (trendData[5].Saldo >= 0 ? '+' : '') + formatCurrency(trendData[5].Saldo)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-emerald-500 font-black">{isPrivate ? '••' : '↑ ' + formatCurrency(trendData[5].Entrate)}</div>
                  <div className="text-[11px] text-rose-500 font-black mt-1">{isPrivate ? '••' : '↓ ' + formatCurrency(trendData[5].Uscite)}</div>
                </div>
              </div>
              <div className="h-[100px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 9, fontWeight: 900 }} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Saldo" stroke="#1D9E75" strokeWidth={2.5} fill="url(#sparkGrad)" dot={{ fill: '#1D9E75', r: 4, strokeWidth: 0 }} activeDot={{ r: 8, fill: '#1D9E75', strokeWidth: 3, stroke: '#fff' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* T5-C: grafico 12 mesi — barre affiancate + linea Saldo */}
            <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-50 dark:border-white/5 shadow-sm p-5 mx-2">
              <div className="flex items-center justify-between mb-4 px-1">
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">12 Mesi</h3>
                  <p className="text-[13px] font-black text-slate-700 dark:text-slate-200 mt-0.5">Entrate vs Uscite</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Entrate</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />Uscite</span>
                  <span className="flex items-center gap-1"><span className="w-4 border-t-2 border-dashed border-amber-400 inline-block" />Saldo</span>
                </div>
              </div>
              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trend12Data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 7, fontWeight: 900 }} interval={1} />
                    <YAxis hide />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-2xl shadow-xl border border-slate-100 dark:border-white/10 text-[10px]">
                            <p className="font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
                            {payload.map((p: any, i: number) => (
                              <p key={i} className="font-bold" style={{ color: p.color || p.fill }}>{p.name}: {isPrivate ? '••••' : formatCurrency(p.value)}</p>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="Entrate" fill="#1D9E75" radius={[2, 2, 0, 0]} barSize={7} opacity={0.85} />
                    <Bar dataKey="Uscite"  fill="#E24B4A" radius={[2, 2, 0, 0]} barSize={7} opacity={0.85} />
                    <Line type="monotone" dataKey="Saldo" stroke="#F59E0B" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {/* CATEGORIE */}
        {activeSection === 'categorie' && filteredTransactions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-50 dark:border-white/5 shadow-sm p-6 mx-2">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Dettaglio Categorie</h3>
                <PieChartIcon size={14} className="text-slate-300" />
              </div>
              {periodStats.categoryBreakdown.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Totale Spese</span>
                    <span className="text-[16px] font-black text-rose-500">{val(periodStats.expense)}</span>
                  </div>
                  <div className="space-y-3 mt-4">
                    {periodStats.categoryBreakdown.map((item, i) => (
                      <div key={i} className="flex flex-col gap-1.5">
                        <div className="flex flex-col items-center mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 flex items-center justify-center floating-emoji">
                              <CategoryIcon name={item.emoji || 'Package'} size={20} color={item.color} />
                            </div>
                            <span className="text-[11px] font-black text-slate-700 dark:text-slate-100">{item.category}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400">{pct(item.percentage)}</span>
                            <span className="text-[11px] font-black text-slate-900 dark:text-slate-100">{val(item.amount)}</span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${item.percentage}%` }} transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.05 }} className="h-full rounded-full" style={{ backgroundColor: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="min-h-[200px] flex flex-col items-center justify-center text-center p-10">
                  <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-[40px] flex items-center justify-center text-slate-200 dark:text-slate-700 mb-6 border border-slate-100 dark:border-white/5 shadow-inner">
                    <PieChartIcon size={40} strokeWidth={1} />
                  </div>
                  <p className="text-[13px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest leading-relaxed">Nessun dato<br/>per questo periodo</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
});

GraficiTab.displayName = 'GraficiTab';
export default GraficiTab;
