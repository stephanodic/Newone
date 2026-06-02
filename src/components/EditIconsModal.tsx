import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, LayoutGrid, Info } from 'lucide-react';
import { Category } from '../types';
import { cn } from '../lib/utils';

interface EditIconsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSave: (mapping: Record<string, string>) => void;
  onSync?: () => Promise<void>;
}

const SLOTS = [
  { id: 'slot_1', label: 'Slot 1 (Top Left)', defaultCat: 'Education' },
  { id: 'slot_2', label: 'Slot 2 (Top Center)', defaultCat: 'Work' },
  { id: 'slot_3', label: 'Slot 3 (Top Right)', defaultCat: 'Travel' },
  { id: 'slot_4', label: 'Slot 4 (Center Right)', defaultCat: 'Health' },
  { id: 'slot_5', label: 'Slot 5 (Bottom Right)', defaultCat: 'Shopping' },
  { id: 'slot_6', label: 'Slot 6 (Bottom Bottom Right)', defaultCat: 'Gifts' },
  { id: 'slot_7', label: 'Slot 7 (Bottom Center)', defaultCat: 'Bills' },
  { id: 'slot_8', label: 'Slot 8 (Bottom Left)', defaultCat: 'Auto' },
  { id: 'slot_9', label: 'Slot 9 (Center Left)', defaultCat: 'Home' },
  { id: 'slot_10', label: 'Slot 10 (Left Center)', defaultCat: 'Food' },
];

export const EditIconsModal = ({ isOpen, onClose, categories, onSave, onSync }: EditIconsModalProps) => {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Filter for the 10 premium categories
  const premiumCategories = categories.filter(c => 
    ['Food', 'Home', 'Auto', 'Travel', 'Shopping', 'Health', 'Bills', 'Gifts', 'Education', 'Work'].includes(c.name)
  );

  const handleSync = async () => {
    if (!onSync) return;
    setIsSyncing(true);
    try {
      await onSync();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('donut_icon_mapping');
      if (saved) {
        setMapping(JSON.parse(saved));
      } else {
        // Default mapping based on category names
        const initialMapping: Record<string, string> = {};
        SLOTS.forEach(slot => {
          initialMapping[slot.id] = slot.defaultCat;
        });
        setMapping(initialMapping);
      }
    }
  }, [isOpen]);

  const handleUpdate = (slotId: string, categoryName: string) => {
    setMapping(prev => ({ ...prev, [slotId]: categoryName }));
  };

  const handleSave = () => {
    localStorage.setItem('donut_icon_mapping', JSON.stringify(mapping));
    onSave(mapping);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                  <LayoutGrid size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 leading-none">Layout Icone</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Personalizza la Dashboard</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]">
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex gap-3 items-start">
                <Info size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium text-emerald-800 leading-relaxed">
                  Scegli la categoria per ogni slot della cornice professionale. Ogni slot corrisponde a una posizione fissa sul perimetro della Dashboard.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {SLOTS.map((slot) => {
                  const currentCat = premiumCategories.find(c => c.name === mapping[slot.id]);
                  return (
                    <div key={slot.id} className="flex items-center gap-4 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 transition-all hover:bg-slate-100/50">
                      <div className="w-8 h-8 rounded-full bg-slate-200/50 flex items-center justify-center text-[10px] font-black text-slate-400">
                        {slot.id.split('_')[1]}
                      </div>
                      
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{slot.label}</p>
                        <select 
                          value={mapping[slot.id] || ''} 
                          onChange={(e) => handleUpdate(slot.id, e.target.value)}
                          className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none cursor-pointer"
                        >
                          <option value="">Seleziona Categoria</option>
                          {premiumCategories.map(cat => (
                            <option key={cat.id} value={cat.name}>
                              {cat.emoji} {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {currentCat && (
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-xl">
                          {currentCat.emoji}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 pt-2 pb-32 flex flex-col gap-3">
              {premiumCategories.length < 10 && (
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="w-full bg-slate-100 text-slate-600 font-black py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSyncing ? 'Aggiornamento...' : 'Carica Icone 3D Mancanti'}
                </button>
              )}
              
              <button 
                onClick={handleSave}
                className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-900/10 flex items-center justify-center gap-2 text-base active:scale-95 transition-all"
              >
                Salva Layout
                <Check size={20} strokeWidth={3} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};


