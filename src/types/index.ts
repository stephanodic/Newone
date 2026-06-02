import { Timestamp } from 'firebase/firestore';

export type TransactionType = 'INCOME' | 'EXPENSE';
export type RecurrenceInterval = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'BIMONTHLY';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  note?: string;
  date: string; // ISO 8601
  userId: string;
  createdAt: Timestamp;
  isRecurring?: boolean;
  recurrenceInterval?: RecurrenceInterval;
  parentId?: string;
  tags?: string[];
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  type: TransactionType;
  monthlyLimit: number | null;
  tag: string | null;
  userId: string;
  order?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface StatsResult {
  monthlyIncome: number;
  monthlyExpense: number;
  balance: number;
  totalBalance: number;
  balanceAtPeriodEnd?: number;
  categoryBreakdown: {
    category: string;
    amount: number;
    color: string;
    emoji?: string;
    percentage: number;
  }[];
  budgetStatus: {
    id: string;
    name: string;
    color: string;
    emoji: string;
    spent: number;
    limit: number;
    percentage: number;
    isExceeded: boolean;
  }[];
}

export type FilterPeriod = 'MONTHLY' | 'DAILY' | 'CUSTOM';

export interface FilterState {
  period: FilterPeriod;
  date: Date;
  range: {
    from: Date;
    to: Date;
  };
}

export interface Wallet {
  id: string;
  ownerId: string;
  members: string[];
  memberEmails: Array<{ uid: string; email: string; displayName: string }>;
  pendingInvites: string[];
  name: string;
  createdAt: import('firebase/firestore').Timestamp;
}

export interface WalletInvite {
  walletId: string;
  ownerUid: string;
  ownerName: string;
  walletName: string;
  createdAt: import('firebase/firestore').Timestamp;
}

export type CreateTransactionInput = Omit<Transaction, 'id' | 'createdAt'>;
export type UpdateTransactionInput = Partial<Omit<Transaction, 'id' | 'userId'>>;
export type CategoryFormData = Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string | null;
  icon: string | null;   // emoji, e.g. "🥛"
  bought: boolean;
  addedBy: string;
  createdAt: Timestamp;
  assignedTo?: string | null; // uid of the member who claimed this item (PR#3)
}

