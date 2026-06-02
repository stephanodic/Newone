# MoneyTrack V3 — Specifiche & Architettura del Progetto

## Stack Tecnologico Core
React 19, TypeScript, Vite, Tailwind CSS v4, Firebase (Auth + Firestore persistent cache), motion/react (Framer Motion), date-fns (locale it), Lucide React, Sonner (toast), @tanstack/react-virtual.

## Architettura delle Cartelle
- `src/components/` — Componenti di feature, visualizzazione e layout
- `src/components/ui/` — Componenti tipografici e atomici puri
- `src/hooks/` — Logica di sincronizzazione, engine di calcolo e gesture
- `src/context/` — Provider globali (TransactionsContext, WalletContext, UIContext)
- `src/utils/` — Helper puri (exportCSV.ts)
- `src/lib/` — Utility di sistema (cn, haptic, stats, validate, writeRateLimiter)
- `src/styles/` — Design tokens (tokens.ts, tokens.css, floating-chip.css, bring-layout.css)

## Database & Firestore Paths (Struttura Multi-Wallet)
L'app è multi-wallet. Tutte le query vanno sui path del wallet corrente, MAI sotto `users/{uid}/`.
- `/wallets/{walletId}` — Documento wallet: `ownerId`, `members[]`, `memberEmails[]`, `pendingInvites[]`
- `/wallets/{walletId}/transactions/{id}` — Movimenti finanziari
- `/wallets/{walletId}/categories/{id}` — Categorie personalizzate
- `/wallets/{walletId}/shoppingList/{id}` — Lista spesa condivisa
- `/invites/{email}` — Inviti pendenti (email lowercase)

## Colori Brand (src/styles/tokens.ts)
```ts
export const COLORS = {
  primary: '#1D9E75',
  primaryLight: '#11cc98',
  bgLight: '#F5F5F0',
  danger: '#E24B4A',
}
```
NON usare i colori hardcoded nei componenti — importa sempre COLORS.

## API Pubbliche dei Context & Custom Hook
- `useTransactions` (→ `TransactionsContext`) — stream live Firestore (max 500), stats, balance, mutazioni
- `useWallet` (→ `WalletContext`) — wallet init, membri, inviti
- `useShoppingList` — sync lista spesa real-time
- `useUI` (→ `UIContext`) — tab attiva, sheet/modal aperti, dark mode (localStorage)
- `useSwipeNavigation` — swipe orizzontale tra tab
- `usePullToRefresh` — pull-to-refresh custom
- `useTransactionHandlers` — submit, export CSV, debounce update
- `useLongPress` — long press generico riutilizzabile

## Regole di Validazione (`src/lib/validate.ts`)
- Importo max: `999.999 €` (`LIMITS.AMOUNT_MAX`)
- Nota max: `500` caratteri (`LIMITS.NOTE_MAX`)
- Categorie: max **30** uscite, max **20** entrate
- Membri wallet: max **5**
- Rate limiter: max **30** scritture/minuto client-side

## Convenzioni di Stile Obbligatorie
- **Viewport**: `max-w-[390px]`, `h-[100dvh]`, `overscroll-behavior: none`
- **Colori**: da `tokens.ts` — primary `#1D9E75`, light `#11cc98`, bg `#F5F5F0`, dark `slate-900`
- **Haptic** (in ordine di intensità):
  - `haptic.light()` o `navigator.vibrate(6)` → tap su tasti/navigazione
  - `haptic.medium()` o `navigator.vibrate(12)` → selezione/conferma
  - `haptic.success()` → submit riuscito
  - `haptic.warning()` → apertura modal
  - `haptic.heavy()` o `navigator.vibrate(25)` → azione distruttiva
- **Toast**: `sonner`, duration `1800ms`, `richColors: true`, position `top-center`
- **Date**: salva ISO 8601 o Timestamp su Firestore, usa `date-fns` con `locale: it` per display
- **Categorie**: usa SEMPRE `resolveCategory(t.category, categories)` da `src/lib/utils.ts`

## Navigazione & Tab
```ts
TABS = ["dashboard", "history", "shopping", "charts", "categories", "profile"]
```
- BottomNav: 5 tab visibili (no profile) + FAB bianco `+` sopra la barra (`-mt-6 -mb-5`)
- FAB: sempre `+`, mai `×`, `scale-105` + anello verde quando sheet aperto
- Profilo: accessibile da avatar in header di ogni schermata

## Tipi TypeScript Principali
```ts
type CreateTransactionInput = Omit<Transaction, 'id' | 'createdAt'>
type UpdateTransactionInput = Partial<Omit<Transaction, 'id' | 'userId'>>
type CategoryFormData = Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
RecurrenceInterval: 'NONE' | 'DAILY' | 'WEEKLY' | 'BIMONTHLY' | 'MONTHLY'
```

## Feature Implementate ✅

### Dashboard
- Header verde con saldo + entrate + uscite (no card bianca separata)
- Griglia categorie 60% spese / 40% entrate, scroll indipendente
- Divisore verde tra spese e entrate
- Categorie ordinate per frequenza d'uso (decay 90gg, `sortCategoriesByUsage`)
- Pull-to-refresh custom

### Cronologia (ListaTab)
- Saldo cumulativo per periodo
- Ricerca debounced 300ms per categoria/nota/importo
- Swipe-to-delete + undo toast
- Virtualizzazione @tanstack/react-virtual

### Nuova Spesa (TransactionForm)
- Numpad fisso 4×4: `7 8 9 −` / `4 5 6 +` / `1 2 3 Oggi` / `, 0 ⌫ OK`
- Oggi (verde), OK (rosso spese / verde entrate) fa submit diretto
- Supporto espressioni: `10+5 → 15`
- Ricorrenza: DAILY, WEEKLY, BIMONTHLY, MONTHLY
- Tutte le categorie nel picker, ordinate per frequenza

### Lista Spesa (ListaSpesaTab) — stile Bring!
- "Da prendere" + "Utilizzato di recente" con toggle bidirezionale silent
- Chip 44px, suggestion chip sotto input, icona-lettera colorata fallback
- Long press 600ms → EditModal (nome, icona, quantità)
- CSS: `floating-chip.css` + `bring-layout.css`

### Categorie (CategorieTab)
- Ordinate per frequenza automaticamente (sortCategoriesByUsage)
- Niente drag-and-drop, niente popup conferma
- "Ripristina": `writeBatch` cancella esistenti → re-seed
- Seed: 21 spese + 9 entrate (icone Lucide verificate)

### Grafici (GraficiTab)
- Donut chart distribuzione categorie
- Trend mensile entrate vs uscite 6 mesi

### Transaction Detail
- Swipe tra transazioni nel dettaglio
- Aggiunta/modifica ricorrenza post-inserimento

### Profilo (ProfiloTab)
- Forza aggiornamento (SW 3 livelli + cache API + IndexedDB + localStorage)
- Spinner + vibrazione su Ripristina/Pulisci
- Rimozione membro wallet con modal conferma
- Export CSV con selettore periodo

### Onboarding (OnboardingGuide)
- 7 slide al primo accesso (flag: `localStorage.getItem('onboardingDone')`)
- Slide 1: Benvenuto | 2: + spesa | 3: Dashboard | 4: Lista spesa
- Slide 5: Grafici | 6: Wallet condiviso | 7: Come aggiornare iOS/Android
- Riapribile da Profilo → "Guida app" (BookOpen)

### Auth
- Google login + accesso ospite (Firebase anonymous)
- `likelySigned` flag per evitare flash login screen

## Seed Categorie Default

### SPESE (21)
```
Mangiar fuori (Utensils #FF6B35), Cibo (ShoppingBasket #FF9F1C),
Casa (Home #2EC4B6), Shopping (ShoppingBag #E71D36),
Casalinghi (WashingMachine #F4A261), Condominio (Building2 #8B5CF6),
Sorgenia (Zap #F59E0B), ACEA acqua (Droplets #38BDF8),
Telefono (Smartphone #6366F1), Vodafone casa (Wifi #EC4899),
Bellezza (Sparkles #F472B6), Disneyplus (Tv2 #1D4ED8),
Psico (Brain #A78BFA), Sport (Dumbbell #10B981),
Mutuo (Landmark #78716C), Auto (Car #64748B),
Viaggi (Plane #0EA5E9), Salute (HeartPulse #EF4444),
Regali (Gift #F97316), Bambini (Baby #FBBF24),
Istruzione (GraduationCap #14B8A6)
```

### ENTRATE (9)
```
Stipendio (Banknote #22C55E), NASPI (HandCoins #3B82F6),
Assegno Unico (HeartHandshake #F59E0B), Rimborsi (ArrowLeftRight #10B981),
Paypal (Wallet #2563EB), Investimenti (TrendingUp #8B5CF6),
Premi (Trophy #F59E0B), Part-time (Clock #06B6D4),
Altri (CircleDollarSign #6B7280)
```

## PR Completati ✅
- **PR-A**: BottomNav FAB + 5 tab + navigazione
- **PR-B**: ListaSpesaTab Bring-style
- **PR-C**: TransactionForm numpad 4×4 + campo note
- **PR-D**: CategorieTab fix (no drag, no popup) + seed + ordinamento
- **PR-E**: ProfiloTab fix + Dashboard 60/40
- **PR-F**: Refactor App.tsx → useSwipeNavigation, usePullToRefresh, useTransactionHandlers
- **PR-G**: tokens.ts centralizzato + tipi TypeScript precisi
- **PR-H**: TransactionsContext + WalletContext
- **PR-I**: Virtualizzazione ListaTab + aria-label

## ⚠️ Gestione Contesto — REGOLA OBBLIGATORIA

Monitora sempre il livello di contesto durante la sessione.
Quando raggiungi **80% del contesto disponibile**, interrompiti immediatamente e scrivi:

```
⚠️ CONTESTO ALL'80% — Checkpoint obbligatorio:
1. Salvo il lavoro fatto finora
2. Apri nuova sessione per continuare
```

Poi esegui:
```bash
npm run build && git add . && git commit -m "wip: checkpoint sessione" && git push
```

Poi nella nuova sessione:
```bash
# Riapri Claude Code
/clear   # o apri nuovo terminale con 'claude'
```

**Non aspettare che il contesto si esaurisca** — a 80% c'è ancora spazio per il commit ma non per altro lavoro utile.

## Rigenera app_completa.md
```bash
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) \
  | sort | while read f; do echo "=== $f ==="; cat "$f"; echo ""; done > app_completa.md
```
