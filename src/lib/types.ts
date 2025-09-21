
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

export interface WinnerPrize {
  rank: string;
  prize: number;
}

export interface Tournament {
  id: string;
  title: string;
  gameType: string;
  date: Timestamp;
  time: string;
  entryFee: number;
  slots: number;
  prize: number;
  rules: string[];
  imageUrl?: string;   // 👈 added here
  status: 'published' | 'draft' | 'cancelled' | 'completed' | 'live';
  isMega?: boolean;
  roomId?: string;
  roomPassword?: string;
  winnerPrizes?: WinnerPrize[];
}

export interface TournamentFormData {
  id?: string;
  title: string;
  gameType: string;
  date: any;
  time: string;
  entryFee: number;
  slots: number;
  prize: number;
  rules: string[];
  imageUrl?: string;   // 👈 added here
  status: 'published' | 'draft' | 'cancelled' | 'completed' | 'live';
  isMega?: boolean;
  roomId?: string;
  roomPassword?: string;
  winnerPrizes?: WinnerPrize[];
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
  userName?: string;
  userEmail?: string;
  amount: number;
  utr: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: Timestamp;
}

export interface WithdrawalRequest {
  requestId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  amount: number;
  upiId: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: Timestamp;
}

export interface AppConfig {
  upiId: string;
  qrImageUrl?: string;
}

export interface Notification {
    id: string;
    userId: string; // "all" for global notifications
    title: string;
    message: string;
    timestamp: Timestamp;
    isRead: boolean;
}

export interface PlayerResult {
  userId: string;
  playerName: string;
  pubgId?: string;
  points: number;
  prize?: number;
  rank?: number;
}

export interface TournamentResult {
  id: string;
  tournamentId: string;
  tournamentTitle: string;
  isMega: boolean;
  results: PlayerResult[];
  declaredAt: Timestamp;
}
