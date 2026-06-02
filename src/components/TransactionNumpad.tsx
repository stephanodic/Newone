import React from 'react';
import { TransactionType } from '../types';
import { cn } from '../lib/utils';
import { format, isToday } from 'date-fns';
import { it } from 'date-fns/locale';

type Op = '+' | '-' | '×' | '÷';

interface TransactionNumpadProps {
  activeOp: Op | null;
  type: TransactionType;
  saving: boolean;
  canSave: boolean;
  date: Date;
  onDigit: (d: string) => void;
  onOp: (o: Op) => void;
  onBack: () => void;
  onDot: () => void;
  onSave: () => void;
  onSetToday: () => void;
}

const digitStyle = 'bg-white dark:bg-slate-800 text-[20px] font-bold text-slate-800 dark:text-slate-100 shadow-sm border border-slate-100/50 dark:border-white/5';

export default function TransactionNumpad({
  activeOp, type, saving, canSave, date,
  onDigit, onOp, onBack, onDot, onSave, onSetToday,
}: TransactionNumpadProps) {

  const opStyle = (o: Op) => activeOp === o
    ? { className: 'text-white shadow-md', style: { background: 'var(--theme-primary, #1D9E75)' } as React.CSSProperties }
    : { className: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300', style: undefined };

  const K = (props: { onClick: () => void; className: string; style?: React.CSSProperties; children: React.ReactNode }) => (
    <button
      type="button"
      onPointerDown={e => { e.preventDefault(); props.onClick(); }}
      style={props.style}
      className={cn('flex items-center justify-center rounded-2xl active:scale-90 transition-all select-none touch-none', props.className)}
    >
      {props.children}
    </button>
  );

  return (
    <div className="px-3 pt-1 mt-auto" style={{ paddingBottom: 'calc(max(env(safe-area-inset-bottom), 22px) + 94px)' }}>
      <div className="grid grid-cols-4 gap-[5px]" style={{ gridTemplateRows: 'repeat(4, 56px)' }}>

        {/* row 1: 7 8 9 − */}
        <K onClick={() => onDigit('7')} className={digitStyle}>7</K>
        <K onClick={() => onDigit('8')} className={digitStyle}>8</K>
        <K onClick={() => onDigit('9')} className={digitStyle}>9</K>
        <K onClick={() => onOp('-')} className={cn('text-[22px] font-bold', opStyle('-').className)} style={opStyle('-').style}>−</K>

        {/* row 2: 4 5 6 + */}
        <K onClick={() => onDigit('4')} className={digitStyle}>4</K>
        <K onClick={() => onDigit('5')} className={digitStyle}>5</K>
        <K onClick={() => onDigit('6')} className={digitStyle}>6</K>
        <K onClick={() => onOp('+')} className={cn('text-[22px] font-bold', opStyle('+').className)} style={opStyle('+').style}>+</K>

        {/* row 3: 1 2 3 Oggi */}
        <K onClick={() => onDigit('1')} className={digitStyle}>1</K>
        <K onClick={() => onDigit('2')} className={digitStyle}>2</K>
        <K onClick={() => onDigit('3')} className={digitStyle}>3</K>
        <K onClick={onSetToday}
          className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-black border border-emerald-200 dark:border-emerald-500/30">
          {isToday(date) ? 'Oggi' : format(date, 'd/M', { locale: it })}
        </K>

        {/* row 4: , 0 ⌫ = */}
        <K onClick={onDot} className={cn(digitStyle, 'text-[20px]')}>,</K>
        <K onClick={() => onDigit('0')} className={digitStyle}>0</K>
        <K onClick={onBack} className={cn(digitStyle, 'text-slate-400 dark:text-slate-500')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
            <line x1="18" y1="9" x2="13" y2="14"/><line x1="13" y1="9" x2="18" y2="14"/>
          </svg>
        </K>
        <K onClick={onSave}
          className={cn(
            'text-[13px] font-black shadow-lg tracking-wide',
            saving || !canSave
              ? 'bg-slate-100 dark:bg-slate-700 text-slate-300 dark:text-slate-600'
              : type === 'EXPENSE'
                ? 'bg-rose-500 text-white shadow-rose-200/40'
                : 'bg-emerald-500 text-white shadow-emerald-200/40'
          )}
        >
          {saving
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : 'Salva'}
        </K>
      </div>
    </div>
  );
}
