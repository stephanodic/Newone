import React, { useEffect, useCallback, useRef } from "react";
import { useTransactions } from "./hooks/useTransactions";
import { useWallet } from "./hooks/useWallet";
import { useAuth } from "./hooks/useAuth";
import LoginScreen from "./components/LoginScreen";
import { cn } from "./lib/utils";
import { useUI } from "./context/UIContext";
import ListaTab from "./components/ListaTab";
import Dashboard from "./components/Dashboard";
import CategorieTab from "./components/CategorieTab";
import GraficiTab from "./components/GraficiTab";
import ProfiloTab from "./components/ProfiloTab";
import BottomSheetTransaction from "./components/AddTransactionModal";
import TransactionDetail from "./components/TransactionDetail";
import CategoryEditor from "./components/CategoryEditor";
import BottomNav from "./components/BottomNav";
import { motion, AnimatePresence } from "motion/react";
import { haptic } from "./lib/haptic";
import { addDays, format } from "date-fns";
import { Toaster, toast } from "sonner";
import OfflineBanner from "./components/OfflineBanner";
import ListaSpesaTab from "./components/ListaSpesaTab";
import { useShoppingList } from "./hooks/useShoppingList";
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useSwipeNavigation } from "./hooks/useSwipeNavigation";
import { usePullToRefresh, PULL_MAX } from "./hooks/usePullToRefresh";
import { useTransactionHandlers } from "./hooks/useTransactionHandlers";
import { TransactionsProvider } from "./context/TransactionsContext";
import { WalletProvider } from "./context/WalletContext";
import OnboardingGuide from "./components/OnboardingGuide";
import WeeklyRecap from "./components/WeeklyRecap";
import { shouldSuggestRecurrence, computeWeeklyRecap } from "./lib/stats";

export default function App() {
  const { user, authSettled, likelySigned, loginWithGoogle, logout } = useAuth();
  const { walletId, wallet, walletLoading, inviteUser, cancelInvite, removeMember } = useWallet(user);
  const {
    transactions, allTransactions, categories,
    stats, filters,
    addTransaction, updateTransaction, deleteTransaction,
    deleteMultipleTransactions, deleteRecurringTransaction,
    addCategory, updateCategory, deleteCategory,
    reorderCategories, setPeriod, navigate, goToDate, refreshCategories,
    refreshFromServer,
    isTransactionsLoading, isCategoriesLoading,
    hasPendingWrites, lastSyncedAt,
  } = useTransactions(user?.uid ?? "", walletId ?? "");

  const { activeTab, setActiveTab, activeSheet, closeSheet, openAddSheet, openEditSheet,
          activePush, closePush, openTransactionDetail,
          activeModal, closeModal, openCategoryEditor, isDarkMode } = useUI();

  // Detects new SW version — shows inline banner with "Aggiorna" CTA
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  // Shopping list — real-time sync on wallets/{walletId}/shoppingList
  const {
    items: shoppingItems, loading: shoppingLoading,
    addItem: addShoppingItem, updateItem: updateShoppingItem, toggleItem: toggleShoppingItem,
    deleteItem: deleteShoppingItem, clearBought: clearBoughtItems,
    assignItem: assignShoppingItem,
  } = useShoppingList(walletId ?? null, user?.uid ?? '');

  const [editingTransaction, setEditingTransaction] = React.useState<import("./types").Transaction | null>(null);
  const isManagingCatsRef = useRef(false);

  const [showOnboarding, setShowOnboarding] = React.useState(() =>
    !localStorage.getItem('onboardingDone')
  );
  const handleCloseOnboarding = React.useCallback(() => {
    localStorage.setItem('onboardingDone', 'true');
    setShowOnboarding(false);
  }, []);

  // T4-E: PWA shortcut — handle ?action= on startup
  const startupActionRef = React.useRef(
    new URLSearchParams(window.location.search).get('action')
  );
  React.useEffect(() => {
    if (!user || !startupActionRef.current) return;
    const action = startupActionRef.current;
    startupActionRef.current = null;
    if (action === 'add-expense') {
      setTimeout(() => { openAddSheet('EXPENSE'); }, 400);
    }
    // 'dashboard' → already the default tab after login, no action needed
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // T2-B: Weekly recap — shown on Mondays after first data load
  const [showWeeklyRecap, setShowWeeklyRecap] = React.useState(false);
  const weeklyRecapTriggered = React.useRef(false);
  React.useEffect(() => {
    if (isTransactionsLoading || weeklyRecapTriggered.current) return;
    const today = new Date();
    if (today.getDay() !== 1) return; // 1 = lunedì
    const key = `weeklyRecapShown_${today.toISOString().split('T')[0]}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    weeklyRecapTriggered.current = true;
    setShowWeeklyRecap(true);
  }, [isTransactionsLoading]);

  const weeklyRecapData = React.useMemo(
    () => computeWeeklyRecap(allTransactions, categories),
    [allTransactions, categories],
  );

  const suggestedTags = React.useMemo(() => {
    const s = new Set<string>();
    for (const t of allTransactions) for (const tag of (t.tags ?? [])) s.add(tag);
    return Array.from(s).sort().slice(0, 8);
  }, [allTransactions]);

  // ── Extracted hooks ───────────────────────────────────────────────────────

  const { tabDirection, navigateToTab,
          handleTouchStart: swipeTouchStart,
          handleTouchEnd: swipeTouchEnd } =
    useSwipeNavigation({ activeTab, setActiveTab });

  const { pullY, isRefreshing, isPullingRef,
          handleTouchMove: pullTouchMove, handlePullEnd,
          startYRef, startXRef } =
    usePullToRefresh({ onRefresh: refreshFromServer });

  const {
    debouncedUpdateTransaction, handleTransactionSubmit,
    handleExport,
    handleConvertShoppingToTransaction: setConversionItem,
    pendingShoppingDeletionRef, pendingConversionNote, setPendingConversionNote,
  } = useTransactionHandlers({
    editingTransaction, setEditingTransaction,
    updateTransaction, addTransaction,
    deleteShoppingItem, allTransactions, categories,
    closeSheet, navigateToTab, setActiveTab,
  });

  // ── Combined touch handlers ───────────────────────────────────────────────

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    swipeTouchStart(e);
    startYRef.current = e.touches[0].clientY;
    startXRef.current = e.touches[0].clientX;
    isPullingRef.current = false;
  }, [swipeTouchStart]);

  const onTouchEnd = useCallback(async (e: React.TouchEvent) => {
    if (isPullingRef.current) { await handlePullEnd(); return; }
    if (!isManagingCatsRef.current) swipeTouchEnd(e);
  }, [handlePullEnd, swipeTouchEnd]);

  // ── Misc helpers ──────────────────────────────────────────────────────────

  /** Wraps the hook's setter to also open the add-transaction sheet */
  const handleConvertShoppingToTransaction = useCallback((item: import("./types").ShoppingItem) => {
    setConversionItem(item);
    openAddSheet('EXPENSE');
  }, [setConversionItem, openAddSheet]);

  const handleNavTab = useCallback((tab: string) => {
    navigateToTab(tab);
    setActiveTab(tab as any);
    closePush();
    closeModal();
    closeSheet();
  }, [navigateToTab, setActiveTab, closePush, closeModal, closeSheet]);

  const handleAddButtonClick = useCallback(() => {
    activeSheet ? closeSheet() : openAddSheet("EXPENSE");
  }, [activeSheet, closeSheet, openAddSheet]);

  const navigateDay    = useCallback((diff: number) => { goToDate(addDays(filters.date, diff)); }, [filters.date, goToDate]);
  const handleGoToDate = useCallback((date: Date)   => { goToDate(date); }, [goToDate]);

  const handleCategorySave = useCallback(async (data: any) => {
    try {
      if (data && "id" in data && data.id) {
        const { id, ...updates } = data;
        await updateCategory(id, updates);
      } else {
        const { id: _id, ...newCat } = data;
        await addCategory(newCat);
      }
      closeModal();
    } catch (e: any) {
      toast.error("Errore: " + (e?.message || "sconosciuto"));
    }
  }, [updateCategory, addCategory, closeModal]);

  const handleDuplicate = useCallback(async (t: import("./types").Transaction) => {
    haptic.medium?.();
    await addTransaction({
      amount: t.amount,
      type: t.type,
      category: t.category,
      note: t.note,
      date: new Date().toISOString().split('T')[0],
      isRecurring: false,
      recurrenceInterval: 'NONE',
    });
    toast.success('Transazione duplicata');
  }, [addTransaction]);

  // T2-C: wrapped submit — after add, check if recurring suggestion needed
  const handleTransactionSubmitWithSuggestion = useCallback(async (data: any) => {
    const isNew = !data.id && !editingTransaction;
    const wasOffline = !navigator.onLine;
    await handleTransactionSubmit(data);
    if (wasOffline && isNew) {
      toast('Salvato offline 📡', {
        description: 'Verrà sincronizzato quando torni online.',
        duration: 4000,
      });
    }
    if (!isNew || data.isRecurring || data.type !== 'EXPENSE') return;
    const cat = categories.find(c => c.id === data.category || c.name === data.category);
    if (!cat) return;
    if (!shouldSuggestRecurrence(data.category, cat.name, allTransactions)) return;
    const key = `recurSuggested_${data.category}_${new Date().toISOString().slice(0, 7)}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    toast('Spesa mensile rilevata 🔁', {
      description: `"${cat.name}" compare ogni mese. Considera di impostare la ricorrenza.`,
      duration: 8000,
      action: { label: 'Capito', onClick: () => {} },
    });
  }, [handleTransactionSubmit, editingTransaction, categories, allTransactions]);

  // Reset to dashboard on every login
  const userId = user?.uid ?? null;
  useEffect(() => {
    if (userId) { setActiveTab('dashboard'); navigateToTab('dashboard'); }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { closeModal(); }, [activeTab]);

  const [detailNavDirection, setDetailNavDirection] = React.useState<'left' | 'right'>('right');

  const sortedForDetail = React.useMemo(() =>
    [...allTransactions].sort((a, b) => {
      const da = new Date(a.date).getTime(), db = new Date(b.date).getTime();
      if (db !== da) return db - da;
      const sa = (a.createdAt as any)?.seconds ?? 0, sb = (b.createdAt as any)?.seconds ?? 0;
      return sb - sa;
    }),
    [allTransactions]
  );

  const handleDetailNavigate = React.useCallback((id: string, dir: 'left' | 'right') => {
    setDetailNavDirection(dir);
    openTransactionDetail(id);
  }, [openTransactionDetail]);

  // ── Render guards ─────────────────────────────────────────────────────────

  if (!user && (!likelySigned || authSettled)) return <LoginScreen onLogin={loginWithGoogle} />;

  if (user && walletLoading && !walletId) return (
    <div className="h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-[#1D9E75] to-[#11cc98]">
      <div className="flex flex-col items-center gap-3">
        <img src="/logo.png" alt="MoneyTrack" className="h-14 w-14 rounded-2xl object-cover shadow-xl" />
        <span className="text-white font-semibold text-xl tracking-tight">MoneyTrack</span>
        <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin mt-2" />
      </div>
    </div>
  );

  const activeTransaction = activePush?.type === "transaction-detail"
    ? allTransactions.find(t => t.id === activePush.transactionId) ?? null
    : null;

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <TransactionsProvider value={{ transactions, allTransactions, categories, stats, filters, addTransaction, updateTransaction, deleteTransaction, deleteMultipleTransactions, addCategory, updateCategory, deleteCategory, navigate, goToDate, setPeriod }}>
    <WalletProvider value={{ wallet, walletId, walletLoading, inviteUser, cancelInvite }}>
    <div className={cn("h-[100dvh] w-full flex justify-center", isDarkMode ? "bg-slate-950" : "bg-slate-200")}>
      <OfflineBanner hasPendingWrites={hasPendingWrites} lastSyncedAt={lastSyncedAt} />

      {/* SW update banner */}
      <AnimatePresence>
        {needRefresh && (
          <motion.div
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-between gap-3 bg-gradient-to-r from-[#1D9E75] to-[#11cc98] px-4 text-white shadow-xl shadow-emerald-900/20"
            style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🚀</span>
              <div>
                <p className="text-[13px] font-black text-white leading-tight">Nuova versione disponibile</p>
                <p className="text-[10px] text-white/65 font-semibold">Aggiorna per le ultime novità</p>
              </div>
            </div>
            <button
              onClick={() => { updateServiceWorker(true); window.location.reload(); }}
              className="shrink-0 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 px-4 py-2 text-[12px] font-black text-white active:scale-95 transition-all"
            >
              Aggiorna ora
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster position="top-center" richColors duration={1800} toastOptions={{ style: { fontSize: '13px' } }} containerStyle={{ zIndex: 99999 }} />

      <div className={cn("w-full min-w-[360px] max-w-[430px] mx-auto h-full flex flex-col overflow-hidden relative font-sans select-none antialiased", isDarkMode ? "bg-slate-900" : "bg-[#F5F5F0]")}>

        {/* ── Tab area ── */}
        <main
          aria-label="Contenuto principale"
          className="flex-1 min-h-0 overflow-hidden relative z-40"
          onTouchStart={onTouchStart}
          onTouchMove={pullTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ overscrollBehavior: 'none' }}
        >
          {/* Pull-to-refresh spinner */}
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-0 flex justify-center z-[60] pointer-events-none"
            style={{
              transform: `translateY(${isRefreshing ? 44 : Math.max(pullY - 8, 0)}px)`,
              opacity: isRefreshing ? 1 : Math.min(pullY / 36, 1),
              transition: !isPullingRef.current && !isRefreshing ? 'transform 0.22s ease, opacity 0.18s' : 'none',
            }}
          >
            <div
              className={`w-7 h-7 rounded-full border-[2.5px] bg-white dark:bg-slate-800 shadow-md ${isRefreshing ? 'animate-spin' : ''}`}
              style={{
                borderColor: '#1D9E75',
                borderTopColor: 'transparent',
                transform: isRefreshing ? undefined : `rotate(${(pullY / PULL_MAX) * 300}deg)`,
              }}
            />
          </div>

          <AnimatePresence mode="sync">
            <motion.div
              key={activeTab}
              initial={{ x: `${tabDirection * 100}%` }}
              animate={{ x: 0 }}
              exit={{ x: `${-tabDirection * 100}%` }}
              transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.75 }}
              className="absolute inset-0"
              style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}
            >
              {activeTab === "dashboard" && (
                <Dashboard
                  user={user}
                  setMonth={navigateDay}
                  onGoToDate={handleGoToDate}
                  onProfileClick={() => handleNavTab("profile")}
                  onAddClick={(type, categoryId) => openAddSheet(type, categoryId)}
                />
              )}
              {activeTab === "history" && (
                <ListaTab
                  onUpdateAmount={(id: string, amount: number) => debouncedUpdateTransaction(id, { amount })}
                  onDelete={deleteTransaction}
                  onDuplicate={handleDuplicate}
                  onDeleteAll={() => deleteMultipleTransactions(transactions.map((t: any) => t.id))}
                  onItemClick={(id: string) => openTransactionDetail(id)}
                  onAddTransaction={addTransaction}
                  onAddClick={(type, categoryId) => openAddSheet(type, categoryId)}
                  user={user}
                  onProfileClick={() => handleNavTab("profile")}
                  onShoppingClick={() => handleNavTab("shopping")}
                  isLoading={isTransactionsLoading || isCategoriesLoading}
                />
              )}
              {activeTab === "categories" && (
                <CategorieTab
                  onAdd={() => openCategoryEditor()}
                  onEdit={(id: string) => openCategoryEditor(id)}
                  onDelete={deleteCategory}
                  user={user}
                  isLoading={isCategoriesLoading}
                  onProfileClick={() => handleNavTab("profile")}
                />
              )}
              {activeTab === "charts" && (
                <GraficiTab
                  user={user}
                  onProfileClick={() => handleNavTab("profile")}
                />
              )}
              {activeTab === "shopping" && (
                <ListaSpesaTab
                  items={shoppingItems}
                  loading={shoppingLoading}
                  onAdd={addShoppingItem}
                  onUpdate={updateShoppingItem}
                  onToggle={toggleShoppingItem}
                  onDelete={deleteShoppingItem}
                  onClearBought={clearBoughtItems}
                  onConvertToTransaction={handleConvertShoppingToTransaction}
                  onAssign={assignShoppingItem}
                  walletMembers={wallet?.memberEmails}
                  currentUserId={user?.uid}
                  user={user}
                  onProfileClick={() => handleNavTab("profile")}
                />
              )}
              {activeTab === "profile" && (
                <ProfiloTab
                  user={user}
                  onLogout={logout}
                  onResetData={() => deleteMultipleTransactions(allTransactions.map((t: any) => t.id))}
                  onExport={handleExport}
                  onProfileClick={() => handleNavTab("profile")}
                  onRefreshCategories={refreshCategories}
                  onRemoveMember={removeMember}
                  onShowGuide={() => setShowOnboarding(true)}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Category editor overlay */}
          <AnimatePresence>
            {activeModal?.type === "category-editor" && (
              <CategoryEditor
                category={categories.find((c: any) => c.id === activeModal.categoryId)}
                onClose={closeModal}
                onDelete={deleteCategory}
                onSave={handleCategorySave}
              />
            )}
          </AnimatePresence>
        </main>

        {/* Transaction detail push panel */}
        <AnimatePresence>
          {activeTransaction && (
            <TransactionDetail
              key={activeTransaction.id}
              transaction={activeTransaction}
              categories={categories}
              transactions={sortedForDetail}
              navDirection={detailNavDirection}
              onNavigateTo={handleDetailNavigate}
              onBack={closePush}
              onEdit={() => {
                setEditingTransaction(activeTransaction);
                closePush();
                openEditSheet(activeTransaction.id, activeTransaction.type, activeTransaction.category);
              }}
              onUpdate={async (id, updates) => { await updateTransaction(id, updates); }}
              onDelete={async (mode: any) => { await deleteRecurringTransaction(activeTransaction, mode); closePush(); }}
            />
          )}
        </AnimatePresence>

        {/* Bottom navigation */}
        <BottomNav
          activeTab={activeTab}
          activeSheet={!!activeSheet}
          onTabClick={handleNavTab}
          onAddClick={handleAddButtonClick}
        />

        {/* Onboarding Guide */}
        <AnimatePresence>
          {showOnboarding && user && (
            <OnboardingGuide onClose={handleCloseOnboarding} />
          )}
        </AnimatePresence>

        {/* T2-B: Weekly recap — shown on Mondays */}
        {weeklyRecapData && (
          <WeeklyRecap
            show={showWeeklyRecap}
            lastWeekTotal={weeklyRecapData.lastWeekTotal}
            prevWeekTotal={weeklyRecapData.prevWeekTotal}
            weekRange={weeklyRecapData.weekRange}
            topCategories={weeklyRecapData.topCategories}
            onClose={() => setShowWeeklyRecap(false)}
            onViewCharts={() => { setShowWeeklyRecap(false); handleNavTab('charts'); }}
          />
        )}

        {/* Add / edit transaction sheet */}

        <BottomSheetTransaction
          isOpen={!!activeSheet}
          onClose={() => {
            closeSheet();
            setEditingTransaction(null);
            if (pendingShoppingDeletionRef.current) {
              pendingShoppingDeletionRef.current = null;
              setPendingConversionNote('');
            }
          }}
          categories={categories}
          stats={stats}
          user={user}
          initialType={activeSheet?.initialType}
          initialCategoryId={editingTransaction?.category || activeSheet?.categoryId}
          initialDate={editingTransaction?.date
            ? editingTransaction.date.split("T")[0]
            : format(filters.date, "yyyy-MM-dd")}
          initialAmount={editingTransaction?.amount}
          initialNote={editingTransaction?.note || pendingConversionNote || undefined}
          suggestedTags={suggestedTags}
          navigate={setActiveTab as any}
          onSubmit={handleTransactionSubmitWithSuggestion}
        />
      </div>
    </div>
    </WalletProvider>
    </TransactionsProvider>
  );
}
