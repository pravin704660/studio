
"use server";

import { db } from "@/lib/firebase/client";
import { adminStorage } from "@/lib/firebase/server";
import {
  doc,
  runTransaction,
  collection,
  addDoc,
  serverTimestamp,
  setDoc,
  deleteDoc,
  Timestamp,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { utrFollowUp, type UTRFollowUpInput } from "@/ai/flows/utr-follow-up";
import type { Tournament, UserProfile, TournamentFormData, Notification, PlayerResult } from "./lib/types";
import { v4 as uuidv4 } from 'uuid';


export async function joinTournament(tournamentId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await runTransaction(db, async (transaction) => {
      const userDocRef = doc(db, "users", userId);
      const tournamentDocRef = doc(db, "tournaments", tournamentId);
      
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

export async function createOrUpdateTournament(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const tournamentDataString = formData.get('tournamentData') as string;
    if (!tournamentDataString) {
      throw new Error("Tournament data is missing.");
    }
    const tournamentData: TournamentFormData = JSON.parse(tournamentDataString);
    const imageFile = formData.get('imageFile') as File | null;
    let imageUrl = ""; 

    if (imageFile) {
        const bucket = adminStorage.bucket();
        const fileName = `${uuidv4()}-${imageFile.name}`;
        const file = bucket.file(`tournaments/${fileName}`);
        const fileBuffer = Buffer.from(await imageFile.arrayBuffer());

        await file.save(fileBuffer, {
            metadata: {
                contentType: imageFile.type,
            },
        });
        
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491'
        });
        imageUrl = url;
    } else {
        if (tournamentData.isMega) {
            imageUrl = "https://picsum.photos/600/400";
        } else {
            imageUrl = "https://picsum.photos/600/400";
        }
    }

    if (!tournamentData.date || !tournamentData.time) {
      throw new Error("Date and time are required.");
    }
    
    const firestoreDate = Timestamp.fromDate(new Date(`${tournamentData.date}T${tournamentData.time}`));

    const finalData = {
      title: tournamentData.title || "",
      gameType: tournamentData.gameType || "Solo",
      date: firestoreDate,
      time: tournamentData.time || "",
      entryFee: tournamentData.entryFee || 0,
      slots: tournamentData.slots || 100,
      prize: tournamentData.prize || 0,
      rules: Array.isArray(tournamentData.rules) ? tournamentData.rules : String(tournamentData.rules || '').split('\n'),
      status: tournamentData.status || "draft",
      isMega: tournamentData.isMega || false,
      imageUrl: imageUrl,
      roomId: tournamentData.roomId || "",
      roomPassword: tournamentData.roomPassword || "",
    };
    
    const tournamentCollection = collection(db, 'tournaments');
    await addDoc(tournamentCollection, finalData);
    
    return { success: true };
  } catch (error: any) {
    console.error('Error creating/updating tournament:', error);
    return { success: false, error: error.message || 'Failed to create tournament.' };
  }
}

export async function deleteTournament(tournamentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const tournamentDocRef = doc(db, "tournaments", tournamentId);
    await deleteDoc(tournamentDocRef);
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting tournament:', error);
    return { success: false, error: 'Failed to delete tournament.' };
  }
}

export async function updateWalletBalance(
  userId: string,
  amount: number,
  type: 'credit' | 'debit'
): Promise<{ success: boolean; error?: string }> {
  if (amount <= 0) {
    return { success: false, error: 'Amount must be positive.' };
  }

  try {
    await runTransaction(db, async (transaction) => {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userDocRef);

      if (!userDoc.exists()) {
        throw new Error('User not found.');
      }

      const userProfile = userDoc.data() as UserProfile;
      let newBalance: number;

      if (type === 'credit') {
        newBalance = userProfile.walletBalance + amount;
      } else {
        if (userProfile.walletBalance < amount) {
          throw new Error('Insufficient funds for debit.');
        }
        newBalance = userProfile.walletBalance - amount;
      }
      
      transaction.update(userDocRef, { walletBalance: newBalance });

      const transactionDocRef = doc(collection(db, 'transactions'));
      transaction.set(transactionDocRef, {
        txnId: transactionDocRef.id,
        userId,
        amount,
        type,
        status: 'success',
        timestamp: serverTimestamp(),
        description: `Admin ${type}`,
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating wallet balance:', error);
    return { success: false, error: error.message };
  }
}


export async function sendNotification(
  targetUserId: string, // "all" for everyone
  title: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!title || !message) {
    return { success: false, error: "Title and message are required." };
  }

  try {
    await addDoc(collection(db, "notifications"), {
      userId: targetUserId,
      title,
      message,
      timestamp: serverTimestamp(),
      isRead: false,
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return { success: false, error: "Failed to send notification." };
  }
}


export async function deleteUserNotification(notificationId: string, userId: string): Promise<{ success: boolean, error?: string }> {
    try {
        const notifDocRef = doc(db, "notifications", notificationId);
        const notifDoc = await getDoc(notifDocRef);

        if (!notifDoc.exists()) {
            return { success: false, error: "Notification not found." };
        }

        const notification = notifDoc.data() as Notification;

        if (notification.userId !== userId && notification.userId !== 'all') {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (!userDoc.exists() || (userDoc.data() as UserProfile).role !== 'admin') {
               return { success: false, error: "You do not have permission to delete this notification." };
            }
        }

        if (notification.userId === 'all') {
             const userDoc = await getDoc(doc(db, "users", userId));
            if (!userDoc.exists() || (userDoc.data() as UserProfile).role !== 'admin') {
               return { success: false, error: "You cannot delete global announcements." };
            }
        }


        await deleteDoc(notifDocRef);
        return { success: true };

    } catch (error: any) {
        console.error("Error deleting notification:", error);
        return { success: false, error: "Failed to delete notification." };
    }
}

export async function updateUserProfileName(userId: string, newName: string): Promise<{ success: boolean, error?: string }> {
  if (!newName || newName.trim().length === 0) {
    return { success: false, error: "Name cannot be empty." };
  }
  try {
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, { name: newName.trim() });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating user name:", error);
    return { success: false, error: "Failed to update name." };
  }
}

export async function deleteUserNotifications(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: "User ID is required." };
    }
    try {
        const q = query(collection(db, "notifications"), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: true }; 
        }
        
        const batch = writeBatch(db);
        querySnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting user notifications:", error);
        return { success: false, error: "Failed to clear notifications." };
    }
}


export async function declareResult(
  tournamentId: string,
  tournamentTitle: string,
  results: PlayerResult[]
): Promise<{ success: boolean; error?: string }> {
  if (!tournamentId || results.length === 0) {
    return { success: false, error: "Missing tournament ID or results." };
  }

  try {
    const resultDocRef = doc(db, "results", tournamentId);
    
    const sortedResults = results.sort((a, b) => b.points - a.points).map((r, index) => ({...r, rank: index + 1}));
    
    await setDoc(resultDocRef, {
      tournamentId,
      tournamentTitle,
      results: sortedResults,
      declaredAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error declaring result:", error);
    return { success: false, error: "Failed to declare result." };
  }
}
