import React, { useState, useRef, memo, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Plus, Check, PackageOpen, Trash2, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptic';
import { ShoppingItem } from '../types';

// --- UTILITIES & DATA ---

const KEYWORD_MAP: Record<string, string> = {
  // Latticini
  latte: '🥛', yogurt: '🥛', panna: '🥛', formaggio: '🧀', burro: '🧈', uova: '🥚',
  mozzarella: '🧀', ricotta: '🧀', parmigiano: '🧀', pecorino: '🧀',
  // Pane & cereali
  pane: '🍞', pizza: '🍕', brioche: '🥐', cornetti: '🥐', biscotti: '🍪',
  farina: '🌾', crackers: '🫘', fette: '🍞', cereali: '🌾',
  // Pasta & riso
  pasta: '🍝', riso: '🍚', gnocchi: '🍝', lasagne: '🍝', cous: '🍚',
  // Verdura
  pomodoro: '🍅', pomodori: '🍅', broccoli: '🥦', carota: '🥕', carote: '🥕',
  patata: '🥔', patate: '🥔', cipolla: '🧅', cipolle: '🧅', aglio: '🧄',
  insalata: '🥬', cetriolo: '🥒', peperone: '🫑', melanzana: '🍆',
  fungo: '🍄', funghi: '🍄', zucchina: '🥒', zucchine: '🥒',
  spinaci: '🥬', cavolo: '🥦', sedano: '🥬', piselli: '🫛', fagiolini: '🫘',
  // Frutta
  mela: '🍎', mele: '🍎', limone: '🍋', limoni: '🍋', banana: '🍌', banane: '🍌',
  uva: '🍇', fragola: '🍓', fragole: '🍓', arancia: '🍊', arance: '🍊',
  pera: '🍐', pere: '🍐', pesca: '🍑', pesche: '🍑', anguria: '🍉',
  melone: '🍈', kiwi: '🥝', ananas: '🍍', mango: '🥭', ciliegia: '🍒',
  // Carne & pesce
  carne: '🥩', pollo: '🍗', pesce: '🐟', gambero: '🦐', gamberi: '🦐',
  prosciutto: '🥓', salmone: '🐟', tonno: '🐟', tacchino: '🍗',
  salsicce: '🌭', mortadella: '🥓', bresaola: '🥩', cotoletta: '🥩',
  // Condimenti & salse
  olio: '🫒', sale: '🧂', pepe: '🌶️', aceto: '🫙', ketchup: '🍅',
  maionese: '🫙', senape: '🫙', miele: '🍯', marmellata: '🍓', nutella: '🍫',
  // Bevande
  caffe: '☕', acqua: '🥤', vino: '🍷', birra: '🍺', succo: '🍹',
  the: '🍵', tè: '🍵', cola: '🥤', aranciata: '🥤', limonata: '🥤',
  // Dolci & snack
  cioccolato: '🍫', torta: '🍰', gelato: '🍦', chips: '🍟',
  noccioline: '🥜', popcorn: '🍿', merendine: '🧁',
  // Casa & igiene
  detersivo: '🧴', sapone: '🧼', carta: '🧻', shampoo: '🧴',
  dentifricio: '🦷', spugna: '🧽', sacchetti: '🛍️', surgelati: '🧊',
  giardiniera: '',
};

const ALL_EMOJIS = ['❤️','🛒','🛍️','🎁','💡','✏️','📦','💰','💊','🔧','🏠','🐶','🐱','🌿','👕','❓', ...new Set(Object.values(KEYWORD_MAP).filter(Boolean))];

const CATALOG_DATA: Record<string, { name: string; emoji: string }[]> = {
  "🥦 Frutta & Verdura": [
    { name: "Mele", emoji: "🍎" }, { name: "Banane", emoji: "🍌" }, { name: "Fragole", emoji: "🍓" },
    { name: "Arance", emoji: "🍊" }, { name: "Limoni", emoji: "🍋" }, { name: "Uva", emoji: "🍇" },
    { name: "Pere", emoji: "🍐" }, { name: "Pesche", emoji: "🍑" }, { name: "Kiwi", emoji: "🥝" },
    { name: "Pomodori", emoji: "🍅" }, { name: "Insalata", emoji: "🥬" }, { name: "Spinaci", emoji: "🥬" },
    { name: "Patate", emoji: "🥔" }, { name: "Carote", emoji: "🥕" }, { name: "Cipolle", emoji: "🧅" },
    { name: "Aglio", emoji: "🧄" }, { name: "Broccoli", emoji: "🥦" }, { name: "Zucchine", emoji: "🥒" },
    { name: "Peperoni", emoji: "🫑" }, { name: "Funghi", emoji: "🍄" }, { name: "Melanzane", emoji: "🍆" },
    { name: "Piselli", emoji: "🫛" },
  ],
  "🥩 Carne & Pesce": [
    { name: "Pollo", emoji: "🍗" }, { name: "Manzo", emoji: "🥩" }, { name: "Tacchino", emoji: "🍗" },
    { name: "Salsicce", emoji: "🌭" }, { name: "Cotolette", emoji: "🥩" },
    { name: "Prosciutto", emoji: "🥓" }, { name: "Mortadella", emoji: "🥓" }, { name: "Bresaola", emoji: "🥩" },
    { name: "Salmone", emoji: "🐟" }, { name: "Tonno", emoji: "🐟" }, { name: "Gamberi", emoji: "🦐" },
  ],
  "🥛 Latticini & Uova": [
    { name: "Latte", emoji: "🥛" }, { name: "Yogurt", emoji: "🥛" }, { name: "Panna", emoji: "🥛" },
    { name: "Uova", emoji: "🥚" }, { name: "Burro", emoji: "🧈" },
    { name: "Mozzarella", emoji: "🧀" }, { name: "Parmigiano", emoji: "🧀" }, { name: "Ricotta", emoji: "🧀" },
    { name: "Formaggio", emoji: "🧀" },
  ],
  "🍞 Pane & Dispensa": [
    { name: "Pane", emoji: "🍞" }, { name: "Cornetti", emoji: "🥐" }, { name: "Fette biscottate", emoji: "🍞" },
    { name: "Crackers", emoji: "🫘" }, { name: "Pasta", emoji: "🍝" }, { name: "Riso", emoji: "🍚" },
    { name: "Farina", emoji: "🌾" }, { name: "Biscotti", emoji: "🍪" }, { name: "Cereali", emoji: "🌾" },
    { name: "Olio", emoji: "🫒" }, { name: "Sale", emoji: "🧂" }, { name: "Miele", emoji: "🍯" },
    { name: "Marmellata", emoji: "🍓" }, { name: "Nutella", emoji: "🍫" },
  ],
  "🍷 Bevande": [
    { name: "Acqua", emoji: "💧" }, { name: "Succo", emoji: "🍹" }, { name: "Cola", emoji: "🥤" },
    { name: "Aranciata", emoji: "🥤" }, { name: "Caffè", emoji: "☕" }, { name: "Tè", emoji: "🍵" },
    { name: "Vino", emoji: "🍷" }, { name: "Birra", emoji: "🍺" },
  ],
  "🍫 Dolci & Snack": [
    { name: "Cioccolato", emoji: "🍫" }, { name: "Gelato", emoji: "🍦" }, { name: "Torta", emoji: "🍰" },
    { name: "Merendine", emoji: "🧁" }, { name: "Chips", emoji: "🍟" }, { name: "Noccioline", emoji: "🥜" },
    { name: "Popcorn", emoji: "🍿" },
  ],
  "🧴 Igiene & Cura": [
    { name: "Shampoo", emoji: "🧴" }, { name: "Sapone", emoji: "🧼" }, { name: "Dentifricio", emoji: "🦷" },
    { name: "Deodorante", emoji: "🧴" }, { name: "Crema", emoji: "🧴" },
  ],
  "🏠 Casa": [
    { name: "Detersivo", emoji: "🧴" }, { name: "Detersivo piatti", emoji: "🍽️" }, { name: "Ammorbidente", emoji: "🧺" },
    { name: "Carta igienica", emoji: "🧻" }, { name: "Carta casa", emoji: "🧻" }, { name: "Spugna", emoji: "🧽" },
    { name: "Sacchetti", emoji: "🛍️" }, { name: "Surgelati", emoji: "🧊" },
  ],
};

type CatalogItem = { name: string; emoji: string; };

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const stringToHslColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, 70%, 80%)`;
};

// --- SUB-COMPONENTS ---

const LetterIcon = memo(({ letter, name }: { letter: string, name: string }) => {
  const bgColor = useMemo(() => stringToHslColor(name), [name]);
  return <div className="w-full h-full rounded-full flex items-center justify-center font-black text-slate-600/70" style={{ backgroundColor: bgColor, fontSize: '60%' }}>{letter}</div>
});
LetterIcon.displayName = 'LetterIcon';

const Chip = memo(({ item, onClick, onLongPress, isSelected, isBought }: { item: ShoppingItem, onClick: () => void, onLongPress: () => void, isSelected?: boolean, isBought?: boolean }) => {
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const handlePressStart = () => { pressTimer.current = setTimeout(() => { onLongPress(); haptic.heavy?.(); }, 600); };
  const handlePressEnd = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } };
  
  const isLetter = item.icon?.length === 1 && /[A-Z]/.test(item.icon);

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: 'spring', stiffness: 350, damping: 25 }}>
      <button onClick={onClick} onTouchStart={handlePressStart} onTouchEnd={handlePressEnd} onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd} className={cn('floating-chip', isSelected && 'is-selected')} title={item.name}>
        <div className={cn("ico floating-emoji", isBought && "grayscale opacity-60")}>
          {isLetter ? <LetterIcon letter={item.icon!} name={item.name} /> : item.icon}
          <AnimatePresence>{isSelected && !isBought && <motion.span className="badge" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>✓</motion.span>}</AnimatePresence>
          {item.quantity && parseInt(item.quantity, 10) > 1 && <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-md">{item.quantity}</span>}
        </div>
        <span className={cn("lbl", isBought && "line-through")}>{item.name}</span>
      </button>
    </motion.div>
  );
});
Chip.displayName = 'Chip';

const EditModal = memo(({ item, onSave, onDelete, onClose }: { item: ShoppingItem, onSave: (id: string, updates: Partial<ShoppingItem>) => void, onDelete: (id: string) => void, onClose: () => void }) => {
  const [name, setName] = useState(item.name);
  const [icon, setIcon] = useState(item.icon);
  const [quantity, setQuantity] = useState(item.quantity || '1');
  const quantities = ['1', '2', '3', '5', '10'];

  const cycleIcon = () => {
    const currentIndex = ALL_EMOJIS.indexOf(icon || '');
    const nextIndex = (currentIndex + 1) % ALL_EMOJIS.length;
    setIcon(ALL_EMOJIS[nextIndex]);
  };

  const handleSave = () => {
    const updates: Partial<ShoppingItem> = {};
    if (name !== item.name) updates.name = name;
    if (icon !== item.icon) updates.icon = icon;
    if (quantity !== item.quantity) updates.quantity = quantity;
    if (Object.keys(updates).length > 0) onSave(item.id, updates);
    onClose();
  };

  return createPortal(<AnimatePresence>{item && (<motion.div className="fixed inset-0 z-[9999] flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><div className="absolute inset-0 bg-black/40 backdrop-blur-sm" /><motion.div className="relative w-full max-w-[430px] bg-white dark:bg-slate-800 rounded-t-[28px] px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] z-10" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 26, stiffness: 220 }} onClick={e => e.stopPropagation()}><div className="w-10 h-1 bg-slate-200 dark:bg-slate-600 rounded-full mx-auto mb-5" /><div className="flex items-center gap-4 mb-5"><button onClick={cycleIcon} className="relative w-20 h-20 text-5xl flex items-center justify-center shrink-0 rounded-2xl bg-slate-100 dark:bg-slate-700 active:scale-95 transition-transform"><span className="floating-emoji">{icon?.length === 1 && /[A-Z]/.test(icon) ? <LetterIcon letter={icon} name={name} /> : icon}</span><div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-md"><RotateCcw size={12} className="text-slate-500"/></div></button><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full text-2xl font-bold bg-transparent outline-none text-slate-800 dark:text-slate-100" /></div><div className="mb-5"><p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Quantità</p><div className="flex justify-between">{quantities.map(q => <button key={q} onClick={() => setQuantity(q)} className={cn('w-14 h-10 rounded-lg font-bold text-lg transition-all', quantity === q ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200')}>{q}</button>)}</div></div><div className="flex gap-3"><button onClick={handleSave} className="flex-1 bg-emerald-500 text-white font-bold text-[15px] py-3.5 rounded-2xl active:scale-95 transition-all">Salva</button><button onClick={() => { onDelete(item.id); onClose(); }} className="p-3 text-rose-500 active:scale-90 transition-transform"><Trash2 size={20}/></button></div></motion.div></motion.div>)}</AnimatePresence>, document.body);
});
EditModal.displayName = 'EditModal';

interface ListaSpesaTabProps { items: ShoppingItem[]; loading: boolean; onAdd: (name: string, quantity: string, icon: string) => Promise<string | void>; onToggle: (id: string, bought: boolean) => void; onUpdate: (id: string, updates: Partial<ShoppingItem>) => void; onDelete: (id: string | string[]) => void; user?: User | null; onProfileClick?: () => void; }

const ListaSpesaTab = memo((props: ListaSpesaTabProps) => {
  const { items, loading, onAdd, onToggle, onUpdate, onDelete, user, onProfileClick } = props;
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const getIconForTerm = (term: string): string => { if (!term) return '✏️'; const t = term.toLowerCase(); for (const key in KEYWORD_MAP) if (t.includes(key)) return KEYWORD_MAP[key] || capitalize(t.charAt(0)); return capitalize(t.charAt(0)); };

  const suggestion = useMemo(() => { const trimmed = name.trim(); if (!trimmed) return null; const capitalized = capitalize(trimmed); const icon = getIconForTerm(trimmed); const isExisting = items.some(i => !i.bought && i.name.toLowerCase() === capitalized.toLowerCase()); return { name: capitalized, icon, isExisting }; }, [name, items]);

  const handleAdd = useCallback(async (itemName: string, itemIcon: string) => { if (items.some(i => !i.bought && i.name.toLowerCase() === itemName.toLowerCase())) { return; } setAdding(true); await onAdd(itemName, '1', itemIcon); setName(''); setAdding(false); haptic(); }, [items, onAdd]);

  const handleCatalogClick = useCallback((catalogItem: CatalogItem) => { haptic(); const existing = items.find(i => !i.bought && i.name.toLowerCase() === catalogItem.name.toLowerCase()); if (existing) onDelete(existing.id); else onAdd(catalogItem.name, '1', catalogItem.emoji); }, [items, onAdd, onDelete]);
  
  const handleToggleBought = useCallback((item: ShoppingItem) => {
    haptic.light?.();
    onToggle(item.id, !item.bought);
  }, [onToggle]);

  const handleClearBought = () => {
    const boughtItems = items.filter(i => i.bought);
    if (boughtItems.length === 0) return;
    haptic.heavy?.();

    const idsToDelete = boughtItems.map(i => i.id);
    // FIX: Call onDelete for each item, as batch deletion might not be supported by the parent hook.
    idsToDelete.forEach(id => onDelete(id));
  }

  const itemsToBuy = useMemo(() => items.filter(i => !i.bought), [items]);
  const itemsBought = useMemo(() => items.filter(i => i.bought), [items]);

  // Suggerimenti di ricerca: filtra il catalogo mentre si digita (min 2 caratteri)
  const searchResults = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (q.length < 2) return [];
    return Object.values(CATALOG_DATA)
      .flat()
      .filter(ci => ci.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [name]);

  return (
    <div className="h-full flex flex-col bg-[#F5F5F0] dark:bg-slate-900 overflow-hidden font-sans transition-colors duration-500">
      <div className="bg-gradient-to-br from-[#1D9E75] to-[#11cc98] pb-1 sticky top-0 z-10 shadow-sm" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
        <div className="flex items-center justify-center relative mb-4 px-4">
            <img src="/logo.png" alt="logo" className="absolute left-0 h-11 w-11 rounded-xl object-cover flex-shrink-0" />
            <div className="text-center"><div className="flex items-center justify-center gap-2"><ShoppingCart size={22} strokeWidth={2.5} className="text-white" /><span className="text-2xl font-black text-white tracking-tight">Lista Spesa</span></div></div>
            {onProfileClick && (
              <button onClick={onProfileClick} className="absolute right-0 w-10 h-10 rounded-full border-2 border-white/50 overflow-hidden active:scale-90 transition-all">
                {user?.photoURL
                  ? <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-black">{user?.displayName?.[0] || 'U'}</div>
                }
              </button>
            )}
        </div>
        <div className="flex gap-2 items-center px-4 pb-3">
            <div className="w-10 h-10 flex items-center justify-center text-2xl shrink-0"><span className="floating-emoji-sm">{suggestion?.icon && (suggestion.icon.length > 1 ? suggestion.icon : <LetterIcon letter={suggestion.icon} name={suggestion.name} />) || '✏️'}</span></div>
            <input ref={nameRef} type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && suggestion && handleAdd(suggestion.name, suggestion.icon)} placeholder="Aggiungi al volo..." aria-label="Nome articolo" className="flex-1 min-w-0 bg-white/20 text-white placeholder-white/50 text-sm font-semibold rounded-xl px-3 py-2.5 outline-none focus:bg-white/30 transition-all" />
            <button onClick={() => suggestion && handleAdd(suggestion.name, suggestion.icon)} disabled={!suggestion || suggestion.isExisting || adding} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-40 shrink-0"><Plus size={20} strokeWidth={3} className="text-emerald-600" /></button>
        </div>
        {/* Suggerimenti di ricerca live */}
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3">
                {searchResults.map(ci => {
                  const inList = itemsToBuy.some(i => i.name.toLowerCase() === ci.name.toLowerCase());
                  return (
                    <button
                      key={ci.name}
                      onClick={() => { handleCatalogClick(ci); if (!inList) setName(''); }}
                      className={cn(
                        'flex items-center gap-1.5 shrink-0 rounded-2xl px-3 py-1.5 active:scale-95 transition-all text-sm font-bold',
                        inList
                          ? 'bg-white text-emerald-700 shadow-md'
                          : 'bg-white/25 text-white'
                      )}
                    >
                      <span style={{ fontSize: 16 }}>{ci.emoji}</span>
                      <span>{ci.name}</span>
                      {inList && <Check size={13} strokeWidth={3} className="text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
        {loading && <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-emerald-400/40 border-t-emerald-500 rounded-full animate-spin" /></div>}

        {!loading && itemsToBuy.length > 0 && (<motion.div layout className="bring-card"><div className="bring-section-title">Da prendere</div><div className="bring-grid-container"><AnimatePresence>{itemsToBuy.map(item => (<Chip key={item.id} item={item} onClick={() => handleToggleBought(item)} onLongPress={() => setEditingItem(item)} isSelected />))}</AnimatePresence></div></motion.div>)}

        {!loading && itemsBought.length > 0 && (<motion.div layout className="bring-card-bought"><div className="flex justify-between items-center"><div className="bring-section-title">Utilizzato di recente</div><button onClick={handleClearBought} aria-label="Svuota utilizzato di recente" className="text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors mr-2"><Trash2 size={16}/></button></div><div className="bring-grid-container"><AnimatePresence>{itemsBought.map(item => (<Chip key={item.id} item={item} onClick={() => handleToggleBought(item)} onLongPress={() => setEditingItem(item)} isBought />))}</AnimatePresence></div></motion.div>)}

        {!loading && items.length === 0 && (<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-10 gap-3 text-center"><PackageOpen size={48} strokeWidth={1.2} className="text-slate-300 dark:text-slate-600" /><p className="text-base font-bold text-slate-400 dark:text-slate-500">Lista vuota</p><p className="text-xs text-slate-300 dark:text-slate-600 max-w-[240px]">Aggiungi articoli dal catalogo o con la barra in alto.</p></motion.div>)}

        {!loading && Object.entries(CATALOG_DATA).map(([category, catalogItems]) => (<div key={category} className="mb-6"><div className="bring-section-title">{category}</div><div className="bring-grid-container">{catalogItems.map(ci => (<button key={ci.name} className={cn('floating-chip', itemsToBuy.some(i => i.name.toLowerCase() === ci.name.toLowerCase()) && 'is-selected')} onClick={() => handleCatalogClick(ci)}><div className="ico floating-emoji">{ci.emoji.length === 1 && /[A-Z]/.test(ci.emoji) ? <LetterIcon letter={ci.emoji} name={ci.name} /> : ci.emoji}<AnimatePresence>{itemsToBuy.some(i => i.name.toLowerCase() === ci.name.toLowerCase()) && <motion.span className="badge">✓</motion.span>}</AnimatePresence></div><span className="lbl">{ci.name}</span></button>))}</div></div>))}
        <div className="h-16" />
      </div>
      {editingItem && <EditModal item={editingItem} onSave={onUpdate} onDelete={(id) => {onDelete(id); setEditingItem(null);}} onClose={() => setEditingItem(null)} />}
    </div>
  );
});

ListaSpesaTab.displayName = 'ListaSpesaTab';
export default ListaSpesaTab;
