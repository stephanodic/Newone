import { CategoryIcon } from "./CategoryIcon";
import React, { memo, useState, useRef } from 'react';
import { haptic } from '@/lib/haptic';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Pencil, 
  Trash2, 
  Calendar, 
  Tag, 
  FileText, 
  CreditCard,
  Check,
  X,
  Repeat
} from 'lucide-react';
import { Transaction, Category } from '../types';
import { formatCurrency, cn, resolveCategory } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import CalendarDropdown from './CalendarDropdown';

interface TransactionDetailProps {
  transaction: Transaction;
  categories: Category[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: (mode: 'single' | 'future' | 'all') => Promise<void>;
  onUpdate?: (id: string, updates: Partial<Transaction>) => Promise<void>;
  transactions?: Transaction[];
  navDirection?: 'left' | 'right';
  onNavigateTo?: (id: string, dir: 'left' | 'right') => void;
}

const TransactionDetail = memo(({ transaction, categories, onBack, onEdit, onDelete, onUpdate, transactions = [], navDirection = 'right', onNavigateTo }: TransactionDetailProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingField, setEditingField] = useState<'amount' | 'note' | 'category' | 'date' | null>(null);

  // Swipe navigation
  const touchStartX = useRef<number | null>(null);
  const currentIdx = transactions.findIndex(t => t.id === transaction.id);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < transactions.length - 1;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || editingField || showDeleteModal) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) < 60) return;
    haptic.light();
    if (dx < 0 && hasNext) onNavigateTo?.(transactions[currentIdx + 1].id, 'left');
    if (dx > 0 && hasPrev) onNavigateTo?.(transactions[currentIdx - 1].id, 'right');
    touchStartX.current = null;
  };
  const [editAmount, setEditAmount] = useState(transaction.amount.toString());
  const [editNote, setEditNote] = useState(transaction.note || '');
  const [editCategory, setEditCategory] = useState(transaction.category);
  const [editDate, setEditDate] = useState(parseISO(transaction.date));
  const [showCalendar, setShowCalendar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRecurrence, setEditingRecurrence] = useState(false);

  // resolveCategory handles both new ID-based and legacy name-based category references
  const category = resolveCategory(transaction.category, categories);
  const currentEditCategory = resolveCategory(editCategory, categories) ?? category;

  const cleanNote = (note: string) => note.replace(/[^\x20-\x7E\u00C0-\u024F\u20AC]/g, '').trim();

  const saveField = async (field: string) => {
    haptic.warning();
    if (!onUpdate || isSaving) return;
    setIsSaving(true);
    try {
      let updates: Partial<Transaction> = {};
      if (field === 'amount') updates.amount = parseFloat(editAmount) || transaction.amount;
      if (field === 'note') updates.note = editNote;
      if (field === 'category') updates.category = editCategory;
      if (field === 'date') updates.date = editDate.toISOString();
      await onUpdate(transaction.id, updates);
    } finally {
      setIsSaving(false);
      setEditingField(null);
      setShowCalendar(false);
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setShowCalendar(false);
    setEditAmount(transaction.amount.toString());
    setEditNote(transaction.note || '');
    setEditCategory(transaction.category);
    setEditDate(parseISO(transaction.date));
  };

  return (
    <motion.div
      initial={{ x: navDirection === 'left' ? '100%' : '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: navDirection === 'left' ? '-100%' : '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-[9999] bg-[#F5F5F0] dark:bg-slate-900 flex flex-col h-screen p-4 font-sans relative overflow-hidden transition-colors duration-500"
    >
      <div className="absolute top-[-10%] right-[-10%] w-72 h-72 bg-[#11cc98]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-[#ff5f5e]/5 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER */}
      <div className="flex items-center justify-between backdrop-blur-md bg-white/70 dark:bg-slate-800/70 px-4 h-14 rounded-2xl border border-white dark:border-white/5 shadow-lg shadow-slate-900/5 z-50 transition-colors">
        <button onClick={() => { haptic.light?.(); onBack(); }} className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black active:scale-95 transition-all outline-none">
          <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm">
            <ChevronLeft size={18} strokeWidth={3.5} />
          </div>
          <span className="text-[11px] uppercase tracking-widest pt-0.5">Torna</span>
        </button>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] italic transition-colors">Dettaglio</span>
          {transactions.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className={cn("text-[10px]", hasPrev ? "text-slate-400" : "text-slate-200 dark:text-slate-700")}>‹</span>
              <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600">{currentIdx + 1}/{transactions.length}</span>
              <span className={cn("text-[10px]", hasNext ? "text-slate-400" : "text-slate-200 dark:text-slate-700")}>›</span>
            </div>
          )}
        </div>
        <div className="w-10 h-10" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pt-4 pb-40">
        {/* CARD PRINCIPALE */}
        <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-white dark:border-white/5 shadow-[0_15px_50px_rgba(0,0,0,0.03)] p-4 flex flex-col items-center mb-4 relative overflow-hidden transition-colors">
          <div className="absolute top-0 left-0 w-32 h-32 bg-slate-50 dark:bg-slate-700 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 opacity-50" />
          
          <div className="w-12 h-12 bg-white dark:bg-slate-700 border-4 border-[#1D9E75] rounded-[18px] flex items-center justify-center mb-2 shadow-xl z-10">
            <CategoryIcon name={currentEditCategory?.emoji || "Package"} size={30} color={currentEditCategory?.color} />
          </div>
          <h3 className="text-[18px] font-black text-slate-900 dark:text-slate-100 mb-1 tracking-tight z-10">{currentEditCategory?.name || 'Altro'}</h3>
          
          {/* IMPORTO editabile */}
          {editingField === 'amount' ? (
            <div className="flex items-center gap-2 z-10">
              <input
                type="number"
                value={editAmount}
                onChange={e => setEditAmount(e.target.value)}
                className="text-[26px] font-black text-center w-36 bg-transparent border-b-2 border-emerald-500 outline-none text-rose-500"
                autoFocus
              />
              <button onClick={() => saveField('amount')} className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center"><Check size={14} color="white" strokeWidth={3} /></button>
              <button onClick={cancelEdit} className="w-10 h-10 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center"><X size={14} strokeWidth={3} /></button>
            </div>
          ) : (
            <button onClick={() => { haptic.light?.(); setEditingField('amount'); }} className="z-10">
              <span className={cn("text-[26px] font-black mb-1 tracking-tighter transition-all", transaction.type === 'INCOME' ? "text-emerald-500" : "text-rose-500")}>
                {formatCurrency(parseFloat(editAmount) || transaction.amount)}
              </span>
              <Pencil size={12} className="inline ml-1 text-slate-300 dark:text-slate-600" />
            </button>
          )}

          <span className="text-[10px] text-slate-300 dark:text-slate-500 font-black uppercase tracking-[0.15em] z-10">
            {format(editDate, 'EEEE, d MMMM yyyy', { locale: it })}
          </span>
        </div>

        {/* INFO ROWS editabili */}
        <div className="bg-white dark:bg-slate-800 rounded-[24px] border border-white dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] px-5 overflow-visible mb-6 transition-colors">
          
          {/* DATA */}
          <div className="flex items-center justify-between py-4 border-b border-slate-50 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 shadow-sm">
                <Calendar size={18} strokeWidth={2.5} />
              </div>
              <span className="text-[14px] font-black text-slate-900 dark:text-slate-100 tracking-tight">Data</span>
            </div>
            {editingField === 'date' ? (
              <div className="flex items-center gap-2 relative">
                <button onClick={() => setShowCalendar(!showCalendar)} className="text-[12px] font-black text-emerald-500 border-b border-emerald-500">
                  {format(editDate, 'dd/MM/yyyy')}
                </button>
                <button onClick={() => saveField('date')} className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center"><Check size={12} color="white" strokeWidth={3} /></button>
                <button onClick={cancelEdit} className="w-7 h-7 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center"><X size={12} strokeWidth={3} /></button>
                <div className="absolute right-0 top-10 z-50">
                  <CalendarDropdown isOpen={showCalendar} selectedDate={editDate} onSelectDate={(d) => { setEditDate(d); setShowCalendar(false); }} onGoToToday={() => { setEditDate(new Date()); setShowCalendar(false); }} onClose={() => setShowCalendar(false)} />
                </div>
              </div>
            ) : (
              <button onClick={() => { haptic.light?.(); setEditingField('date'); }} className="flex items-center gap-1">
                <span className="text-[12px] text-slate-400 font-black tracking-widest uppercase">{format(editDate, 'dd/MM/yyyy')}</span>
                <Pencil size={11} className="text-slate-300 dark:text-slate-600" />
              </button>
            )}
          </div>

          {/* CATEGORIA */}
          <div className="py-4 border-b border-slate-50 dark:border-white/5">
            {editingField !== 'category' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm">
                    <Tag size={18} strokeWidth={2.5} />
                  </div>
                  <span className="text-[14px] font-black text-slate-900 dark:text-slate-100 tracking-tight">Categoria</span>
                </div>
                <button onClick={() => { haptic.light?.(); setEditingField('category'); }} className="flex items-center gap-1">
                  <span className="text-[12px] text-slate-400 font-black tracking-widest uppercase">{currentEditCategory?.name ?? editCategory}</span>
                  <Pencil size={11} className="text-slate-300 dark:text-slate-600" />
                </button>
              </div>
            )}
            {editingField === 'category' && (
              <div className="flex flex-col gap-2 w-full mt-2">
                <div className="grid grid-cols-4 gap-2">
                  {categories.filter(cat => cat.type === transaction.type).map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setEditCategory(cat.id); saveField('category'); }}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${editCategory === cat.id || editCategory === cat.name ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-transparent bg-slate-50 dark:bg-slate-700'}`}
                    >
                      <CategoryIcon name={cat.emoji || 'Package'} size={22} color={cat.color} />
                      <span className="text-[10px] font-black text-slate-500 truncate w-full text-center">{cat.name}</span>
                    </button>
                  ))}
                </div>
                <button onClick={cancelEdit} className="text-[11px] text-slate-400 font-black uppercase tracking-widest mt-1">Annulla</button>
              </div>
            )}
          </div>

          {/* NOTE */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-lime-50 dark:bg-lime-500/10 text-lime-600 dark:text-lime-400 shadow-sm">
                <FileText size={18} strokeWidth={2.5} />
              </div>
              <span className="text-[14px] font-black text-slate-900 dark:text-slate-100 tracking-tight">Note</span>
            </div>
            {editingField === 'note' ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  className="text-[12px] font-black bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1 outline-none w-32"
                  autoFocus
                />
                <button onClick={() => saveField('note')} className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center"><Check size={12} color="white" strokeWidth={3} /></button>
                <button onClick={cancelEdit} className="w-7 h-7 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center"><X size={12} strokeWidth={3} /></button>
              </div>
            ) : (
              <button onClick={() => { haptic.light?.(); setEditingField('note'); }} className="flex items-center gap-1">
                <span className="text-[12px] text-slate-400 font-black tracking-widest uppercase">{cleanNote(editNote) || '—'}</span>
                <Pencil size={11} className="text-slate-300 dark:text-slate-600" />
              </button>
            )}
          </div>
          <div className="py-4 border-t border-slate-50 dark:border-white/5">
            {!editingRecurrence ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 shadow-sm">
                    <Repeat size={18} strokeWidth={2.5} />
                  </div>
                  <span className="text-[14px] font-black text-slate-900 dark:text-slate-100 tracking-tight">Ricorrenza</span>
                </div>
                <button onClick={() => setEditingRecurrence(true)} className="flex items-center gap-1">
                  <span className="text-[12px] text-slate-400 font-black tracking-widest uppercase">
                    {!transaction.isRecurring ? 'Nessuna' :
                      transaction.recurrenceInterval === 'DAILY' ? 'Ogni giorno' :
                      transaction.recurrenceInterval === 'WEEKLY' ? 'Ogni sett.' :
                      transaction.recurrenceInterval === 'BIMONTHLY' ? 'Ogni 2 mesi' : 'Ogni mese'}
                  </span>
                  <Pencil size={11} className="text-slate-300 dark:text-slate-600" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-1.5">
                  {(['WEEKLY','MONTHLY','BIMONTHLY','DAILY'] as const).map(interval => (
                    <button key={interval} onClick={async () => { await onUpdate?.(transaction.id, { isRecurring: true, recurrenceInterval: interval }); setEditingRecurrence(false); }}
                      className={`py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${transaction.recurrenceInterval === interval && transaction.isRecurring ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                      {interval === 'DAILY' ? 'Ogni giorno' : interval === 'WEEKLY' ? 'Ogni sett.' : interval === 'MONTHLY' ? 'Ogni mese' : 'Ogni 2 mesi'}
                    </button>
                  ))}
                </div>
                {transaction.isRecurring && (
                  <button onClick={async () => { await onUpdate?.(transaction.id, { isRecurring: false, recurrenceInterval: 'NONE' }); setEditingRecurrence(false); }}
                    className="py-2.5 rounded-xl font-black text-[12px] uppercase tracking-widest bg-rose-50 text-rose-500 border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 mt-1">
                    Rimuovi ricorrenza
                  </button>
                )}
                <button onClick={() => setEditingRecurrence(false)} className="text-[11px] text-slate-400 font-black uppercase tracking-widest mt-1">Annulla</button>
              </div>
            )}
          </div>
        </div>

        {/* ELIMINA */}
        <div className="flex flex-col gap-3 py-2 pb-4">
          <button
            onClick={() => { haptic.warning?.(); setShowDeleteModal(true); }}
            className="w-full py-4 bg-gradient-to-r from-rose-500 to-red-500 rounded-[22px] text-[12px] font-black text-white uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl shadow-rose-200/10 flex items-center justify-center gap-3"
          >
            <Trash2 size={18} strokeWidth={3} />
            Elimina
          </button>
        </div>
      </div>

      {/* DELETE MODAL */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[10000] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full bg-white dark:bg-slate-800 rounded-t-[32px] shadow-2xl z-10 px-6 pt-3 pb-[max(6rem,env(safe-area-inset-bottom))]">
              <div className="flex justify-center mb-6"><div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full" /></div>
              <div className="w-14 h-14 bg-rose-50 dark:bg-rose-500/10 rounded-[18px] flex items-center justify-center mx-auto mb-4"><Trash2 size={24} className="text-rose-500" strokeWidth={2} /></div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 text-center tracking-tight mb-2">Elimina transazione</h3>
              {transaction.isRecurring ? (
                <>
                  <p className="text-sm text-slate-400 font-medium text-center mb-6">È una transazione ricorrente. Come vuoi procedere?</p>
                  <div className="space-y-2 mb-4">
                    <button onClick={() => { haptic.heavy?.(); onDelete('single'); setShowDeleteModal(false); }} className="w-full py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black rounded-2xl active:scale-95 transition-all text-sm text-left px-4"><span className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Solo questa</span>Elimina solo questa occorrenza</button>
                    <button onClick={() => { haptic.heavy?.(); onDelete('future'); setShowDeleteModal(false); }} className="w-full py-3.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-black rounded-2xl active:scale-95 transition-all text-sm text-left px-4 border border-amber-100 dark:border-amber-500/20"><span className="block text-[11px] font-black uppercase tracking-widest text-amber-400 mb-0.5">Questa e future</span>Elimina da oggi in poi</button>
                    <button onClick={() => { haptic.heavy?.(); onDelete('all'); setShowDeleteModal(false); }} className="w-full py-3.5 bg-rose-500 text-white font-black rounded-2xl active:scale-95 transition-all text-sm text-left px-4 shadow-lg shadow-rose-200"><span className="block text-[11px] font-black uppercase tracking-widest text-rose-200 mb-0.5">Tutta la serie</span>Elimina il template e tutte le occorrenze</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-400 font-medium text-center mb-6">Questa azione è <span className="text-rose-500 font-black">irreversibile</span>.</p>
                  <div className="flex gap-3">
                    <button onClick={() => { haptic.light?.(); setShowDeleteModal(false); }} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black rounded-2xl active:scale-95 transition-all text-sm">Annulla</button>
                    <button onClick={() => { haptic.heavy?.(); onDelete('single'); setShowDeleteModal(false); }} className="flex-1 py-4 bg-rose-500 text-white font-black rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-all text-sm">Elimina</button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

TransactionDetail.displayName = 'TransactionDetail';
export default TransactionDetail;
