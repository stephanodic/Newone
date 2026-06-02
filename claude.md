# 🤖 MoneyTrack — Regole per Claude Code

MoneyTrack è una PWA multi-wallet condivisa, rigorosamente mobile-first (`max-w-[390px]`).
**STACK**: React 19, TS, Vite, Tailwind v4, Firestore, motion/react, date-fns(it), Sonner 1.8s.

---

## REGOLE INVIOLABILI

1. **UI solo per viewport 390px** — ogni componente deve funzionare perfettamente su mobile
2. **Query ESCLUSIVAMENTE su** `/wallets/{walletId}/...` — mai su `users/{uid}/`
3. **Categorie** — usa SEMPRE `resolveCategory(t.category, categories)` da `src/lib/utils.ts`
4. **Haptic** — chiama SEMPRE `haptic.*` o `navigator.vibrate?.(N)` su ogni elemento cliccabile
5. **Toast** — notifica SEMPRE l'esito di operazioni async con `sonner` (duration: 1800ms)
6. **Colori** — usa SEMPRE `COLORS` da `src/styles/tokens.ts`, mai hex hardcoded
7. **Leggi prima** — prima di ogni modifica leggi i file coinvolti con Read o grep

---

## Comandi Sviluppo
```bash
npm run dev          # server locale
npm run build        # build produzione
npm run preview      # preview build
npm run test         # Vitest
npm run coverage     # copertura test
```

---

## Linee Guida Codice

### Componenti
- Arrow function TypeScript (TSX)
- `memo()` su ogni componente con props stabili
- `cn(...)` per classi Tailwind condizionali (clsx + tailwind-merge)

### Haptic (in ordine crescente)
```ts
haptic.light()    // tasti numpad, navigazione → vibrate(6)
haptic.medium()   // selezioni, swipe → vibrate(12)
haptic.success()  // submit riuscito
haptic.warning()  // apertura modal
haptic.heavy()    // azioni distruttive → vibrate(25)
```

### Toast
```ts
toast.success('...', { duration: 1800 })
toast.error('...',   { duration: 1800 })
toast.loading('...')  // per operazioni async lunghe
```

### Date
```ts
// ✅ Corretto
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
format(parseISO(t.date), 'dd MMM yyyy', { locale: it })

// ❌ Mai fare
new Date().toLocaleDateString()
```

### Firestore
```ts
// ✅ Solo istanze da firebase.ts
import { db, auth } from '../services/firebase';

// ❌ Mai reinizializzare
initializeApp(...)  // solo in firebase.ts
```

### Animazioni
```ts
// Transizioni standard
transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.75 }}

// Bottom sheet
transition={{ type: 'spring', damping: 26, stiffness: 220 }}

// Micro interazioni
transition={{ type: 'spring', stiffness: 400, damping: 20 }}
```

---

## Pattern da Seguire

### Bottom sheet
```tsx
<motion.div
  initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
  transition={{ type: 'spring', damping: 26, stiffness: 220 }}
  className="fixed bottom-0 w-full max-w-[390px] bg-white dark:bg-slate-800 rounded-t-[28px]"
  style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
>
```

### Bottone touch
```tsx
<button
  onClick={() => { haptic.medium(); doSomething(); }}
  className="active:scale-95 transition-all rounded-2xl"
>
```

### Spinner loading
```tsx
<div className="w-5 h-5 border-2 border-emerald-400/40 border-t-emerald-500 rounded-full animate-spin" />
```

### Divisore verde
```tsx
<div className="flex items-center gap-3 my-3">
  <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-[#1D9E75] to-transparent opacity-30 rounded-full" />
  <span className="text-[8px] font-black text-[#1D9E75] uppercase tracking-widest">Label</span>
  <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-[#1D9E75] to-transparent opacity-30 rounded-full" />
</div>
```

---

## ⚠️ Errori Comuni da Evitare

| Sbagliato | Corretto |
|-----------|---------|
| `categories.find(c => c.name === t.category)` | `resolveCategory(t.category, categories)` |
| `color: '#1D9E75'` hardcoded | `import { COLORS } from '../styles/tokens'` |
| `users/{uid}/transactions` | `wallets/{walletId}/transactions` |
| `new Date().toLocaleString()` | `format(parseISO(date), '...', { locale: it })` |
| Nessun haptic su bottone | `haptic.light()` o `navigator.vibrate?.(6)` |
| Toast senza duration | `{ duration: 1800 }` |
| `any` nei tipi | `CreateTransactionInput`, `UpdateTransactionInput`, `CategoryFormData` |

---

## ⚠️ Gestione Contesto — REGOLA OBBLIGATORIA

Quando sei all'**80% del contesto disponibile**, interrompiti e scrivi:

```
⚠️ CONTESTO ALL'80%
```

Poi esegui subito:
```bash
npm run build && git add . && git commit -m "wip: checkpoint" && git push
```

Poi di' all'utente:
```
Apri una nuova sessione Claude Code con /exit + claude
e incolla il prossimo task.
```

Non aspettare che il contesto si esaurisca — a 80% c'è ancora spazio per committare ma non per altro lavoro utile.
