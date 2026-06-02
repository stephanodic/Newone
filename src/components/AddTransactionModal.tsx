import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Category, TransactionType, RecurrenceInterval } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { Check } from 'lucide-react';
import TransactionHeader from './TransactionHeader';
import TransactionCategoryPicker from './TransactionCategoryPicker';
import TransactionNoteDate from './TransactionNoteDate';
import TransactionNumpad from './TransactionNumpad';
import { formatCurrency } from '../lib/utils';
import { haptic } from '@/lib/haptic';
import { toast } from 'sonner';

/* ─── types ──────────────────────────────────────────────────────────────────── */
type Step = 'categories' | 'calculator';
type Op   = '+' | '-' | '×' | '÷';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  stats: import('../types').StatsResult;
  user: import('firebase/auth').User;
  initialType?: TransactionType;
  initialCategoryId?: string;
  initialDate?: string;
  initialAmount?: number;
  initialNote?: string;
  navigate: (tab: string) => void;
  suggestedTags?: string[];
  onSubmit: (data: {
    amount: number;
    type: TransactionType;
    category: string;
    note: string;
    date: string;
    isRecurring: boolean;
    recurrenceInterval: RecurrenceInterval;
    tags: string[];
  }) => Promise<void>;
}

/* ─── eval helper ────────────────────────────────────────────────────────────── */
function evalOp(a: number, op: Op, b: number): number {
  if (op === '+') return a + b;
  if (op === '-') return a - b;
  if (op === '×') return a * b;
  if (op === '÷') return b !== 0 ? a / b : a;
  return b;
}

/* ─── main component ─────────────────────────────────────────────────────────── */
export default function AddTransactionModal({
  isOpen, onClose, categories,
  initialType, initialCategoryId, initialDate,
  initialAmount, initialNote, suggestedTags = [], onSubmit,
}: AddTransactionModalProps) {

  /* step */
  const [step, setStep]           = useState<Step>('categories');
  const [type, setType]           = useState<TransactionType>(initialType ?? 'EXPENSE');
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);

  /* calculator */
  const [display, setDisplay]     = useState('0');
  const [prevVal, setPrevVal]     = useState<number | null>(null);
  const [op, setOp]               = useState<Op | null>(null);
  const [resetNext, setResetNext] = useState(false);
  const [note, setNote]           = useState('');
  const [date, setDate]           = useState(new Date());
  const [saving, setSaving]       = useState(false);
  const [saved,  setSaved]        = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>('MONTHLY');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  /* ── sync when modal opens ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    const t = initialType ?? 'EXPENSE';
    setType(t);
    setNote(initialNote ?? '');
    setDate(initialDate ? new Date(initialDate) : new Date());
    setDisplay(initialAmount != null ? String(initialAmount) : '0');
    setPrevVal(null);
    setOp(null);
    setResetNext(false);
    setSaving(false);
    setIsRecurring(false);
    setRecurrenceInterval('MONTHLY');
    setSaved(false);
    setTags([]);
    setTagInput('');

    if (initialCategoryId) {
      const cat = categories.find(c => c.id === initialCategoryId || c.name === initialCategoryId);
      if (cat) { setSelectedCat(cat); setType(cat.type); setStep('calculator'); return; }
    }
    setSelectedCat(null);
    setStep('categories');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /* ── derived ───────────────────────────────────────────────────────────────── */
  const typeCats  = useMemo(() => categories.filter(c => c.type === type), [categories, type]);
  const stripCats = useMemo(() => typeCats.slice(0, 8), [typeCats]);

  const formattedDisplay = useMemo(() => {
    const [intPart, decPart] = display.split('.');
    const intStr = Number(intPart).toLocaleString('it-IT');
    return decPart !== undefined ? `${intStr},${decPart}` : intStr;
  }, [display]);

  const amountVal = useMemo(() => parseFloat(display) || 0, [display]);

  /* ── digit handlers ────────────────────────────────────────────────────────── */
  const pressDigit = useCallback((d: string) => {
    haptic.light();
    setDisplay(prev => {
      if (resetNext || prev === '0') { setResetNext(false); return d; }
      if (prev.replace('.', '').length >= 9) return prev;
      return prev + d;
    });
  }, [resetNext]);

  const pressDot = useCallback(() => {
    haptic.light();
    setDisplay(prev => {
      if (resetNext) { setResetNext(false); return '0.'; }
      return prev.includes('.') ? prev : prev + '.';
    });
  }, [resetNext]);

  const pressBack = useCallback(() => {
    haptic.light();
    setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    setResetNext(false);
  }, []);

  const pressOp = useCallback((newOp: Op) => {
    haptic.medium();
    const cur = parseFloat(display) || 0;
    if (op && prevVal !== null && !resetNext) {
      const res = evalOp(prevVal, op, cur);
      const str = Number.isInteger(res) ? String(res) : res.toFixed(2);
      setDisplay(str);
      setPrevVal(res);
    } else {
      setPrevVal(cur);
    }
    setOp(newOp);
    setResetNext(true);
  }, [display, op, prevVal, resetNext]);

  const pressEquals = useCallback(async () => {
    if (saving || !selectedCat) return;
    let final = parseFloat(display) || 0;
    if (op && prevVal !== null && !resetNext) final = evalOp(prevVal, op, parseFloat(display) || 0);
    final = Math.round(final * 100) / 100;
    if (final <= 0) { haptic.warning(); return; }
    haptic.success();
    setSaving(true);
    try {
      const finalTags = tagInput.trim() ? [...tags, tagInput.trim().toLowerCase()] : tags;
      await onSubmit({ amount: final, type, category: selectedCat.id, note: note.trim(), date: date.toISOString(), isRecurring, recurrenceInterval: isRecurring ? recurrenceInterval : 'NONE', tags: finalTags });
      // ── Budget alert — calcolato ora, mostrato dopo il checkmark ────────────
      let budgetAlert: { level: 'error' | 'warning'; name: string; pct: number } | null = null;
      if (type === 'EXPENSE' && selectedCat.monthlyLimit && selectedCat.monthlyLimit > 0) {
        const currentSpent = stats.categoryBreakdown.find(b => b.category === selectedCat.name)?.amount ?? 0;
        const newSpent = currentSpent + final;
        const ratio = newSpent / selectedCat.monthlyLimit;
        if (ratio >= 1)   budgetAlert = { level: 'error',   name: selectedCat.name, pct: Math.round(ratio * 100) };
        else if (ratio >= 0.8) budgetAlert = { level: 'warning', name: selectedCat.name, pct: Math.round(ratio * 100) };
      }
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
        if (budgetAlert) {
          if (budgetAlert.level === 'error') {
            haptic.heavy?.();
            toast.error(`🔴 Budget superato per ${budgetAlert.name}!`, { duration: 4000 });
          } else {
            haptic.warning?.();
            toast.warning(`⚠️ Hai usato l'${budgetAlert.pct}% del budget di ${budgetAlert.name}`, { duration: 3000 });
          }
        }
      }, 700);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }, [display, op, prevVal, resetNext, selectedCat, type, note, date, tags, tagInput, onSubmit, onClose, saving]);

  const addTag = useCallback((raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_àáèéìíòóùú]/g, '');
    if (!tag || tags.includes(tag)) { setTagInput(''); return; }
    setTags(prev => [...prev, tag]);
    setTagInput('');
  }, [tags]);

  /* ── segmented switch ──────────────────────────────────────────────────────── */
  const switchType = useCallback((t: TransactionType) => {
    if (t === type) return;
    haptic();
    setType(t);
    setSelectedCat(null);
    setStep('categories');
  }, [type]);

  /* ── category select ───────────────────────────────────────────────────────── */
  const pickCat = useCallback((cat: Category) => {
    haptic.medium();
    setSelectedCat(cat);
    setType(cat.type);
    setStep('calculator');
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* backdrop */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* sheet */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 300, mass: 1 }}
            className="fixed inset-0 z-[10000] w-full max-w-[430px] mx-auto flex flex-col overflow-hidden h-[100dvh] bg-[#F5F5F0] dark:bg-slate-900 transition-colors duration-500"
          >

            {/* ── HEADER ────────────────────────────────────────────────────── */}
            <TransactionHeader
              step={step}
              type={type}
              selectedCatName={selectedCat?.name}
              onBack={() => step === 'calculator' ? setStep('categories') : onClose()}
              onClose={onClose}
              onSwitchType={switchType}
            />

            {/* ── CONTENT (step-animated) ────────────────────────────────────── */}
            <AnimatePresence mode="wait" initial={false}>

              {/* ── STEP 1: GRIGLIA CATEGORIE ─────────────────────────────────── */}
              {step === 'categories' && (
                <motion.div key="cats"
                  initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                  className="flex-1 overflow-y-auto no-scrollbar px-4 pt-5 pb-32"
                >
                  <TransactionCategoryPicker
                    variant="full"
                    categories={typeCats}
                    selectedCatId={selectedCat?.id}
                    onPick={pickCat}
                  />
                </motion.div>
              )}

              {/* ── STEP 2: CALCOLATRICE ──────────────────────────────────────── */}
              {step === 'calculator' && (
                <motion.div key="calc"
                  initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  {/* ── CATEGORIA SELEZIONATA o STRIP 4×2 ──────────────────── */}
                  <div className="px-4 pt-3 pb-2 shrink-0 flex flex-col items-center">
                    {selectedCat ? (
                      /* Layout verticale centrato */
                      <button
                        onClick={() => setStep('categories')}
                        className="flex flex-col items-center gap-0.5 active:scale-95 transition-all"
                      >
                        <div className="w-16 h-16 flex items-center justify-center floating-emoji">
                          <CategoryIcon name={selectedCat.emoji || 'Package'} size={44} color={selectedCat.color} />
                        </div>
                        <span className="text-[14px] font-black mt-1" style={{ color: selectedCat.color }}>
                          {selectedCat.name.charAt(0).toUpperCase() + selectedCat.name.slice(1).toLowerCase()}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Cambia →
                        </span>
                      </button>
                    ) : (
                      <TransactionCategoryPicker
                        variant="strip"
                        categories={stripCats}
                        onPick={cat => { haptic(); setSelectedCat(cat); }}
                      />
                    )}
                  </div>

                  {/* ── IMPORTO + NOTA + RICORRENZA ─────────────────────────── */}
                  <TransactionNoteDate
                    type={type}
                    formattedDisplay={formattedDisplay}
                    op={op}
                    prevVal={prevVal}
                    note={note}
                    isRecurring={isRecurring}
                    recurrenceInterval={recurrenceInterval}
                    tags={tags}
                    tagInput={tagInput}
                    suggestedTags={suggestedTags}
                    onNoteChange={setNote}
                    onToggleRecurring={() => setIsRecurring(r => !r)}
                    onSetInterval={setRecurrenceInterval}
                    onTagInput={setTagInput}
                    onAddTag={addTag}
                    onRemoveTag={tag => setTags(t => t.filter(x => x !== tag))}
                    onRemoveLastTag={() => setTags(t => t.slice(0, -1))}
                  />

                  {/* ── NUMPAD 4×4 ──────────────────────────────────────────── */}
                  <TransactionNumpad
                    activeOp={op}
                    type={type}
                    saving={saving}
                    canSave={amountVal > 0 && !!selectedCat}
                    date={date}
                    onDigit={pressDigit}
                    onOp={pressOp}
                    onBack={pressBack}
                    onDot={pressDot}
                    onSave={pressEquals}
                    onSetToday={() => { haptic.light(); setDate(new Date()); }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── CHECKMARK OVERLAY ─────────────────────────────────────── */}
            <AnimatePresence>
              {saved && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[200] flex items-center justify-center pointer-events-none bg-white/90 dark:bg-slate-900/90"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="w-28 h-28 rounded-full flex items-center justify-center shadow-2xl"
                    style={{ background: '#1D9E75', boxShadow: '0 20px 60px rgba(29,158,117,0.35)' }}
                  >
                    <Check size={36} strokeWidth={3} color="white" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
