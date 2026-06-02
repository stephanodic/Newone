import React from 'react';
import { Repeat, X as XIcon } from 'lucide-react';
import { TransactionType, RecurrenceInterval } from '../types';
import { cn } from '../lib/utils';

type Op = '+' | '-' | '×' | '÷';

interface TransactionNoteDateProps {
  type: TransactionType;
  formattedDisplay: string;
  op: Op | null;
  prevVal: number | null;
  note: string;
  isRecurring: boolean;
  recurrenceInterval: RecurrenceInterval;
  tags: string[];
  tagInput: string;
  suggestedTags: string[];
  onNoteChange: (v: string) => void;
  onToggleRecurring: () => void;
  onSetInterval: (iv: RecurrenceInterval) => void;
  onTagInput: (v: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onRemoveLastTag: () => void;
}

export default function TransactionNoteDate({
  type, formattedDisplay, op, prevVal,
  note, isRecurring, recurrenceInterval,
  tags, tagInput, suggestedTags,
  onNoteChange, onToggleRecurring, onSetInterval,
  onTagInput, onAddTag, onRemoveTag, onRemoveLastTag,
}: TransactionNoteDateProps) {
  return (
    <div className="px-5 pt-1 pb-1 flex flex-col items-center shrink-0">

      {/* operatore pending */}
      {op && (
        <span className="text-[11px] font-black text-slate-300 dark:text-slate-600 self-center mb-[-4px]">
          {op} {prevVal}
        </span>
      )}

      {/* display importo */}
      <div className="flex items-baseline gap-1.5 justify-center">
        <span
          className="text-[44px] font-extrabold tracking-tight leading-none"
          style={{ color: type === 'EXPENSE' ? '#E24B4A' : '#1D9E75' }}
        >
          {formattedDisplay}
        </span>
        <span className="text-[22px] font-black text-slate-300 dark:text-slate-600">€</span>
      </div>

      {/* nota + tasto ricorrenza */}
      <div className="w-full flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 mt-0.5">
        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest shrink-0">Note</span>
        <input
          type="text"
          placeholder="Scrivi qui..."
          value={note}
          onChange={e => onNoteChange(e.target.value)}
          className="flex-1 text-[12px] font-semibold text-slate-600 dark:text-slate-300 bg-transparent outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 py-1.5"
        />
        <button
          type="button"
          onPointerDown={e => { e.preventDefault(); onToggleRecurring(); }}
          className={cn(
            "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all",
            isRecurring ? "bg-indigo-100 dark:bg-indigo-500/20" : "bg-slate-100 dark:bg-slate-700"
          )}
        >
          <Repeat size={13} strokeWidth={2.5} className={isRecurring ? "text-indigo-500" : "text-slate-400 dark:text-slate-400"} />
        </button>
      </div>

      {/* tag input */}
      <div className="w-full flex items-center flex-wrap gap-1 border-b border-slate-100 dark:border-slate-800 py-1.5 min-h-[30px]">
        <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest shrink-0">#</span>
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-0.5 text-[10px] font-black bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 rounded-full px-1.5 py-0.5">
            {tag}
            <button type="button" onPointerDown={e => { e.preventDefault(); onRemoveTag(tag); }}>
              <XIcon size={8} strokeWidth={3} />
            </button>
          </span>
        ))}
        <input
          type="text"
          placeholder={tags.length === 0 ? 'tag...' : '+'}
          value={tagInput}
          onChange={e => onTagInput(e.target.value)}
          onKeyDown={e => {
            if ([' ', 'Enter', ','].includes(e.key)) { e.preventDefault(); onAddTag(tagInput); }
            if (e.key === 'Backspace' && !tagInput && tags.length > 0) onRemoveLastTag();
          }}
          onBlur={() => { if (tagInput.trim()) onAddTag(tagInput); }}
          className="text-[10px] font-semibold text-violet-500 dark:text-violet-300 bg-transparent outline-none min-w-[40px] max-w-[90px] placeholder:text-slate-300 dark:placeholder:text-slate-600"
        />
        {suggestedTags.filter(t => !tags.includes(t)).slice(0, 4).map(st => (
          <button key={st} type="button" onPointerDown={e => { e.preventDefault(); onAddTag(st); }}
            className="text-[10px] text-slate-300 dark:text-slate-600 hover:text-violet-400 transition-colors">
            +{st}
          </button>
        ))}
      </div>

      {/* intervalli ricorrenza */}
      {isRecurring && (
        <div className="grid grid-cols-4 gap-1 w-full mt-2">
          {(['WEEKLY', 'MONTHLY', 'BIMONTHLY', 'DAILY'] as RecurrenceInterval[]).map(iv => (
            <button
              key={iv}
              type="button"
              onPointerDown={e => { e.preventDefault(); onSetInterval(iv); }}
              className={cn(
                "py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                recurrenceInterval === iv
                  ? "bg-indigo-500 text-white border-indigo-500"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600"
              )}
            >
              {iv === 'DAILY' ? 'Giorn.' : iv === 'WEEKLY' ? 'Sett.' : iv === 'MONTHLY' ? 'Mens.' : 'Bimest.'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
