# Changelog — MoneyTrack V3

Tutte le modifiche notevoli al progetto, in ordine cronologico inverso.

---

## 2026-06-01

- feat: bounce icone categoria al tap (whileTap scale 0.85)
- feat: swipe mese solo sull'header Dashboard (non interfere con scroll griglia)
- refactor: prop drilling ListaTab 18→10 props via TransactionsContext
- refactor: prop drilling ProfiloTab 14→7 props via WalletContext
- feat: budget mensile per categoria con barra colorata in CategorieTab
- feat: toast alert budget 80% e 100% dopo salvataggio spesa
- refactor: split AddTransactionModal in 4 sotto-componenti
- refactor: prop drilling GraficiTab, Dashboard, CategorieTab via context
- chore: eliminato TransactionForm.tsx (dead code)

---

## [Sessione 2026-06-01 pt.2] — commit `4a57aa6`

### Feat — Budget per categoria: UI + toast alert

#### CategorieTab — Budget overview (`1b60d20`)
- **Sezione "Budget mensile"** in cima allo scroll, visibile solo se almeno una categoria ha `monthlyLimit` impostato
  - Card per ogni categoria con budget: icona, nome, importo `speso / limite`, barra colorata
  - Verde < 80%, ambra 80–99%, rosso ≥ 100% con icona `AlertTriangle`
  - Tap sulla card → apre `CategoryEditor` direttamente per modificare il limite
- **Mini barra budget (2 px)** sotto ogni icona di categoria USCITE con `monthlyLimit` nella griglia a 5 colonne — identica a quella già presente in Dashboard
- Fix: importazione esplicita `Transaction` in `CategorieTab.tsx` (era usata nella firma di `sortCategoriesByUsage` ma non importata)

#### AddTransactionModal — Toast alert budget (`4a57aa6`)
- Dopo il submit riuscito di una spesa, se la categoria ha `monthlyLimit > 0`:
  - **≥ 80%**: `toast.warning("⚠️ Hai usato l'X% del budget di [categoria]")` + `haptic.warning` — 3 s
  - **≥ 100%**: `toast.error("🔴 Budget superato per [categoria]!")` + `haptic.heavy` — 4 s
- Il toast appare **dopo** il checkmark di conferma (700 ms), non prima — il modal è già chiuso quando il toast compare
- Il calcolo usa il totale mensile corrente (`stats.categoryBreakdown`) + l'importo appena inserito, così riflette il valore aggiornato anche prima del refresh Firestore

---

## [Sessione 2026-06-01] — commit `5e4ddff` (refactoring AddTransactionModal)

### Refactor — Split AddTransactionModal (567 → 355 righe)

Piano in 5 step, tutti completati nella stessa sessione.

| Commit | Step | Operazione |
|---|---|---|
| `ae2ed37` | 1+2 | Elimina `TransactionForm.tsx` (428 righe dead code) + crea `TransactionHeader.tsx` |
| `6aea967` | 3 | Crea `TransactionCategoryPicker.tsx` (griglia full + strip compatta) |
| `f65245a` | 4 | Crea `TransactionNoteDate.tsx` (importo, nota, tag, ricorrenza) |
| `5e4ddff` | 5 | Crea `TransactionNumpad.tsx` + rimuove `pressDouble0` dead code |

**Nuovi sotto-componenti** (tutti in `src/components/`):

- **`TransactionHeader`** (68 righe) — gradiente verde, logo, back/close, switch Spese/Entrate. Props: `step`, `type`, `selectedCatName`, `onBack`, `onClose`, `onSwitchType`. Zero stato interno.
- **`TransactionCategoryPicker`** (65 righe) — `variant="full"` griglia 4-col con spinner di caricamento; `variant="strip"` strip compatta 4×2 per lo step calculator. Props: `categories`, `selectedCatId`, `onPick`, `variant`.
- **`TransactionNoteDate`** (116 righe) — display importo colorato, operatore pending, campo nota, tag input con chip e backspace, toggle ricorrenza, griglia intervalli (WEEKLY/MONTHLY/BIMONTHLY/DAILY). 17 props, zero stato interno.
- **`TransactionNumpad`** (95 righe) — griglia 4×4, helper `K` e `opStyle`/`digitStyle` locali al componente. Props: `activeOp`, `canSave` (pre-calcolato dal parent), `date`, callbacks per digit/op/dot/back/save/today.

**`AddTransactionModal`** è ora un controller puro: stato, handler (`pressDigit`, `pressOp`, `pressEquals`, `addTag`, `switchType`, `pickCat`), logica submit con budget alert, composizione dei 4 sotto-componenti.

**Pulizia contestuale:**
- Rimosso `pressDouble0` (dead code — tasto `00` mai aggiunto al numpad)
- Rimossi import inutilizzati: `format`, `isToday`, `it`, `cn`, `Repeat`, `XIcon`, `ChevronLeft`, `headerGradient`

---

## [Sessione 2026-06-01] — commit `480dc0f`

### Fix architetturale — BottomNav in-flow (non fixed)
- **Causa root**: `BottomNav` era `position: fixed; z-index: 9999` — `main` (flex-1) occupava tutta l'altezza dello schermo e qualsiasi contenuto (scrollabile, assoluto, picker categorie) finiva sotto la barra
- **Fix**: rimosso il wrapper `position: fixed` da `BottomNav.tsx`; la nav è ora nel normale flusso flex. `main` si ferma automaticamente sopra la BottomNav — impossibile per qualsiasi contenuto finirci sotto
- Tutti i `pb-[calc(env(safe-area-inset-bottom)+5.5rem)]` (introdotti nel commit precedente come compensazione) ridotti a `pb-4` in `Dashboard.tsx`, `ListaTab.tsx`, `GraficiTab.tsx`, `CategorieTab.tsx`, `ProfiloTab.tsx`, `ListaSpesaTab.tsx`

---

## [Sessione 2026-06-01] — commit `6ae97ae`

### Fix
- **BUG 1 — Padding BottomNav** (`pb-[calc(env(safe-area-inset-bottom)+5.5rem)]`)
  - Sostituiti tutti i padding fissi (`pb-20`, `pb-24`, `pb-32`) nei container scrollabili
  - File aggiornati: `Dashboard.tsx`, `ListaTab.tsx`, `GraficiTab.tsx`, `CategorieTab.tsx`, `ProfiloTab.tsx`, `ListaSpesaTab.tsx`
  - Il contenuto non viene più coperto dalla BottomNav su iPhone con safe area

- **BUG 2 — Empty state Dashboard**
  - Emoji `💸` → `🗓️` (meno ambigua, non sembra un errore)
  - Testo: "Nessuna spesa questo mese" → "Nessuna transazione questo mese"
  - File: `src/components/Dashboard.tsx`

- **BUG 3 — Recap settimanale / sezione Grafici non visibile**
  - Risolto come conseguenza del fix BUG 1 (GraficiTab `pb-32` → safe area)
  - File: `src/components/GraficiTab.tsx`

- **BUG 4 — Mese vuoto: tasto `+` → spinner infinito**
  - Il tasto `+` nell'empty state di Cronologia ora apre un bottom sheet con griglia categorie
  - Griglia divisa: **Spese** (separatore rosso) + **Entrate** (separatore verde)
  - Tap su categoria → chiude il picker, apre `AddTransactionModal` con categoria preselezionata
  - Se le categorie non sono ancora caricate → spinner centrato (no freeze)
  - Aggiornata la firma `onAddClick?: (type, categoryId?) => void` nell'interfaccia `ListaTabProps`
  - File: `src/components/ListaTab.tsx`

---

## [Sessione ~2026-05-30] — commit `a1dd351`

### Fix
- Rimosso swipe-to-delete dalla Cronologia (causava eliminazioni accidentali)

---

## [Sessione ~2026-05-30] — commit `dfb4527`

### Fix
- React error #300 in `useTransactions`
- Guard `uid` vuoto aggiunto all'hook per evitare query Firestore senza autenticazione

---

## [Sessione ~2026-05-30] — commit `a25cdef`

### Aggiunto
- Skeleton loading righe in `ListaTab`
- Checkmark animato su salvataggio transazione
- Empty state illustrato in `ListaTab` e `GraficiTab`

---

## [Sessione ~2026-05-30] — commit `75cf115`

### Aggiunto / Fix
- Task 1: icone migrate al nuovo formato `CategoryIcon` (Lucide)
- Task 3: animazione `countUp` sulle budget card in Dashboard

---

## [Sessione 10 — ~2026-05-29] — commit `96c95d0`

### Aggiunto
- Offline mode migliorato: banner `OfflineBanner` con `hasPendingWrites` + `lastSyncedAt`
- Toast "Salvato offline 📡" al submit in assenza di connessione

---

## [Sessione 8 — ~2026-05-29] — commit `d23faa4`

### Aggiunto
- Tag personalizzati su transazioni (max 3, filtrabili in Cronologia)
- Dark mode audit: tutti i componenti aggiornati per consistenza

---

## [Sessione 7 — ~2026-05-29] — commit `7df11b1`

### Aggiunto
- Tema colore selezionabile da Profilo (palette `THEMES` in `src/lib/theme.ts`)
- Swipe orizzontale sull'importo in `TransactionDetail` per modifica rapida
- Grafico 12 mesi (barre affiancate + linea Saldo) in `GraficiTab`

---

## [Sessione 6 — ~2026-05-28] — commit `636555d`

### Aggiunto
- Export PDF (`src/utils/exportPDF.ts`, html2canvas + jsPDF)
- PWA shortcuts: `?action=add-expense` per aprire direttamente il form spesa

---

## [Sessione 5 — ~2026-05-28] — commit `f1f2d3a`

### Aggiunto
- `WeeklyRecap`: popup lunedì mattina con riepilogo settimana precedente
- Suggerimento ricorrenza: toast dopo N spese nella stessa categoria nello stesso mese
- `src/lib/stats.ts`: `computeWeeklyRecap`, `shouldSuggestRecurrence`

---

## [Sessione 4 — ~2026-05-28] — commit `85a6591`

### Aggiunto / Performance
- GPU acceleration sulle tab (`willChange`, `backfaceVisibility`)
- Punto verde animato (animate-pulse) sulle categorie usate oggi in Dashboard
- `whileTap scale:0.82` su tutte le icone categoria Dashboard
- Pattern haptic avanzati: `success [50,30,50]`, `warning` crescente, `error` 3 rapide, `heavy` 150ms

---

## [Sessione 3 — ~2026-05-28] — commit `1709a69`

### Aggiunto
- **T3-A Skeleton loading**: 7 righe shimmer in `ListaTab`, cerchi in `CategorieTab`
- **T3-B Long press transazione**: context menu con Duplica / Modifica / Ricorrenza / Elimina
- **T3-D Ricerca globale**: bypass del filtro periodo quando la searchbar ha testo; badge "tutti"

---

## [Sessione 2 — ~2026-05-27] — commit `10cbd9c`

### Aggiunto
- Budget mensile per categoria: campo `monthlyLimit` + barra avanzamento in Dashboard
- Alert budget: card rossa/gialla nelle budget card quando soglia superata/vicina
- Swipe mese direttamente sulla Dashboard (swipe orizzontale sull'header)

---

## [Sessione 1 — ~2026-05-27] — commit `56bac34`

### Aggiunto
- Animazione `countUp` su saldo, entrate, uscite (`src/hooks/useCountUp.ts`)
- Empty state illustrato in Dashboard con SVG + bottone `+` animato
- Animazione checkmark al salvataggio transazione

---

## Sessione fondativa — commit `2dcaf31` e precedenti

### Architettura
- React 19 + TypeScript + Vite + Tailwind CSS v4
- Firebase Auth (Google + guest) + Firestore multi-wallet
- Struttura path: `wallets/{walletId}/transactions|categories|shoppingList`
- `src/context/`: `TransactionsContext`, `WalletContext`, `UIContext`
- `src/hooks/`: `useTransactions`, `useWallet`, `useAuth`, `useShoppingList`, `useSwipeNavigation`, `usePullToRefresh`, `useTransactionHandlers`, `useLongPress`
- `src/lib/`: `utils.ts` (resolveCategory 4-step), `haptic.ts`, `stats.ts`, `validate.ts`, `theme.ts`

### Feature core
- **Dashboard**: header verde, griglia categorie 5 colonne, separatori Uscite/Entrate, voce (useVoiceInput)
- **Cronologia**: virtualizzazione @tanstack/react-virtual, ricerca debounce, saldo cumulativo, separatori sezione
- **Lista spesa**: stile Bring! — chip 44px, suggestion, long-press EditModal, toggle bidirezionale
- **Categorie**: ordinamento per frequenza (decay 90gg), seed 21 spese + 9 entrate, ripristina batch
- **Grafici**: donut spese, trend 6 mesi (area), trend 12 mesi (barre + linea saldo)
- **Profilo**: dark mode, tema, export CSV/PDF, invite membri wallet, onboarding, forza SW update
- **TransactionDetail**: swipe tra transazioni, edit inline, ricorrenza sempre visibile
- **OnboardingGuide**: 7 slide, localStorage, riapribile da Profilo
- **PWA**: Service Worker (vite-plugin-pwa), offline cache, banner aggiornamento

### Convenzioni fisse
- Viewport: `max-w-[390px]`, `h-[100dvh]`
- Colori brand: `#1D9E75` primary, `#11cc98` light, `#F5F5F0` bg, `#E24B4A` danger
- Toast: Sonner, 1800ms, `richColors`, `top-center`
- COOP/COEP in `vercel.json`: `same-origin-allow-popups` + `unsafe-none`
