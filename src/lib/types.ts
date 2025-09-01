
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  name: string | null;
  email: string | null;
  photoUrl: string | null;
  walletBalance: number;
  role: 'user' | 'admin';
  pubgId?: string;
}

export interface Tournament {
  id: string;
  title: string;
  gameType: string;
  date: string;
  time: string;
  entryFee: number;
  slots: number;
  prize: number;
  rules: string[];
  imageUrl: string;
  status: 'published' | 'draft' | 'cancelled' | 'completed' | 'live';
}

export interface Entry {
  entryId: string;
  tournamentId: string;
  userId: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  paidAmount: number;
}

export interface Transaction {
  txnId: string;
  userId: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'success' | 'failed' | 'pending';
  timestamp: Timestamp;
  description: string;
}

export interface WalletRequest {
  requestId: string;
  userId: string;
  amount: number;
  utr: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: Timestamp;
}

export interface AppConfig {
  upiId: string;
  qrImageUrl: string;
}
