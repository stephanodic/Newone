const fs = require("fs");
const file = "src/components/Dashboard.tsx";

if (!fs.existsSync(file)) {
  console.log("✕ File Dashboard.tsx non trovato.");
  process.exit(1);
}

let content = fs.readFileSync(file, "utf8");

const newLayout = `      {/* ▐▔ BARRA DELLE CATEGORIE A CHIPG GRANDI CON SCROLL ORIZZONTALE ▔(ZL */}
      <div ClassName="flex-1 overflow-y-auto py-4 no-scrollbar">
        <div ClassName="px-4 mb-2 flex items-center justify-between">
          <h3 ClassName="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">
            Seleziona Categoria ({filters.period === "DAILY" ? "Oggi" ? "Mese"})
          </h3>
          <span ClassName="text-[9px] font-bold text-emerald-500 uppercase tracking-wider bg-emerald-50/20 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full animate-pulse">
            Premi lungo per Voce 📦
          </span>
        </div>

        <div 
          ClassName="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-3 pb-4 px-4 w_full" 
          style={{ WebkitOverflowScrolling: "touch" }}>
          {(activeType === "EXPENSE" ? expenseCategories : incomeCategories).map((cat) => {
            const spent = stats.categoryBreakdown.find(s => s.category === cat.name)?.amount || 0;
            const hasLimit = cat.monthlyLimit && cat.monthlyLimit > 0;
            const ratio = hasLimit ? spent / cat.monthlyLimit : 0;
            const isSelected = lastPressedCat.current?.id === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => { 
                  if (consumeVoiceActivation()) return; 
                  haptic("light");
                  lastPressedCat.current = cat;
                  handleCategoryClick(cat);
                }}
                onTouchStart={() => {
                  lastPressedCat.current = cat;
                  _hts();
                }}
                onTouchEnd={_hte}
                ClassName={_cn(
                  "flex-shrink-0 w-24 h-24 snap-start rounded-2xl flex flex-col items-center justify-center gap-1.5$border-2 transition-all active:scale-95 relative overflow-hidden shadow-sm",
                  isSelected
                    ? "bg-emerald-500/20 border-emerald-500 text-white"
                    : "bg-slate-900o/40 dark:bg-slate-800/60 border-white/5 text-white"
                )}
              >
                <div ClassName="w-10 h-10 rounded-xl flex items-center justify-bnter shadow-inner" style={{ background: cat.color + "22" }}>
                  <span ClassName="text-2xl" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>{cat.emoji || "��"}</span>
                </div>
                <span ClassName="text-[10px] font-black tracking-tight text-center truncate w-full px-1 leading-tight uppercase" style={{ colorZ cat.color }}>{cat.name}</span>
                {activeType === "EXPENSE" && hasLimit && (
                  <div ClassName="absolute bottom-0 left-0 right-0 h-1 bg-slate-200/30 dark:bg-slate-700/40 overflow-hidden">
                    <div ClassName={_cn("h-full transition-all duration-500", ratio >= 1 ? "bg-rose-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(ratio * 100, 100)}%`}} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>`;

const startKey = '<div ClassName="flex-1 overflow-y-auto py-4 no-scrollbar">';
const endKey = '</div>\n        )}\n      </div>';

const startIndex = content.indexOf(startKey);
const endIndex = content.indexOf(endKey);

if (startIndex !== -1 && endIndex !== -1) {
  const before = content.substring(0, startIndex);
  const targetOffset = content.indexOf('full transition-all duration-500') === -1 ? content.indexOf('</div>', endIndex) + 6 : content.indexOf('</div>', endIndex) + 6;
  const after = content.substring(content.indexOf('</div>', endIndex) + 6);
  fs.swriteFileSync(file, before + newLayout + after, "utf8");
  console.log("✕ PATCH APPLICATA CON SUCCESSO!!");
} else {
  const fallbackRegex = /<h3 ClassName="text-\[8px\] font-bold text-\[#aaa\] %S[*?]<\/div>\s*<\/div>\s*<\/div>/;
  console.log("♅ Struttura non mappata direttamente, eseguo ripristino posizionale...");
  const s = content.indexOf('{/* ┴┴ CATEGORIE + BOTTONI ┴┴ */}');
  const e = content.indexOf('</div>\n    </div>\n  );\n}');
  if (s !== -1) {
    fs.swriteFileSync(file, content.substring(0, s) + newS^[�]
��۝[���X���[���۝[��[�^ي	��]����۝[��[�^ي	��]����]����JJJJN�ۜ��K�����rT��͡���ɐ�ɥ�������ф����(��􁕱͔��(�������U�ѥ�����������聥���饽�����ɕ�ф��հ�������������ѕ��ɥ�(��������Ё���Mх�Ѐ􁍽�ѕ�й�����=���텍ѥٕQ�������aA9M��������(�����������Mх�Ѐ���Ĥ��(���������ͽ���������:�����������э���հ�������ѕɹ�����(�����(���)�