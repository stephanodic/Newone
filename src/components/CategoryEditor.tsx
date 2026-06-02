import { CategoryIcon } from "./CategoryIcon";
import React, { useState, memo } from 'react';
import { haptic } from '@/lib/haptic';
import { validateCategoryName, validateMonthlyLimit, LIMITS } from '@/lib/validate';
import { motion } from 'motion/react';
import {
  X,
  Check,
  Target,
} from 'lucide-react';
import { Category, TransactionType } from '../types';
import { cn } from '../lib/utils';
import { EMOJIS, PASTEL_PALETTE } from "../utils/constants";
import { toast } from 'sonner';

interface CategoryEditorProps {
  category?: Category;
  onClose: () => void;
  onSave: (cat: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const CategoryEditor = memo(({ category, onClose, onSave, onDelete }: CategoryEditorProps) => {
  const [name, setName] = useState(category?.name || '');
  const [type, setType] = useState<TransactionType>(category?.type || 'EXPENSE');
  const [emoji, setEmoji] = useState(category?.emoji || '🛒');
  const [selectedColor, setSelectedColor] = useState(category?.color || PASTEL_PALETTE[0].border);
  const [monthlyLimit, setMonthlyLimit] = useState<string>(category?.monthlyLimit?.toString() || '');

  const [isSaving, setIsSaving] = useState(false);
  const nameError = validateCategoryName(name);
  const limitError = validateMonthlyLimit(monthlyLimit);

  const handleSave = async () => {
    if (nameError || limitError || isSaving) { haptic.warning(); return; }
    haptic.success();
    setIsSaving(true);
    try {
      await onSave({
        id: category?.id,
        name: name.trim(),
        type,
        emoji,
        color: selectedColor,
        tag: category?.tag ?? null,
        monthlyLimit: type === 'EXPENSE' && monthlyLimit ? parseFloat(monthlyLimit) : null,
      });
      // App.tsx handles closeModal()
    } catch (err) {
      console.error("handleSave error:", err);
      toast.error("Errore durante il salvataggio");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ y: '100dvh' }}
      animate={{ y: 0 }}
      exit={{ y: '100dvh' }}
      transition={{ type: 'spring', damping: 32, stiffness: 300, mass: 1 }}
      className="fixed inset-0 z-[9999] bg-white dark:bg-slate-900 flex flex-col h-screen transition-colors duration-500"
    >
      {/* 1. HEADER - Glassmorphism */}
      <div className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-800/70 px-6 py-2.5 flex items-center justify-between border-b border-white dark:border-white/5 shadow-sm transition-colors">
        <button onClick={() => { haptic.light?.(); onClose(); }} className="w-9 h-9 bg-slate-50 dark:bg-white/5 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 active:scale-90 transition-all shadow-sm">
          <X size={18} strokeWidth={2.5} />
        </button>
        <span className="text-[12px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-[0.15em] transition-colors translate-x-2">
          {category ? 'Modifica Categoria' : 'Nuova Categoria'}
        </span>
        <button 
          onClick={handleSave} 
          disabled={!!nameError || !!limitError || isSaving}
          className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 active:scale-90 transition-all disabled:opacity-30"
        >
          <Check size={18} strokeWidth={3} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-10 no-scrollbar space-y-5 pt-4">
        {/* A. NAME INPUT */}
        <div className="bg-white dark:bg-slate-800 rounded-[20px] border border-white dark:border-white/5 shadow-[0_2px_10px_rgb(0,0,0,0.01)] p-4 group focus-within:shadow-[0_8px_30px_rgba(16,185,129,0.05)] transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest transition-colors">NOME CATEGORIA</span>
            {name.length > LIMITS.CATEGORY_NAME_MAX * 0.8 && (
              <span className={cn("text-[10px] font-bold", name.length > LIMITS.CATEGORY_NAME_MAX ? "text-rose-500" : "text-slate-300 dark:text-slate-600")}>
                {name.length}/{LIMITS.CATEGORY_NAME_MAX}
              </span>
            )}
          </div>
          <input
            type="text"
            placeholder="Es. Palestra, Affitto..."
            value={name}
            maxLength={LIMITS.CATEGORY_NAME_MAX + 1}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-base font-black text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent transition-colors"
          />
          {nameError && name.length > 0 && (
            <span className="text-[10px] font-bold text-rose-500 mt-1 block">{nameError}</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* B. ICON PICKER - Compact */}
          <div className="bg-white dark:bg-slate-800 rounded-[20px] border border-white dark:border-white/5 shadow-[0_2px_10px_rgb(0,0,0,0.01)] p-4 transition-colors flex flex-col justify-between">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block transition-colors mb-2">ICONA SELEZIONATA</span>
            <div className="flex-1 flex items-center justify-center">
              <div 
                className="w-14 h-14 bg-white dark:bg-slate-700 border-2 rounded-2xl flex items-center justify-center shadow-xl transition-all scale-110"
                style={{ borderColor: selectedColor }}
              >
                <CategoryIcon name={emoji} size={28} color={selectedColor} />
              </div>
            </div>
          </div>

          {/* C. COLOR PICKER - Mini */}
          <div className="bg-white dark:bg-slate-800 rounded-[20px] border border-white dark:border-white/5 shadow-[0_2px_10px_rgb(0,0,0,0.01)] p-4 transition-colors">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-3 block transition-colors">COLORE</span>
            <div className="grid grid-cols-3 gap-3 px-1">
              {PASTEL_PALETTE.slice(0, 6).map(cp => (
                <button
                  key={cp.name}
                  onClick={() => { haptic.light?.(); setSelectedColor(cp.border); }}
                  className="flex items-center justify-center relative active:scale-90 transition-all"
                >
                  <div 
                    className={cn(
                      "w-7 h-7 rounded-full transition-all duration-300 shadow-sm",
                      selectedColor === cp.border ? "scale-110 shadow-md ring-2 ring-emerald-500/20" : "opacity-80"
                    )}
                    style={{ backgroundColor: cp.border }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ALL EMOJIS (Secondary scroll if needed) */}
        <div className="bg-white dark:bg-slate-800 rounded-[20px] border border-white dark:border-white/5 shadow-[0_2px_10px_rgb(0,0,0,0.01)] p-4 transition-colors">
          <div className="grid grid-cols-10 gap-1.5 h-20 overflow-y-auto no-scrollbar">
            {EMOJIS.map(e => (
              <button 
                key={e}
                onClick={() => setEmoji(e)}
                className={cn(
                  "text-base h-7 flex items-center justify-center rounded-lg transition-all duration-300 active:scale-75",
                  emoji === e ? "text-white" : "hover:bg-slate-100 dark:hover:bg-white/5"
                )}
                style={emoji === e ? { backgroundColor: selectedColor } : {}}
              >
                <CategoryIcon name={e} size={16} color={emoji === e ? "white" : selectedColor} />
              </button>
            ))}
          </div>
        </div>

        {/* D. TYPE TOGGLE */}
        <div className="bg-white dark:bg-slate-800 rounded-[20px] border border-white dark:border-white/5 shadow-[0_2px_10px_rgb(0,0,0,0.01)] p-4 transition-colors">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-3 block transition-colors">TIPO TRANSAZIONE</span>
          <div className="flex bg-slate-50/50 dark:bg-white/5 p-1 rounded-[16px] gap-1 transition-colors">
            <button
              onClick={() => { haptic.light?.(); setType('EXPENSE'); }}
              className={cn(
                "flex-1 py-3 rounded-[12px] text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                type === 'EXPENSE' ? "bg-white dark:bg-slate-700 text-rose-500 shadow-sm" : "text-slate-400 dark:text-slate-400"
              )}
            >
              Uscita
            </button>
            <button
              onClick={() => { haptic.light?.(); setType('INCOME'); }}
              className={cn(
                "flex-1 py-3 rounded-[12px] text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                type === 'INCOME' ? "bg-white dark:bg-slate-700 text-emerald-500 shadow-sm" : "text-slate-400 dark:text-slate-400"
              )}
            >
              Entrata
            </button>
          </div>
        </div>

        {/* E. BUDGET MENSILE — solo per uscite */}
        {type === 'EXPENSE' && (
          <div className="bg-white dark:bg-slate-800 rounded-[20px] border border-white dark:border-white/5 shadow-[0_2px_10px_rgb(0,0,0,0.01)] p-4 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Target size={11} strokeWidth={2.5} className="text-amber-500" />
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest transition-colors">Budget mensile</span>
              </div>
              {monthlyLimit ? (
                <button
                  onClick={() => { haptic.light?.(); setMonthlyLimit(''); }}
                  className="text-[10px] font-black text-rose-400 uppercase tracking-wider active:scale-90 transition-all"
                >
                  Rimuovi
                </button>
              ) : (
                <span className="text-[10px] text-slate-300 dark:text-slate-600">opzionale</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                inputMode="decimal"
                placeholder="Es. 300"
                value={monthlyLimit}
                min={0}
                max={LIMITS.MONTHLY_LIMIT_MAX}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                className="flex-1 text-base font-black text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 bg-transparent transition-colors"
              />
              <span className="text-[13px] font-black text-slate-300 dark:text-slate-600">€ / mese</span>
            </div>
            {limitError && monthlyLimit.length > 0 && (
              <span className="text-[10px] font-bold text-rose-500 mt-1 block">{limitError}</span>
            )}
            {monthlyLimit && !limitError && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 leading-tight">
                Vedrai una barra colorata sotto l'icona sulla Dashboard quando ti avvicini al limite.
              </p>
            )}
          </div>
        )}

        {category && onDelete && (
          <button
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              haptic.heavy?.();
              try {
                await onDelete(category.id);
                onClose();
              } catch (err) {
                console.error("Delete category from editor failed:", err);
                toast.error("Errore durante l'eliminazione");
              }
            }}
            className="w-full py-3.5 text-rose-500 font-black text-[10px] uppercase tracking-widest bg-rose-50 dark:bg-rose-500/10 rounded-[16px] active:scale-95 transition-all mt-2"
          >
            Elimina Categoria
          </button>
        )}

        {/* SAVE BUTTON IN FLOW */}
        <div className="pt-2 pb-10">
          <button 
            onClick={handleSave} 
            disabled={!!nameError || !!limitError || isSaving}
            className={cn(
              "w-full py-4 bg-gradient-to-br from-[#1D9E75] to-[#11cc98] text-white font-black text-[12px] uppercase tracking-[0.2em] rounded-[22px] disabled:opacity-30 active:scale-95 transition-all shadow-xl shadow-emerald-500/20 border border-white/10",
              isSaving && "animate-pulse"
            )}
          >
            {isSaving ? (category ? 'Aggiornamento...' : 'Creazione...') : (category ? 'Aggiorna Categoria' : 'Crea Categoria')}
          </button>
        </div>
      </div>
    </motion.div>
  );
});

CategoryEditor.displayName = 'CategoryEditor';
export default CategoryEditor;
