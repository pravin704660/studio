
"use server";

import {
  doc,
  setDoc,
  addDoc,
  collection,
  Timestamp,
  deleteDoc,
  runTransaction,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  writeBatch,
  increment,
  serverTimestamp,
  arrayUnion, 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { utrFollowUp, type UTRFollowUpInput } from "@/ai/flows/utr-follow-up";
import type {
  Tournament,
  UserProfile,
  TournamentFormData,
  Notification,
  PlayerResult,
  AppConfig,
} from "./lib/types";
import { v4 as uuidv4 } from "uuid";

// ===================================================
//              ADMIN / TOURNAMENT ACTIONS
// ===================================================

/**
 * createOrUpdateTournament - ટૂર્નામેન્ટ બનાવવામાં કે અપડેટ કરવામાં આવતી સમસ્યા અહીં ઠીક કરાઈ છે.
 */
export async function createOrUpdateTournament(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const tournamentDataString = formData.get("tournamentData") as string;
    if (!tournamentDataString) {
      throw new Error("Tournament data is missing.");
    }
    const tournamentData: TournamentFormData = JSON.parse(tournamentDataString);

    if (!tournamentData.date || !tournamentData.time) {
      throw new Error("Date and time are required.");
    }

    const [year, month, day] = tournamentData.date.split('-').map(Number);
    const [hour, minute] = tournamentData.time.split(':').map(Number);
    
    // ભારતીય સમય (IST) ને UTC માં કન્વર્ટ કરવું
    const dateIST = new Date(year, month - 1, day, hour, minute);
    // IST is UTC+5:30. Subtracting 330 minutes to get UTC.
    const dateUTC = new Date(dateIST.getTime() - (330 * 60 * 1000)); 
    const firestoreDate = Timestamp.fromDate(dateUTC);

    // અહીં ઇમેજ અપલોડ મેનેજમેન્ટ લોજિક ખૂટે છે.
    // હાલમાં, અમે માત્ર ડિફોલ્ટ URL નો ઉપયોગ કરીશું.
    const finalImageUrl =
      tournamentData.imageUrl && tournamentData.imageUrl.trim() !== ""
        ? tournamentData.imageUrl
        : tournamentData.isMega
        ? "/tournaments/MegaTournaments.jpg"
        : "/tournaments/RegularTournaments.jpg";

    const finalData: Omit<Tournament, "id" | "time"> = {
      title: tournamentData.title || "",
      gameType: tournamentData.gameType || "Solo",
      date: firestoreDate,
      entryFee: tournamentData.entryFee || 0,
      slots: tournamentData.slots || 100,
      prize: tournamentData.prize || 0,
      rules: Array.isArray(tournamentData.rules)
        ? tournamentData.rules
        : String(tournamentData.rules || "")
            .split("\n")
            .filter((r) => r.trim() !== ""),
      status: tournamentData.status || "draft",
      isMega: tournamentData.isMega || false,
      imageUrl: finalImageUrl,
      roomId: tournamentData.roomId || "",
      roomPassword: tournamentData.roomPassword || "",
      winnerPrizes: tournamentData.winnerPrizes || [],
    };
    
    if (tournamentData.id) {
        // અપડેટ કરો
        const tournamentDocRef = doc(db, "tournaments", tournamentData.id);
        await setDoc(tournamentDocRef, finalData, { merge: true });
    } else {
        // નવું બનાવો
        await addDoc(collection(db, "tournaments"), {
            ...finalData,
            joinedUsersList: [], // ✅ Fix: joinTournament સાથે મેચ કરવા માટે નામ સુધાર્યું
            joinedUsersCount: 0, 
        });
    }

    return { success: true };
    
  } catch (error: any) {
    console.error("createOrUpdateTournament error:", error);
    return { success: false, error: error?.message || "Failed to save tournament." };
  }
}

/**
 * deleteTournament
 */
export async function deleteTournament(tournamentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const tournamentDocRef = doc(db, "tournaments", tournamentId);
    await deleteDoc(tournamentDocRef);
    return { success: true };
  } catch (error: any) {
    console.error("deleteTournament error:", error);
    return { success: false, error: "Failed to delete tournament." };
  }
}

/**
 * declareResult
 */
export async function declareResult(
  tournamentId: string,
  tournamentTitle: string,
  isMega: boolean,
  results: PlayerResult[]
): Promise<{ success: boolean; error?: string }> {
  if (!tournamentId || results.length === 0) {
    return { success: false, error: "Missing tournament ID or results." };
  }

  try {
    const batch = writeBatch(db);
    const resultDocRef = doc(db, "results", tournamentId);

    const sortedResults = results
      .sort((a, b) => b.points - a.points)
      .map((r, index) => ({ ...r, rank: index + 1 }));

    batch.set(resultDocRef, {
      tournamentId,
      tournamentTitle,
      isMega,
      results: sortedResults,
      declaredAt: serverTimestamp(),
    });

    for (const result of sortedResults) {
      const title = `Result Declared: ${tournamentTitle}`;
      let message = `Congratulations! You secured rank #${result.rank} with ${result.points} points.`;

      if (result.prize && result.prize > 0) {
        message += ` You've won ?${result.prize}!`;
        const userDocRef = doc(db, "users", result.userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userProfile = userDoc.data() as UserProfile;
          const newBalance = (userProfile.walletBalance || 0) + result.prize;
          batch.update(userDocRef, { walletBalance: newBalance });

          const transactionDocRef = doc(collection(db, "transactions"));
          batch.set(transactionDocRef, {
            txnId: transactionDocRef.id,
            userId: result.userId,
            amount: result.prize,
            type: "credit",
            status: "success",
            timestamp: serverTimestamp(),
            description: `Prize money for ${tournamentTitle}`,
          });
        }
      }

      const notificationDocRef = doc(collection(db, "notifications"));
      batch.set(notificationDocRef, {
        userId: result.userId,
        title,
        message,
        timestamp: serverTimestamp(),
        isRead: false,
      });
    }

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("declareResult error:", error);
    return { success: false, error: "Failed to declare result." };
  }
}


// ===================================================
//              USER / JOIN ACTIONS
// ===================================================

/**
 * joinTournament - યુઝરને ટુર્નામેન્ટમાં જોઈન કરવા માટેનો કોડ
 */
export async function joinTournament(
  tournamentId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. ચેક કરો કે યુઝર પહેલેથી જોડાયેલ છે કે નહીં
    const entriesRef = collection(db, "entries");
    const q = query(
      entriesRef,
      where("userId", "==", userId),
      where("tournamentId", "==", tournamentId)
    );
    const existingEntrySnapshot = await getDocs(q);
    if (!existingEntrySnapshot.empty) {
      return { success: false, error: "You have already joined this tournament." };
    }

    const userDocRef = doc(db, "users", userId);
    const tournamentDocRef = doc(db, "tournaments", tournamentId);

    const [userDoc, tournamentDoc] = await Promise.all([getDoc(userDocRef), getDoc(tournamentDocRef)]);

    if (!userDoc.exists()) throw new Error("User not found.");
    if (!tournamentDoc.exists()) throw new Error("Tournament not found.");

    const userProfileData = userDoc.data() as UserProfile;
    const tournamentData = { ...tournamentDoc.data(), id: tournamentDoc.id } as Tournament;

    await runTransaction(db, async (transaction) => {
      const freshUserDoc = await transaction.get(userDocRef);
      const freshTournamentDoc = await transaction.get(tournamentDocRef);

      if (!freshUserDoc.exists()) throw new Error("User not found.");
      if (!freshTournamentDoc.exists()) throw new Error("Tournament not found.");

      const userProfile = freshUserDoc.data() as UserProfile;
      const tournament = freshTournamentDoc.data() as Tournament;

      if (userProfile.walletBalance < tournament.entryFee) {
        throw new Error("Insufficient wallet balance.");
      }
      
      const newBalance = userProfile.walletBalance - tournament.entryFee;
      
      // 2. યુઝરના બેલેન્સમાંથી એન્ટ્રી ફી કાપો
      transaction.update(userDocRef, { walletBalance: newBalance });
      
      // 3. ટુર્નામેન્ટ ડોક્યુમેન્ટમાં યુઝરની એન્ટ્રી ઉમેરો
      transaction.update(tournamentDocRef, { 
          joinedUsersCount: increment(1),
          joinedUsersList: arrayUnion({ 
              userId: userDoc.id,
              userName: userProfile.name || "Unknown User",
              joinedAt: serverTimestamp(),
          }),
      });

      // 4. entries કલેક્શનમાં એન્ટ્રી રેકોર્ડ કરો (જોઇન્ડ સ્ટેટ માટે આ જરૂરી છે)
      const entryDocRef = doc(collection(db, "entries"));
      transaction.set(entryDocRef, {
        entryId: entryDocRef.id,
        tournamentId,
        userId,
        status: "confirmed",
        paidAmount: tournament.entryFee,
        createdAt: serverTimestamp(),
      });

      // 5. transactions કલેક્શનમાં ડેબિટ રેકોર્ડ કરો
      const transactionDocRef = doc(collection(db, "transactions"));
      transaction.set(transactionDocRef, {
        txnId: transactionDocRef.id,
        userId,
        amount: tournament.entryFee,
        type: "debit",
        status: "success",
        timestamp: serverTimestamp(),
        description: `Entry for ${tournament.title}`,
      });
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("joinTournament error:", error);
    return { success: false, error: error?.message || "Failed to join tournament." };
  }
}


/**
 * getTournamentJoinStatus - યુઝર UI માં 'Join' ને બદલે 'Joined' બતાવવા માટે આ ફંક્શન વાપરો
 */
export async function getTournamentJoinStatus(
    tournamentId: string,
    userId: string
): Promise<{ isJoined: boolean }> {
  try {
    const entriesRef = collection(db, "entries");
    const q = query(
      entriesRef,
      where("userId", "==", userId),
      where("tournamentId", "==", tournamentId)
    );
    const existingEntrySnapshot = await getDocs(q);
    
    // જો entries કલેક્શનમાં યુઝરની એન્ટ્રી મળી જાય, તો તે joined છે.
    return { isJoined: !existingEntrySnapshot.empty };
  } catch (error) {
    console.error("Error checking tournament join status:", error);
    return { isJoined: false };
  }
}

// ===================================================
//              WALLETS / NOTIFICATIONS / UTILS
// ===================================================

/**
 * getUtrFollowUpMessage - wrapper for AI flow
 */
export async function getUtrFollowUpMessage(input: UTRFollowUpInput): Promise<string | null> {
  try {
    const result = await utrFollowUp(input);
    return result.followUpMessage;
  } catch (error) {
    console.error("getUtrFollowUpMessage error:", error);
    return "We've noticed your payment request is still pending. Please contact support for assistance.";
  }
}

/**
 * updateWalletBalance
 */
export async function updateWalletBalance(
  userId: string,
  amount: number,
  type: "credit" | "debit"
): Promise<{ success: boolean; error?: string }> {
  if (amount <= 0) {
    return { success: false, error: "Amount must be positive." };
  }

  try {
    await runTransaction(db, async (transaction) => {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await transaction.get(userDocRef);

      if (!userDoc.exists()) {
        throw new Error("User not found.");
      }

      const userProfile = userDoc.data() as UserProfile;
      let newBalance: number;

      if (type === "credit") {
        newBalance = userProfile.walletBalance + amount;
      } else {
        if (userProfile.walletBalance < amount) {
          throw new Error("Insufficient funds for debit.");
        }
        newBalance = userProfile.walletBalance - amount;
      }

      transaction.update(userDocRef, { walletBalance: newBalance }); 
      
      const transactionDocRef = doc(collection(db, "transactions"));
      transaction.set(transactionDocRef, {
        txnId: transactionDocRef.id,
        userId,
        amount,
        type,
        status: "success",
        timestamp: serverTimestamp(),
        description: `Admin ${type}`,
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("updateWalletBalance error:", error);
    return { success: false, error: error?.message || "Failed to update balance." };
  }
}


/**
 * sendNotification
 */
export async function sendNotification(
  targetUserId: string,
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
    console.error("sendNotification error:", error);
    return { success: false, error: "Failed to send notification." };
  }
}

/**
 * deleteUserNotification
 */
export async function deleteUserNotification(
  notificationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const notifDocRef = doc(db, "notifications", notificationId);
    const notifDoc = await getDoc(notifDocRef);

    if (!notifDoc.exists()) {
      return { success: false, error: "Notification not found." };
    }

    const notification = notifDoc.data() as Notification;

    if (notification.userId !== userId && notification.userId !== "all") {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (!userDoc.exists() || (userDoc.data() as UserProfile).role !== "admin") {
        return { success: false, error: "You do not have permission to delete this notification." };
      }
    }

    if (notification.userId === "all") {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (!userDoc.exists() || (userDoc.data() as UserProfile).role !== "admin") {
        return { success: false, error: "You cannot delete global announcements." };
      }
    }

    await deleteDoc(notifDocRef);
    return { success: true };
  } catch (error: any) {
    console.error("deleteUserNotification error:", error);
    return { success: false, error: "Failed to delete notification." };
  }
}

/**
 * updateUserProfileName
 */
export async function updateUserProfileName(
  userId: string,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  if (!newName || newName.trim().length === 0) {
    return { success: false, error: "Name cannot be empty." };
  }
  try {
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, { name: newName.trim() });
    return { success: true };
  } catch (error: any) {
    console.error("updateUserProfileName error:", error);
    return { success: false, error: "Failed to update name." };
  }
}

/**
 * deleteUserNotifications (batch)
 */
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
    querySnapshot.forEach((d) => {
      batch.delete(d.ref);
    });

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("deleteUserNotifications error:", error);
    return { success: false, error: "Failed to clear notifications." };
  }
}

/**
 * updateWalletRequestStatus
 */
export async function updateWalletRequestStatus(
  requestId: string,
  userId: string,
  amount: number,
  newStatus: "approved" | "rejected"
): Promise<{ success: boolean; error?: string }> {
  try {
    const requestDocRef = doc(db, "wallet_requests", requestId);

    if (newStatus === "approved") {
      await runTransaction(db, async (transaction) => {
        const userDocRef = doc(db, "users", userId);
        const userDoc = await transaction.get(userDocRef);

        if (!userDoc.exists()) {
          throw new Error("User not found.");
        }

        const userProfile = userDoc.data() as UserProfile;
        const newBalance = (userProfile.walletBalance || 0) + amount;

        transaction.update(userDocRef, { walletBalance: newBalance });

        const transactionDocRef = doc(collection(db, "transactions"));
        transaction.set(transactionDocRef, {
          txnId: transactionDocRef.id,
          userId,
          amount,
          type: "credit",
          status: "success",
          timestamp: serverTimestamp(),
          description: "Wallet deposit approved",
        });

        transaction.update(requestDocRef, { status: newStatus });
      });

      await sendNotification(userId, "Deposit Approved", `Your request to add ?${amount} has been approved.`);
    } else {
      await updateDoc(requestDocRef, { status: newStatus });
      await sendNotification(userId, "Deposit Rejected", `Your request to add ?${amount} has been rejected.`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("updateWalletRequestStatus error:", error);
    return { success: false, error: error?.message || "Failed to update request." };
  }
}

/**
 * updateWithdrawalRequestStatus
 */
export async function updateWithdrawalRequestStatus(
  requestId: string,
  userId: string,
  amount: number,
  newStatus: "approved" | "rejected"
): Promise<{ success: boolean; error?: string }> {
  try {
    const requestDocRef = doc(db, "withdrawal_requests", requestId);

    if (newStatus === "approved") {
      await runTransaction(db, async (transaction) => {
        const userDocRef = doc(db, "users", userId);
        const userDoc = await transaction.get(userDocRef);

        if (!userDoc.exists()) {
          throw new Error("User not found.");
        }

        const userProfile = userDoc.data() as UserProfile;
        if ((userProfile.walletBalance || 0) < amount) {
          throw new Error("Insufficient funds for withdrawal.");
        }
        const newBalance = (userProfile.walletBalance || 0) - amount;

        transaction.update(userDocRef, { walletBalance: newBalance });

        const transactionDocRef = doc(collection(db, "transactions"));
        transaction.set(transactionDocRef, {
          txnId: transactionDocRef.id,
          userId,
          amount,
          type: "debit",
          status: "success",
          timestamp: serverTimestamp(),
          description: "Withdrawal approved",
        });

        transaction.update(requestDocRef, { status: newStatus });
      });

      await sendNotification(userId, "Withdrawal Approved", `Your withdrawal of ?${amount} has been approved.`);
    } else {
      await updateDoc(requestDocRef, { status: newStatus });
      await sendNotification(userId, "Withdrawal Rejected", `Your withdrawal of ?${amount} has been rejected.`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("updateWithdrawalRequestStatus error:", error);
    return { success: false, error: error?.message || "Failed to update withdrawal request." };
  }
}
