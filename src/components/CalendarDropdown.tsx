import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isToday, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface CalendarDropdownProps {
  isOpen: boolean;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onGoToToday: () => void;
  onClose: () => void;
}

export default function CalendarDropdown({ isOpen, selectedDate, onSelectDate, onGoToToday, onClose }: CalendarDropdownProps) {
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  useEffect(() => {
    if (isOpen) {
      setCalendarMonth(selectedDate);
    }
  }, [isOpen, selectedDate]);

  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(startOfMonth(calendarMonth), { locale: it }),
    end: endOfWeek(endOfMonth(calendarMonth), { locale: it })
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ height: 0, opacity: 0, y: -10 }}
          animate={{ height: 'auto', opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: -10 }}
          className="fixed left-1/2 -translate-x-1/2 w-[calc(100vw-32px)] max-w-[430px] top-1/2 -translate-y-1/2 z-[9999] bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-5 overflow-hidden transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest leading-none mb-1 transition-colors">Seleziona Data</span>
              <span className="text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight transition-colors">{format(calendarMonth, 'MMMM yyyy', { locale: it })}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-white/5 rounded-xl text-slate-400 dark:text-slate-600 active:scale-90 transition-all"><ChevronLeft size={16} strokeWidth={2.5} /></button>
              <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-white/5 rounded-xl text-slate-400 dark:text-slate-600 active:scale-90 transition-all"><ChevronRight size={16} strokeWidth={2.5} /></button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-5">
            {['L','M','M','G','V','S','D'].map(d => <div key={d} className="text-[10px] font-black text-slate-200 dark:text-slate-700 text-center py-1 transition-colors">{d}</div>)}
            {daysInMonth.map((day, i) => {
              const isDayToday = isToday(day);
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
              
              return (
                <button 
                  key={i} 
                  onClick={() => {
                    onSelectDate(day);
                    onClose();
                  }}
                  className={cn(
                    "aspect-square rounded-xl flex items-center justify-center text-[10px] font-black transition-all relative overflow-hidden",
                    isSelected 
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100 dark:shadow-emerald-900/40" 
                      : isDayToday 
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                        : isCurrentMonth ? "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5" : "text-slate-200 dark:text-slate-700"
                  )}
                >
                  {format(day, 'd')}
                  {isDayToday && !isSelected && (
                    <div className="absolute bottom-1 w-1 h-1 bg-emerald-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
 
          <button 
            onClick={() => {
              onGoToToday();
              onClose();
            }}
            className="w-full py-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] hover:bg-emerald-50 dark:hover:bg-emerald-500/20 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all active:scale-95"
          >
            Torna a Oggi
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

