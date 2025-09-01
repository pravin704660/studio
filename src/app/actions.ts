"use server";

import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  runTransaction,
  collection,
  addDoc,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { utrFollowUp, type UTRFollowUpInput } from "@/ai/flows/utr-follow-up";
import type { Tournament, UserProfile } from "./lib/types";

export async function joinTournament(tournamentId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await runTransaction(db, async (transaction) => {
      const userDocRef = doc(db, "users", userId);
      const tournamentDocRef = doc(db, "tournaments", tournamentId);
      const entryQuery = collection(db, "entries");

      const [userDoc, tournamentDoc] = await Promise.all([
        transaction.get(userDocRef),
        transaction.get(tournamentDocRef),
      ]);

      if (!userDoc.exists()) throw new Error("User not found.");
      if (!tournamentDoc.exists()) throw new Error("Tournament not found.");

      const userProfile = userDoc.data() as UserProfile;
      const tournament = tournamentDoc.data() as Tournament;

      if (userProfile.walletBalance < tournament.entryFee) {
        throw new Error("Insufficient wallet balance.");
      }

      const newBalance = userProfile.walletBalance - tournament.entryFee;
      transaction.update(userDocRef, { walletBalance: newBalance });
      
      const entryDocRef = doc(collection(db, "entries"));
      transaction.set(entryDocRef, {
        entryId: entryDocRef.id,
        tournamentId,
        userId,
        status: "confirmed",
        paidAmount: tournament.entryFee,
      });

      const transactionDocRef = doc(collection(db, "transactions"));
      transaction.set(transactionDocRef, {
        txnId: transactionDocRef.id,
        userId,
        amount: tournament.entryFee,
        type: "debit",
        status: "success",
        timestamp: serverTimestamp(),
        description: `Entry for ${tournament.title}`
      });
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitWalletRequest(userId: string, amount: number, utr: string): Promise<{ success: boolean; error?: string }> {
  if (amount <= 0 || !utr) {
    return { success: false, error: "Invalid amount or UTR code." };
  }
  try {
    const requestColRef = collection(db, 'wallet_requests');
    const newRequestRef = doc(requestColRef);
    
    await addDoc(collection(db, "wallet_requests"), {
      requestId: newRequestRef.id,
      userId,
      amount,
      utr,
      status: "pending",
      timestamp: serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Failed to submit request." };
  }
}

export async function getUtrFollowUpMessage(input: UTRFollowUpInput): Promise<string | null> {
    try {
        const result = await utrFollowUp(input);
        return result.followUpMessage;
    } catch (error) {
        console.error("Error in GenAI flow:", error);
        return "We've noticed your payment request is still pending. Please contact support for assistance.";
    }
}
