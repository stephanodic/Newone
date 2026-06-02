import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';

type TabType = 'dashboard' | 'history' | 'categories' | 'charts' | 'shopping' | 'profile';
type SheetType = { type: 'add' | 'edit', initialType?: 'EXPENSE' | 'INCOME', categoryId?: string } | null;
type PushType = { type: 'transaction-detail', transactionId: string } | null;
type ModalType = { type: 'category-editor', categoryId?: string } | null;

interface UIContextType {
  activeTab: TabType;
  activeSheet: SheetType;
  activePush: PushType;
  activeModal: ModalType;
  isDarkMode: boolean;
  setActiveTab: (tab: TabType) => void;
  setIsDarkMode: (isDark: boolean) => void;
  openAddSheet: (type?: 'EXPENSE' | 'INCOME', categoryId?: string) => void;
  openEditSheet: (transactionId: string, type: 'EXPENSE' | 'INCOME', categoryId: string) => void;
  closeSheet: () => void;
  openTransactionDetail: (id: string) => void;
  closePush: () => void;
  openCategoryEditor: (categoryId?: string) => void;
  closeModal: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
  const [activePush, setActivePush] = useState<PushType>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('isDarkMode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = useCallback((isDark: boolean) => {
    setIsDarkMode(isDark);
    localStorage.setItem('isDarkMode', String(isDark));
  }, []);

  const openAddSheet = useCallback((type: 'EXPENSE' | 'INCOME' = 'EXPENSE', categoryId?: string) => {
    setActiveSheet({ type: 'add', initialType: type, categoryId });
  }, []);

  const openEditSheet = useCallback((transactionId: string, type: 'EXPENSE' | 'INCOME', categoryId: string) => {
    setActiveSheet({ type: 'edit', initialType: type, categoryId, transactionId });
  }, []);

  const closeSheet = useCallback(() => setActiveSheet(null), []);
  
  const openTransactionDetail = useCallback((id: string) => {
    setActivePush({ type: 'transaction-detail', transactionId: id });
  }, []);

  const closePush = useCallback(() => setActivePush(null), []);

  const openCategoryEditor = useCallback((categoryId?: string) => {
    setActiveModal({ type: 'category-editor', categoryId });
  }, []);

  const closeModal = useCallback(() => setActiveModal(null), []);

  return (
    <UIContext.Provider value={{
      activeTab, activeSheet, activePush, activeModal, isDarkMode,
      setActiveTab, setIsDarkMode: toggleDarkMode, openAddSheet, openEditSheet, closeSheet,
      openTransactionDetail, closePush, openCategoryEditor, closeModal
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error("useUI deve essere usato dentro un UIProvider");
  }
  return context;
}

