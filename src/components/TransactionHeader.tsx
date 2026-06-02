import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { TransactionType } from '../types';
import { headerGradient } from '../lib/theme';
import { cn } from '../lib/utils';

type Step = 'categories' | 'calculator';

interface TransactionHeaderProps {
  step: Step;
  type: TransactionType;
  selectedCatName?: string;
  onBack: () => void;
  onClose: () => void;
  onSwitchType: (t: TransactionType) => void;
}

export default function TransactionHeader({
  step, type, selectedCatName, onBack, onClose, onSwitchType,
}: TransactionHeaderProps) {
  return (
    <div className="px-4 pt-4 pb-3 shrink-0" style={headerGradient}>
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-white/80 active:scale-90 transition-all min-w-[60px]"
        >
          <ChevronLeft size={16} strokeWidth={3} />
          <span className="text-[10px] font-black uppercase tracking-widest">
            {step === 'calculator' ? 'Categorie' : 'Annulla'}
          </span>
        </button>

        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5">
            <img src="/logo.png" alt="MoneyTrack" className="h-7 w-7 rounded-lg object-cover shadow-sm" />
            <span className="text-[17px] font-black text-white tracking-tight">MoneyTrack</span>
          </div>
          <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">
            {step === 'categories'
              ? (type === 'EXPENSE' ? 'Nuova spesa' : 'Nuova entrata')
              : (selectedCatName ?? 'Importo')}
          </span>
        </div>

        <div className="min-w-[60px] flex justify-end">
          <button
            onClick={onClose}
            className="w-9 h-9 bg-black/20 rounded-full flex items-center justify-center text-white active:scale-90 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="flex bg-black/20 rounded-xl p-[3px] gap-[3px]">
        {(['EXPENSE', 'INCOME'] as TransactionType[]).map(t => (
          <button key={t} onClick={() => onSwitchType(t)}
            className={cn(
              'flex-1 py-2 rounded-[9px] text-[10px] font-black uppercase tracking-widest transition-all',
              type === t ? 'bg-white text-[#1D9E75] shadow-sm' : 'text-white/70'
            )}>
            {t === 'EXPENSE' ? 'Spese' : 'Entrate'}
          </button>
        ))}
      </div>
    </div>
  );
}
