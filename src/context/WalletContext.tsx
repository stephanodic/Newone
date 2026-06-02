import React, { createContext, useContext } from 'react';
import { Wallet } from '../types';

interface WalletContextValue {
  wallet: Wallet | null;
  walletId: string | null;
  walletLoading: boolean;
  inviteUser?: (email: string) => Promise<void>;
  cancelInvite?: (email: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletContext must be used within WalletProvider');
  return ctx;
}

export const WalletProvider: React.FC<{
  children: React.ReactNode;
  value: WalletContextValue;
}> = ({ children, value }) => (
  <WalletContext.Provider value={value}>
    {children}
  </WalletContext.Provider>
);
