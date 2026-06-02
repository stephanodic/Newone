/**
 * MoneyTrack — Prompt snippets per Claude Code
 *
 * Copia e incolla questi blocchi in Claude Code IDX
 * per task comuni, senza riscrivere le istruzioni ogni volta.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SKILL: NUOVA FEATURE
// ─────────────────────────────────────────────────────────────────────────────
/*
Prima di scrivere codice:
1. Leggi ISTRUZIONI-PROGETTO.md
2. Leggi i file coinvolti (Read o grep)
3. Scrivi un piano di massimo 3 step
4. Esegui un step alla volta e attendi conferma

Regole:
- UI solo 390px mobile-first
- Query su /wallets/{walletId}/ mai su users/{uid}/
- haptic.* su ogni elemento cliccabile
- toast.* su ogni operazione async (duration: 1800)
- COLORS da tokens.ts, mai hex hardcoded
- resolveCategory() per le categorie
*/

// ─────────────────────────────────────────────────────────────────────────────
// SKILL: FIX BUG
// ─────────────────────────────────────────────────────────────────────────────
/*
1. Mostrami il codice del file coinvolto (non modificare ancora)
2. Dimmi qual è la causa del bug
3. Proponi il fix minimo necessario senza toccare altro
4. Applica solo dopo conferma
*/

// ─────────────────────────────────────────────────────────────────────────────
// SKILL: REFACTOR
// ─────────────────────────────────────────────────────────────────────────────
/*
Refactoring: tocca SOLO i file elencati, non propagare modifiche ad altri.
Verifica che npm run build funzioni dopo ogni file modificato.
Non cambiare il comportamento visibile — solo la struttura interna.
*/

// ─────────────────────────────────────────────────────────────────────────────
// SKILL: NUOVO COMPONENTE
// ─────────────────────────────────────────────────────────────────────────────
/*
Crea src/components/NomeComponente.tsx con queste regole:
- React.memo() sul componente
- Props tipizzate con interface NomeComponenteProps
- haptic su ogni bottone touch
- active:scale-95 transition-all su ogni elemento cliccabile
- dark: varianti su tutti i colori
- safe-area-inset su padding bottom se è un overlay/sheet
- Esporta come default
*/

// ─────────────────────────────────────────────────────────────────────────────
// SKILL: NUOVO HOOK
// ─────────────────────────────────────────────────────────────────────────────
/*
Crea src/hooks/useNomeHook.ts:
- Importa db e auth SOLO da src/services/firebase.ts
- Usa query su /wallets/{walletId}/ non su users/{uid}/
- Gestisci sempre il caso walletId === null (return early)
- Esponi loading state per ogni operazione async
- Usa useCallback per tutte le funzioni esposte
*/

// ─────────────────────────────────────────────────────────────────────────────
// SKILL: PUSH FINALE
// ─────────────────────────────────────────────────────────────────────────────
/*
npm run build && git add . && git commit -m "feat/fix: descrizione" && git push
*/

// ─────────────────────────────────────────────────────────────────────────────
// SKILL: RIGENERA APP_COMPLETA
// ─────────────────────────────────────────────────────────────────────────────
/*
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) \
  | sort | while read f; do echo "=== $f ==="; cat "$f"; echo ""; done > app_completa.md
*/

// ─────────────────────────────────────────────────────────────────────────────
// SKILL: VERIFICA PR
// ─────────────────────────────────────────────────────────────────────────────
/*
Leggi i seguenti file e dimmi per ogni punto della checklist se è già fatto o manca:
[incolla qui la checklist del PR]

NON modificare nulla — solo analisi.
*/

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN: BOTTOM SHEET
// ─────────────────────────────────────────────────────────────────────────────
/*
<motion.div
  className="fixed inset-0 z-[9999] flex items-end justify-center"
  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
>
  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
  <motion.div
    className="relative w-full max-w-[390px] bg-white dark:bg-slate-800 rounded-t-[28px] z-10"
    initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
    transition={{ type: 'spring', damping: 26, stiffness: 220 }}
    style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
    onClick={e => e.stopPropagation()}
  >
    <div className="w-10 h-1 bg-slate-200 dark:bg-slate-600 rounded-full mx-auto mt-4 mb-4" />
    {/* contenuto */}
  </motion.div>
</motion.div>
*/

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN: SPINNER LOADING
// ─────────────────────────────────────────────────────────────────────────────
/*
{isLoading
  ? <div className="w-5 h-5 border-2 border-emerald-400/40 border-t-emerald-500 rounded-full animate-spin" />
  : <IconName size={20} />
}
*/

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN: DIVISORE VERDE
// ─────────────────────────────────────────────────────────────────────────────
/*
<div className="flex items-center gap-3 my-3 px-1">
  <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-[#1D9E75] to-transparent opacity-30 rounded-full" />
  <span className="text-[8px] font-black text-[#1D9E75] uppercase tracking-widest">Label</span>
  <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-[#1D9E75] to-transparent opacity-30 rounded-full" />
</div>
*/
