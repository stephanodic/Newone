import React from 'react';
import { motion } from 'motion/react';
import { Category } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { cn } from '../lib/utils';

interface TransactionCategoryPickerProps {
  categories: Category[];
  selectedCatId?: string;
  onPick: (cat: Category) => void;
  variant: 'full' | 'strip';
}

export default function TransactionCategoryPicker({
  categories, selectedCatId, onPick, variant,
}: TransactionCategoryPickerProps) {

  if (variant === 'strip') {
    return (
      <div className="grid grid-cols-4 gap-x-2 gap-y-1.5 w-full">
        {categories.map(cat => (
          <button key={cat.id}
            onClick={() => onPick(cat)}
            className="flex flex-col items-center gap-[3px] active:scale-90 transition-all"
          >
            <div className="w-9 h-9 flex items-center justify-center floating-emoji">
              <CategoryIcon name={cat.emoji || 'Package'} size={22} color={cat.color} />
            </div>
            <span className="text-[7px] font-semibold text-slate-500 dark:text-slate-400 text-center truncate w-full leading-none px-0.5">
              {cat.name.charAt(0).toUpperCase() + cat.name.slice(1).toLowerCase()}
            </span>
          </button>
        ))}
      </div>
    );
  }

  // variant === 'full'
  if (categories.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-[#1D9E75]/40 border-t-[#1D9E75] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-x-2 gap-y-5">
      {categories.map(cat => {
        const active = selectedCatId === cat.id;
        return (
          <motion.button key={cat.id} whileTap={{ scale: 0.85 }}
            onClick={() => onPick(cat)}
            className="flex flex-col items-center gap-1.5"
          >
            <div className={cn(
              "w-11 h-11 flex items-center justify-center floating-emoji transition-all duration-200",
              active && "scale-110"
            )}>
              <CategoryIcon name={cat.emoji || 'Package'} size={31} color={cat.color} />
            </div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 text-center leading-tight truncate w-full px-0.5">
              {cat.name.charAt(0).toUpperCase() + cat.name.slice(1).toLowerCase()}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
