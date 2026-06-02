import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { collection, getDocs, deleteDoc, doc, writeBatch, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { exportToCSV, ExportPeriod } from '../utils/exportCSV';
import { exportToPDF } from '../utils/exportPDF';
import { Transaction, Category, Wallet } from '../types';
import { Trash2, LogOut, ChevronRight, Share, FileText, Sun, Moon, Sparkles, Users, UserPlus, Mail, X as XIcon, Send, RefreshCw, RotateCcw, BookOpen, Palette } from 'lucide-react';
import { THEMES, type ThemeKey, getStoredTheme, applyTheme, headerGradient } from '../lib/theme';
import { toast } from 'sonner';
import { useUI } from '../context/UIContext';
import { useTransactionsContext } from '../context/TransactionsContext';
import { useWalletContext } from '../context/WalletContext';
import { MAX_WALLET_MEMBERS } from '../hooks/useWallet';
import { DEFAULT_CATEGORIES_EXPENSE, DEFAULT_CATEGORIES_INCOME } from '../utils/constants';
import { cn } from '../lib/utils';
import { haptic } from '../lib/haptic';

interface ProfiloTabProps {
  user: User | null;
  onLogout: () => void;
  onResetData: () => void;
  onExport?: () => void;
  onProfileClick?: () => void;
  onRefreshCategories?: () => Promise<void>;
  onRemoveMember?: (uid: string) => Promise<void>;
  onShowGuide?: () => void;
}

// ── Subcomponenti statici: definiti FUORI dal componente padre per evitare che
// React li consideri "nuovo tipo" ad ogni render (causerebbe unmount/remount
// dell'input email con perdita del focus ad ogni keystroke).
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm transition-colors ${className ?? ''}`}>
    {children}
  </div>
);

const MenuItem: React.FC<{ icon: React.ElementType; label: string; action?: () => void; isDestructive?: boolean }> = ({ icon: Icon, label, action, isDestructive }) => (
  <button onClick={action} className={`w-full flex items-center justify-between py-3 px-1 group ${isDestructive ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
    <div className="flex items-center gap-4">
      <Icon size={20} />
      <span className="text-sm font-bold tracking-tight">{label}</span>
    </div>
    {!isDestructive && <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:translate-x-1 transition-transform" />}
  </button>
);

const ProfiloTab: React.FC<ProfiloTabProps> = ({ user, onLogout, onResetData, onProfileClick, onRefreshCategories, onRemoveMember, onShowGuide }) => {
  const { isDarkMode, setIsDarkMode } = useUI();
  const { allTransactions: transactions, categories } = useTransactionsContext();
  const { wallet, walletId, walletLoading, inviteUser: onInviteUser, cancelInvite: onCancelInvite } = useWalletContext();
  const [themeKey, setThemeKeyState] = React.useState<ThemeKey>(getStoredTheme);
  const handleTheme = (key: ThemeKey) => { applyTheme(key); setThemeKeyState(key); haptic.light?.(); };
  const [exportPeriod, setExportPeriod] = React.useState<ExportPeriod>('current_month');
  const [showResetModal, setShowResetModal] = React.useState(false);
  const [isCleaning, setIsCleaning] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isMigrating, setIsMigrating] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');

  const hasLegacyIcons = React.useMemo(() =>
    categories.some(c => c.emoji && !/\p{Emoji_Presentation}|\p{Extended_Pictographic}/u.test(c.emoji)),
    [categories]
  );

  const handleForceUpdate = React.useCallback(async () => {
    setIsUpdating(true);
    try {
      // 1. Svuota Cache API (asset JS/CSS/HTML cached dal SW)
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }

      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          // 2a. SW in attesa → attivalo subito
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            await new Promise(r => setTimeout(r, 400));
          } else {
            // 2b. Forza check aggiornamento
            await reg.update();
            await new Promise(r => setTimeout(r, 800));
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
              await new Promise(r => setTimeout(r, 400));
            }
          }
        }
        // 3. Nucleare: de-registra tutti i SW (assicura load pulito)
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    } catch (err) {
      console.error('[ForceUpdate]', err);
    }
    // Reload unico, sempre alla fine
    window.location.reload();
  }, []);

  const handleExport = () => {
    const count = exportToCSV({ transactions: transactions || [], categories: categories || [], period: exportPeriod });
    if (count > 0) { toast.success(count + ' transazioni esportate'); }
    else { toast.error('Nessuna transazione per questo periodo'); }
  };

  const resetCategories = async () => {
    if (!user || !walletId || isResetting) return;
    setIsResetting(true);
    try {
      const catPath = `wallets/${walletId}/categories`;
      const CHUNK = 500;

      // 1. Cancella tutte le categorie esistenti
      const existing = await getDocs(collection(db, catPath));
      for (let i = 0; i < existing.docs.length; i += CHUNK) {
        const batch = writeBatch(db);
        existing.docs.slice(i, i + CHUNK).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }

      // 2. Re-seed con le categorie default
      const seedBatch = writeBatch(db);
      [...DEFAULT_CATEGORIES_EXPENSE, ...DEFAULT_CATEGORIES_INCOME].forEach((cat, idx) => {
        const ref = doc(collection(db, catPath));
        seedBatch.set(ref, {
          ...cat,
          order: idx,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await seedBatch.commit();

      // 3. Aggiorna flag wallet
      await setDoc(doc(db, `wallets/${walletId}`), { categoriesSeeded: true }, { merge: true });

      await onRefreshCategories?.();
      toast.success('Categorie ripristinate!');
    } catch(e) {
      console.error('[resetCategories]', e);
      toast.error('Errore durante il ripristino');
    } finally {
      setIsResetting(false);
    }
  };
  const cleanDuplicates = async () => {
    if (!user || !walletId) return;
    setIsCleaning(true);
    try {
      const catPath = `wallets/${walletId}/categories`;
      const txPath  = `wallets/${walletId}/transactions`;
      const CHUNK   = 500;

      // ── Step 1: load all categories ────────────────────────────────────────
      const snap = await getDocs(collection(db, catPath));
      // getDocs returns docs in Firestore lexicographic order (= insertion order
      // for auto-IDs). This matches how cleanup keeps the OLDEST duplicate, so
      // the first-seen here is what we keep (consistent with the migration fix).
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() as Category }));

      // ── Step 2: find duplicates → build deletedId→keptId remap table ───────
      const seen = new Map<string, string>();         // key → keptId
      const remap = new Map<string, string>();        // deletedId → keptId
      for (const cat of all) {
        const key = `${(cat.name as string).trim().toLowerCase()}__${cat.type}`;
        if (seen.has(key)) {
          remap.set(cat.id as string, seen.get(key)!);
        } else {
          seen.set(key, cat.id as string);
        }
      }

      // ── Step 3: delete duplicate category docs ─────────────────────────────
      const toDelete = [...remap.keys()];
      for (let i = 0; i < toDelete.length; i += CHUNK) {
        const batch = writeBatch(db);
        toDelete.slice(i, i + CHUNK).forEach(id =>
          batch.delete(doc(db, `${catPath}/${id}`))
        );
        await batch.commit();
      }

      // ── Step 4: scan ALL transactions for broken/stale category refs ────────
      // "broken" = category field holds an ID that no longer exists in Firestore
      //   (could be a duplicate deleted NOW in step 3, or by a PREVIOUS cleanup run).
      // We build the full valid-ID set from the categories that SURVIVE step 3.
      const survivingIds = new Set(
        all.filter(c => !remap.has(c.id as string)).map(c => c.id as string)
      );
      // Also build name→id map (oldest-preferred, consistent with migration fix)
      const nameToId = new Map<string, string>(); // normalizedName__type → survivingId
      for (const cat of all) {
        if (remap.has(cat.id as string)) continue; // skip deleted duplicates
        const key = `${(cat.name as string).trim().toLowerCase()}__${cat.type}`;
        if (!nameToId.has(key)) nameToId.set(key, cat.id as string);
      }

      const txSnap = await getDocs(collection(db, txPath));
      const toFix: Array<{ id: string; newCategoryId: string }> = [];

      for (const txDoc of txSnap.docs) {
        const catRef: string = txDoc.data().category ?? '';
        if (!catRef) continue;
        if (survivingIds.has(catRef)) continue; // already correct

        // Try remap (deleted in this call)
        if (remap.has(catRef)) {
          toFix.push({ id: txDoc.id, newCategoryId: remap.get(catRef)! });
          continue;
        }

        // Broken ref from a PREVIOUS cleanup: catRef is an ID that no longer exists
        // at all in Firestore. Try to match by name as a last resort.
        const txType: string = txDoc.data().type ?? '';
        const nameKey = `${catRef.trim().toLowerCase()}__${txType}`;
        if (nameToId.has(nameKey)) {
          // catRef happened to equal a category NAME (pre-migration ref)
          toFix.push({ id: txDoc.id, newCategoryId: nameToId.get(nameKey)! });
          continue;
        }

        // catRef is a truly orphaned Firestore auto-ID (no matching name).
        // Group broken transactions by their orphaned ID: all refs sharing the
        // same broken ID pointed to the same original (now-deleted) duplicate.
        // We cannot know which surviving category it should map to without the
        // original name — leave these for the user to fix manually via
        // TransactionDetail. They will show as "⚠ Cat. rimossa" in the list.
        console.warn(`[cleanDuplicates] Ref non riparabile: tx=${txDoc.id} category="${catRef}"`);
      }

      // ── Step 5: batch-update transactions ──────────────────────────────────
      for (let i = 0; i < toFix.length; i += CHUNK) {
        const batch = writeBatch(db);
        toFix.slice(i, i + CHUNK).forEach(({ id, newCategoryId }) =>
          batch.update(doc(db, `${txPath}/${id}`), { category: newCategoryId })
        );
        await batch.commit();
      }

      // ── Step 6: restore flag + reset migration so it re-runs cleanly ───────
      await setDoc(doc(db, `wallets/${walletId}`), {
        categoriesSeeded: true,
        categoryMigrationV1: false,  // force migration re-run on next load
      }, { merge: true });

      // ── Step 7: refresh UI ─────────────────────────────────────────────────
      await onRefreshCategories?.();

      const parts: string[] = [];
      if (toDelete.length > 0)
        parts.push(`${toDelete.length} duplicat${toDelete.length === 1 ? 'o eliminato' : 'i eliminati'}`);
      if (toFix.length > 0)
        parts.push(`${toFix.length} transazion${toFix.length === 1 ? 'e riparata' : 'i riparate'}`);
      if (parts.length === 0)
        parts.push('Nessun duplicato trovato');

      toast.success(parts.join(' · '));
    } catch (e) {
      console.error('[cleanDuplicates]', e);
      toast.error('Errore pulizia duplicati');
    }
    setIsCleaning(false);
  };
  const sendInviteEmail = (toEmail: string) => {
    const ownerName = user?.displayName || user?.email || 'Un utente';
    const appUrl = window.location.origin;
    const subject = encodeURIComponent('Sei invitato su MoneyTrack 💰');
    const body = encodeURIComponent(
      `Ciao!\n\n${ownerName} ti ha invitato a condividere il wallet su MoneyTrack.\n\n` +
      `Per accettare l'invito:\n` +
      `1. Apri l'app MoneyTrack: ${appUrl}\n` +
      `2. Accedi con questo indirizzo email: ${toEmail}\n` +
      `3. L'invito verrà accettato automaticamente!\n\n` +
      `MoneyTrack — gestisci le spese insieme 🎯`
    );
    window.open(`mailto:${toEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  const migrateOldIcons = async () => {
    if (!user || !walletId) return;
    setIsMigrating(true);
    try {
      const LUCIDE_MAP: Record<string, string> = {
        ShoppingCart:"🛒", UtensilsCrossed:"🍽️", Home:"🏠", Car:"🚗",
        Zap:"⚡", Heart:"❤️", Dumbbell:"💪", Plane:"✈️", BookOpen:"📚",
        Gift:"🎁", Stethoscope:"🩺", Banknote:"💵", TrendingUp:"📈",
        ShoppingBag:"🛍️", Building2:"🏗️", Droplets:"💧", Smartphone:"📱",
        Wifi:"📶", Sparkles:"✨", Tv2:"📺", Brain:"🧠", Landmark:"🏛️",
        HeartPulse:"💓", Baby:"👶", GraduationCap:"🎓", HandCoins:"🤲",
        ArrowLeftRight:"↔️", Wallet:"👛", Trophy:"🏆", Clock:"🕐",
        CircleDollarSign:"💲", HeartHandshake:"🤝", WashingMachine:"🫧",
        Utensils:"🍴", ShoppingBasket:"🧺",
      };
      const snap = await getDocs(collection(db, `wallets/${walletId}/categories`));
      const batch = writeBatch(db);
      let count = 0;
      snap.docs.forEach(d => {
        const emoji = d.data().emoji as string;
        if (emoji && LUCIDE_MAP[emoji]) {
          batch.update(doc(db, `wallets/${walletId}/categories`, d.id), { emoji: LUCIDE_MAP[emoji] });
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
        await onRefreshCategories?.();
        toast.success(`${count} categor${count === 1 ? 'ia aggiornata' : 'ie aggiornate'}`, { duration: 1800 });
      } else {
        toast.success('Nessuna categoria da migrare', { duration: 1800 });
      }
    } catch {
      toast.error('Errore migrazione icone', { duration: 1800 });
    }
    setIsMigrating(false);
  };

  const handleLogout = async () => {
    try {
      await onLogout();
    } catch (error) {
      console.error("Errore durante il logout:", error);
      toast.error("Errore durante il logout");
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#F5F5F0] dark:bg-slate-900 font-sans transition-colors overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
      <div className="px-4 pb-6 shrink-0" style={{ ...headerGradient, paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
        <div className="flex items-center justify-center relative mb-3">
          <img src="/logo.png" alt="MoneyTrack" className="absolute left-0 h-11 w-11 rounded-xl object-cover flex-shrink-0" />
          <div className="flex flex-col items-center">
            <span className="text-[26px] font-black text-white tracking-tight" style={{fontFamily:"system-ui",letterSpacing:"-0.5px"}}>MoneyTrack</span>
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest text-center">Profilo</p>
          </div>
          {onProfileClick && (
            <button
              onClick={onProfileClick}
              className="absolute right-0 w-10 h-10 rounded-full border-2 border-white/50 overflow-hidden active:scale-90 transition-all"
            >
              {user?.photoURL
                ? <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-black">{user?.displayName?.[0] || 'U'}</div>
              }
            </button>
          )}
        </div>
      </div>
      <div className="p-4">
      <div className="flex items-center gap-4 mb-4">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="Profilo" className="w-16 h-16 rounded-full border-4 border-white dark:border-slate-700 shadow-lg" />
        ) : (
          <div className="w-16 h-16 rounded-full border-4 border-white dark:border-slate-700 shadow-lg bg-emerald-500 flex items-center justify-center text-white text-2xl font-black">
            {user?.displayName?.[0] || 'U'}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-400">Bentornato</span>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">{user?.displayName || 'Utente'}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{user?.email}</p>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-4 py-2 mb-6 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-500 text-xs font-bold active:scale-95 transition-all"
      >
        <LogOut size={14} strokeWidth={2.5} />
        Esci dall'account
      </button>

      <Card className="mb-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Impostazioni</h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          <div className="w-full flex items-center justify-between py-3 px-1">
            <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300">
              {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
              <span className="text-sm font-bold tracking-tight">Modalita scura</span>
            </div>
            <button
              onClick={() => { haptic.light?.(); setIsDarkMode(!isDarkMode); }}
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${isDarkMode ? 'bg-emerald-500' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          {/* Theme picker */}
          <div className="w-full flex items-center justify-between py-3 px-1">
            <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300">
              <Palette size={20} />
              <span className="text-sm font-bold tracking-tight">Tema colore</span>
            </div>
            <div className="flex gap-1.5">
              {(Object.entries(THEMES) as [ThemeKey, typeof THEMES[ThemeKey]][]).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => handleTheme(key)}
                  className="relative w-6 h-6 rounded-full active:scale-90 transition-all"
                  style={{ backgroundColor: t.primary }}
                  aria-label={t.name}
                >
                  {themeKey === key && (
                    <span className="absolute inset-0 rounded-full ring-2 ring-white ring-offset-1 ring-offset-transparent" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <MenuItem
            icon={BookOpen}
            label="Guida app"
            action={() => {
              localStorage.removeItem('onboardingDone');
              onShowGuide?.();
            }}
          />
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Wallet condiviso</h3>
        {walletLoading ? (
          <p className="text-xs text-slate-400 px-1 py-2">Caricamento wallet...</p>
        ) : wallet ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Users size={16} className="text-emerald-500 shrink-0" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{wallet.name}</span>
            </div>
            {/* Members */}
            <div className="space-y-1">
              {(wallet.memberEmails ?? []).map(m => {
                const isOwner   = m.uid === wallet.ownerId;
                const isSelf    = m.uid === user?.uid;
                const canRemove = onRemoveMember && (
                  (user?.uid === wallet.ownerId && !isOwner) || // owner removes another
                  (isSelf && !isOwner)                          // non-owner leaves
                );
                return (
                  <div key={m.uid} className="flex items-center gap-2 px-1 py-1 rounded-lg bg-slate-50 dark:bg-slate-700/40">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-xs font-black text-emerald-600 dark:text-emerald-300 shrink-0">
                      {(m.displayName || m.email)?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                        {m.displayName || m.email}{isSelf && !isOwner ? ' (tu)' : ''}
                      </p>
                      {m.displayName && <p className="text-[10px] text-slate-400 truncate">{m.email}</p>}
                    </div>
                    {isOwner && (
                      <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full shrink-0">Owner</span>
                    )}
                    {canRemove && (
                      <button
                        onClick={() => onRemoveMember!(m.uid)}
                        title={isSelf ? 'Lascia wallet' : 'Rimuovi membro'}
                        className="p-1.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-90 transition-all shrink-0"
                      >
                        <XIcon size={13} className="text-rose-400" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Non-owner: leave wallet button */}
            {user?.uid !== wallet.ownerId && onRemoveMember && (
              <button
                onClick={() => onRemoveMember(user!.uid)}
                className="w-full flex items-center gap-2 py-2 px-2 mt-1 text-rose-500 text-xs font-black rounded-xl bg-rose-50 dark:bg-rose-500/10 active:scale-95 transition-all"
              >
                <LogOut size={13} strokeWidth={2.5} />
                Lascia wallet condiviso
              </button>
            )}
            {/* Pending invites */}
            {(wallet.pendingInvites ?? []).length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Inviti in attesa</p>
                {(wallet.pendingInvites ?? []).map(email => (
                  <div key={email} className="flex items-center gap-2 px-1 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <Mail size={14} className="text-amber-500 shrink-0" />
                    <span className="flex-1 text-xs text-slate-600 dark:text-slate-400 truncate">{email}</span>
                    {user?.uid === wallet.ownerId && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => sendInviteEmail(email)}
                          title="Reinvia email"
                          className="p-1.5 rounded-full hover:bg-amber-100 dark:hover:bg-amber-800/30 active:scale-90 transition-all"
                        >
                          <Send size={11} className="text-amber-500" />
                        </button>
                        {onCancelInvite && (
                          <button
                            onClick={() => onCancelInvite(email)}
                            title="Annulla invito"
                            className="p-1.5 rounded-full hover:bg-amber-100 dark:hover:bg-amber-800/30 active:scale-90 transition-all"
                          >
                            <XIcon size={11} className="text-amber-500" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* Invite form — owner only, when below member limit */}
            {user?.uid === wallet.ownerId && (wallet.members ?? []).length < MAX_WALLET_MEMBERS && onInviteUser && (
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  inputMode="email"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-form-type="other"
                  data-lpignore="true"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="email@esempio.com"
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <button
                  onClick={async () => {
                    const email = inviteEmail.trim();
                    if (!email) return;
                    await onInviteUser(email);
                    setInviteEmail('');
                    sendInviteEmail(email);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black active:scale-95 transition-all shrink-0"
                >
                  <UserPlus size={14} />
                  Invita
                </button>
              </div>
            )}
            {/* Full message */}
            {(wallet.members ?? []).length >= MAX_WALLET_MEMBERS && (
              <p className="text-[10px] text-slate-400 px-1">Il wallet è al completo ({MAX_WALLET_MEMBERS} membri).</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400 px-1 py-2">Nessun wallet disponibile.</p>
        )}
      </Card>

      <Card className="mb-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Generali</h3>
        <div className="py-3 px-1 flex flex-col gap-2">
          <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300 mb-1">
            <Share size={20} />
            <span className="text-sm font-bold tracking-tight">Esporta dati</span>
          </div>
          <div className="flex gap-1.5">
            {([['current_month','Mese'],['last_3_months','3 mesi'],['current_year','Anno'],['all','Tutto']] as [ExportPeriod,string][]).map(([val,label]) => (
              <button key={val} onClick={() => { haptic.light?.(); setExportPeriod(val); }} className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${exportPeriod === val ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{label}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { haptic.medium?.(); handleExport(); }} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-xl text-xs font-black active:scale-95 transition-all flex items-center justify-center gap-1.5">
              <Share size={13} strokeWidth={2.5} />
              CSV
            </button>
            <button
              onClick={async () => {
                haptic.medium?.();
                const count = await exportToPDF({ transactions: transactions || [], categories: categories || [], period: exportPeriod });
                if (count > 0) toast.success(`PDF generato — ${count} transazioni`);
                else toast.error('Nessuna transazione per questo periodo');
              }}
              className="flex-1 py-2 bg-gradient-to-br from-[#1D9E75] to-[#11cc98] text-white rounded-xl text-xs font-black active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <FileText size={13} strokeWidth={2.5} />
              PDF
            </button>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Dati</h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          <button
            onClick={isResetting ? undefined : resetCategories}
            className={cn("w-full flex items-center justify-between py-3 px-1 group", isResetting ? "cursor-not-allowed" : "")}
          >
            <div className="flex items-center gap-4">
              <RotateCcw size={20} className={cn("transition-all", isResetting ? "animate-spin text-emerald-500" : "text-slate-700 dark:text-slate-300")} />
              <div className="flex flex-col items-start">
                <span className={cn("text-sm font-bold tracking-tight leading-tight", isResetting ? "text-emerald-500" : "text-slate-700 dark:text-slate-300")}>
                  {isResetting ? 'Ripristino in corso...' : 'Ripristina categorie default'}
                </span>
                {isResetting && <span className="text-[10px] text-emerald-400 font-semibold">Ricarica l'app al termine</span>}
              </div>
            </div>
            {!isResetting && <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:translate-x-1 transition-transform" />}
          </button>
          <button
            onClick={isCleaning ? undefined : cleanDuplicates}
            className={cn("w-full flex items-center justify-between py-3 px-1 group", isCleaning ? "cursor-not-allowed" : "")}
          >
            <div className="flex items-center gap-4">
              <Sparkles size={20} className={cn("transition-all", isCleaning ? "animate-spin text-emerald-500" : "text-slate-700 dark:text-slate-300")} />
              <div className="flex flex-col items-start">
                <span className={cn("text-sm font-bold tracking-tight leading-tight", isCleaning ? "text-emerald-500" : "text-slate-700 dark:text-slate-300")}>
                  {isCleaning ? 'Pulizia in corso...' : 'Pulisci categorie duplicate'}
                </span>
                {isCleaning && <span className="text-[10px] text-emerald-400 font-semibold">Analisi transazioni...</span>}
              </div>
            </div>
            {!isCleaning && <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:translate-x-1 transition-transform" />}
          </button>
          <button
            onClick={isUpdating ? undefined : handleForceUpdate}
            className={cn(
              "w-full flex items-center justify-between py-3 px-1 group",
              isUpdating ? "cursor-not-allowed" : ""
            )}
          >
            <div className="flex items-center gap-4">
              <RefreshCw
                size={20}
                className={cn(
                  "transition-all",
                  isUpdating ? "animate-spin text-emerald-500" : "text-slate-700 dark:text-slate-300"
                )}
              />
              <div className="flex flex-col items-start">
                <span className={cn(
                  "text-sm font-bold tracking-tight leading-tight",
                  isUpdating ? "text-emerald-500" : "text-slate-700 dark:text-slate-300"
                )}>
                  {isUpdating ? 'Aggiornamento in corso...' : 'Forza aggiornamento app'}
                </span>
                {isUpdating && (
                  <span className="text-[10px] text-emerald-400 font-semibold">Attendere il riavvio</span>
                )}
              </div>
            </div>
            {!isUpdating && <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:translate-x-1 transition-transform" />}
          </button>
          {hasLegacyIcons && (
            <MenuItem
              icon={RefreshCw}
              label={isMigrating ? 'Migrazione in corso...' : 'Aggiorna icone categorie'}
              action={isMigrating ? undefined : () => { haptic.medium?.(); migrateOldIcons(); }}
            />
          )}
          <MenuItem icon={Trash2} label="Azzera tutte le transazioni" action={() => { haptic.warning?.(); setShowResetModal(true); }} isDestructive />
        </div>
      </Card>

      <div className="text-center pb-4">
        <p className="text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">MoneyTrack</p>
        <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">v{__APP_VERSION__}</p>
      </div>
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-[10000] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowResetModal(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full bg-white dark:bg-slate-800 rounded-t-[32px] shadow-2xl z-10 px-6 pt-3 pb-[max(6rem,env(safe-area-inset-bottom))]">
              <div className="flex justify-center mb-6"><div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full" /></div>
              <div className="w-14 h-14 bg-rose-50 dark:bg-rose-500/10 rounded-[18px] flex items-center justify-center mx-auto mb-4"><Trash2 size={24} className="text-rose-500" strokeWidth={2} /></div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 text-center tracking-tight mb-2">Azzera tutte le transazioni</h3>
              <p className="text-sm text-slate-400 font-medium text-center mb-6">Questa azione è <span className="text-rose-500 font-black">irreversibile</span>. Verranno eliminate tutte le transazioni.</p>
              <div className="flex gap-3">
                <button onClick={() => { haptic.light?.(); setShowResetModal(false); }} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black rounded-2xl active:scale-95 transition-all text-sm">Annulla</button>
                <button onClick={() => { haptic.heavy?.(); onResetData(); setShowResetModal(false); }} className="flex-1 py-4 bg-rose-500 text-white font-black rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-all text-sm">Elimina tutto</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
};

export default ProfiloTab;
