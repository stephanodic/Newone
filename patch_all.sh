#!/bin/bash
set -e

# ── LISTA TAB ──
node -e "
const fs = require('fs');
let c = fs.readFileSync('src/components/ListaTab.tsx', 'utf8');

const old = \`  return (
    <div className=\"h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden font-sans relative transition-colors duration-500\">\`;

const newStart = \`  return (
    <div className=\"h-full flex flex-col bg-[#F5F5F0] dark:bg-slate-900 overflow-hidden font-sans relative transition-colors duration-500\">\`;

c = c.replace(old, newStart);

// Replace old header+filtri with new
const oldBlock = \`      {/* HEADER */}
      <div className=\"px-4 sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md pt-4 pb-3\">
        <div className=\"flex items-center justify-between mb-3\">
          <h2 className=\"text-base font-bold text-slate-700 dark:text-slate-200\">Cronologia</h2>
          <span className=\"text-[10px] font-semibold text-slate-400\">{filteredAndSorted.length} movimenti</span>
        </div>
      </div>

      <div className=\"flex-1 overflow-y-auto no-scrollbar pb-32\">\`;

const newBlock = \`      {/* HEADER VERDE */}
      <div className=\"bg-gradient-to-br from-[#1D9E75] to-[#11cc98] px-4 pt-4 pb-6 shrink-0\">
        <div className=\"flex items-center justify-between mb-3\">
          <div>
            <div className=\"text-[8px] font-black text-white/60 uppercase tracking-widest leading-none mb-0.5\">MoneyTrack</div>
            <h2 className=\"text-[16px] font-black text-white tracking-tight leading-none\">Cronologia</h2>
          </div>
          <span className=\"text-[10px] font-semibold text-white/70\">{filteredAndSorted.length} movimenti</span>
        </div>
        <div className=\"flex items-center justify-between\">
          <button onClick={() => setMonth(-1)} className=\"w-8 h-8 rounded-full bg-white/20 flex items-center justify-center active:scale-90 transition-all\">
            <ChevronLeft size={16} strokeWidth={3} className=\"text-white\" />
          </button>
          <span className=\"text-[14px] font-bold text-white capitalize\">
            {format(filters.date, filters.period === 'DAILY' ? 'd MMMM yyyy' : 'MMMM yyyy', { locale: it })}
          </span>
          <button onClick={() => setMonth(1)} className=\"w-8 h-8 rounded-full bg-white/20 flex items-center justify-center active:scale-90 transition-all\">
            <ChevronRight size={16} strokeWidth={3} className=\"text-white\" />
          </button>
        </div>
      </div>
      <div className=\"mx-3 -mt-4 z-10 relative bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-black/10 border border-white/80 dark:border-white/5 px-3 py-3 shrink-0 mb-3\">
        <div className=\"flex gap-2 mb-2.5\">\`;

if (oldBlock in c) { console.log('lista found'); c = c.replace(oldBlock, newBlock); }
else { console.log('lista NOT found - skipping block'); }

fs.writeFileSync('src/components/ListaTab.tsx', c);
console.log('Lista done');
"

# ── CATEGORIE TAB ──
node -e "
const fs = require('fs');
let c = fs.readFileSync('src/components/CategorieTab.tsx', 'utf8');
const old = \`      {/* 1. HEADER - Pill Style Inset */}
      <div className=\"px-4 pt-4 shrink-0 z-50\">
        <div className=\"flex items-center justify-between backdrop-blur-md bg-gradient-to-r from-[#1D9E75] to-[#11cc98] rounded-2xl p-1 gap-1 border border-white/20 shadow-lg shadow-emerald-900/10\">
          <div className=\"flex flex-col ml-3\">
            <span className=\"text-[8px] font-black text-white/60 uppercase tracking-widest italic leading-none mb-0.5\">MoneyTrack</span>
            <h2 className=\"text-[14px] font-black text-white tracking-tight leading-none\">Categorie</h2>
          </div>
          
          <div className=\"flex gap-1.5\">
            <button 
              onClick={() => setIsManageMode(!isManageMode)}
              className={cn(
                \"w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm active:scale-90\",
                isManageMode ? \"bg-white text-[#1D9E75]\" : \"bg-white/20 text-white\"
              )}
            >
              {isManageMode ? <Check size={18} strokeWidth={3.5} /> : <Settings2 size={18} strokeWidth={2.5} />}
            </button>
            <button 
              onClick={onAdd}
              className=\"w-10 h-10 flex items-center justify-center bg-white/20 rounded-xl text-white active:scale-90 transition-all shadow-sm hover:bg-white/30\"
            >
              <Plus size={20} strokeWidth={3.5} />
            </button>
          </div>
        </div>
      </div>\`;

const newHeader = \`      {/* HEADER VERDE */}
      <div className=\"bg-gradient-to-br from-[#1D9E75] to-[#11cc98] px-4 pt-4 pb-6 shrink-0 z-50\">
        <div className=\"flex items-center justify-between\">
          <div>
            <div className=\"text-[8px] font-black text-white/60 uppercase tracking-widest leading-none mb-0.5\">MoneyTrack</div>
            <h2 className=\"text-[16px] font-black text-white tracking-tight leading-none\">Categorie</h2>
          </div>
          <div className=\"flex gap-1.5\">
            <button
              onClick={() => setIsManageMode(!isManageMode)}
              className={cn(\"w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm active:scale-90\",
                isManageMode ? \"bg-white text-[#1D9E75]\" : \"bg-white/20 text-white\"
              )}
            >
              {isManageMode ? <Check size={18} strokeWidth={3.5} /> : <Settings2 size={18} strokeWidth={2.5} />}
            </button>
            <button onClick={onAdd} className=\"w-10 h-10 flex items-center justify-center bg-white/20 rounded-xl text-white active:scale-90 transition-all shadow-sm\">
              <Plus size={20} strokeWidth={3.5} />
            </button>
          </div>
        </div>
      </div>\`;

if (c.includes('1. HEADER - Pill Style Inset')) {
  c = c.replace(old, newHeader);
  console.log('Categorie header replaced');
} else { console.log('Categorie NOT found'); }

// Fix background
c = c.replace('bg-[#F5F5F0] dark:bg-slate-900 overflow-hidden font-sans relative transition-colors duration-500', 'bg-[#F5F5F0] dark:bg-slate-900 overflow-hidden font-sans relative transition-colors duration-500');
// Fix scrollable area: add top margin to account for header overlap
c = c.replace('flex-1 overflow-y-auto no-scrollbar px-5 pt-6 pb-32', 'flex-1 overflow-y-auto no-scrollbar px-5 pt-4 pb-32 mt-0');

fs.writeFileSync('src/components/CategorieTab.tsx', c);
console.log('Categorie done');
"

# ── GRAFICI TAB ──
node -e "
const fs = require('fs');
let c = fs.readFileSync('src/components/GraficiTab.tsx', 'utf8');
const old = \`      {/* HEADER */}
      <div className=\"mx-2 mt-2 flex items-center justify-between backdrop-blur-md bg-gradient-to-r from-[#1D9E75] to-[#11cc98] rounded-2xl p-1 gap-1 border border-white/20 shadow-lg z-50\">
        <div className=\"flex flex-col ml-3\">
          <span className=\"text-[8px] font-black text-white/60 uppercase tracking-widest italic leading-none mb-0.5\">MoneyTrack</span>
          <h2 className=\"text-[14px] font-black text-white tracking-tight leading-none\">Statistiche</h2>
        </div>
        <div className=\"flex items-center gap-0.5 bg-white/20 rounded-full border border-white/10 p-0.5\">
          <button onClick={() => setIsPrivate(p => !p)} className=\"w-8 h-8 flex items-center justify-center text-white/70 hover:text-white active:scale-90 transition-all mr-1\">
            {isPrivate ? <EyeOff size={14} strokeWidth={3} /> : <Eye size={14} strokeWidth={3} />}
          </button>
          <button onClick={() => setMonth(-1)} className=\"p-1.5 text-white/50 hover:text-white active:scale-90 transition-all\"><ChevronLeft size={14} strokeWidth={3} /></button>
          <div className=\"flex items-center gap-1.5 px-1\">
            <Calendar size={12} className=\"text-white\" strokeWidth={3} />
            <span className=\"text-[9px] font-black text-white uppercase tracking-widest\">{format(filters.date, 'MMM yy', { locale: it })}</span>
          </div>
          <button onClick={() => setMonth(1)} className=\"p-1.5 text-white/50 hover:text-white active:scale-90 transition-all\"><ChevronRight size={14} strokeWidth={3} /></button>
        </div>
      </div>\`;

const newHeader = \`      {/* HEADER VERDE */}
      <div className=\"bg-gradient-to-br from-[#1D9E75] to-[#11cc98] px-4 pt-4 pb-6 shrink-0 z-50\">
        <div className=\"flex items-center justify-between\">
          <div>
            <div className=\"text-[8px] font-black text-white/60 uppercase tracking-widest leading-none mb-0.5\">MoneyTrack</div>
            <h2 className=\"text-[16px] font-black text-white tracking-tight leading-none\">Statistiche</h2>
          </div>
          <div className=\"flex items-center gap-1.5\">
            <button onClick={() => setIsPrivate(p => !p)} className=\"w-9 h-9 flex items-center justify-center bg-white/20 rounded-xl text-white active:scale-90 transition-all\">
              {isPrivate ? <EyeOff size={15} strokeWidth={2.5} /> : <Eye size={15} strokeWidth={2.5} />}
            </button>
            <div className=\"flex items-center gap-0.5 bg-white/20 rounded-full px-2 py-1\">
              <button onClick={() => setMonth(-1)} className=\"p-1 text-white/70 active:scale-90\"><ChevronLeft size={13} strokeWidth={3} /></button>
              <div className=\"flex items-center gap-1 px-1\">
                <Calendar size={11} className=\"text-white\" strokeWidth={2.5} />
                <span className=\"text-[10px] font-black text-white uppercase tracking-wider\">{format(filters.date, 'MMM yy', { locale: it })}</span>
              </div>
              <button onClick={() => setMonth(1)} className=\"p-1 text-white/70 active:scale-90\"><ChevronRight size={13} strokeWidth={3} /></button>
            </div>
          </div>
        </div>
      </div>\`;

if (c.includes('HEADER')) {
  c = c.replace(old, newHeader);
  console.log('Grafici header replaced');
} else { console.log('Grafici NOT found'); }

// Fix scrollable area top padding
c = c.replace('flex-1 overflow-y-auto no-scrollbar space-y-4 pt-4 pb-32', 'flex-1 overflow-y-auto no-scrollbar space-y-4 pt-4 pb-32');

fs.writeFileSync('src/components/GraficiTab.tsx', c);
console.log('Grafici done');
"

echo "All done!"
