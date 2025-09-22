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
import type {
  Tournament,
  UserProfile,
  TournamentFormData,
  Notification,
  PlayerResult,
  AppConfig,
} from "./lib/types";
import { v4 as uuidv4 } from "uuid";

/**
 * joinTournament
 */
export async function joinTournament(
  tournamentId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
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
      transaction.update(userDocRef, { walletBalance: newBalance });

      const entryDocRef = doc(collection(db, "entries"));
      transaction.set(entryDocRef, {
        entryId: entryDocRef.id,
        tournamentId,
        userId,
        status: "confirmed",
        paidAmount: tournament.entryFee,
        createdAt: serverTimestamp(),
      });

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

    // notify admins
    const adminsQuery = query(collection(db, "users"), where("role", "==", "admin"));
    const adminsSnapshot = await getDocs(adminsQuery);

    const title = "New Tournament Entry";
    const message = `${userProfileData.name || "A user"} has joined the tournament: ${tournamentData.title}.`;

    const notifPromises = adminsSnapshot.docs.map((adminDoc) => {
      const admin = adminDoc.data() as UserProfile;
      return sendNotification(admin.uid, title, message);
    });

    await Promise.all(notifPromises);

    return { success: true };
  } catch (error: any) {
    console.error("joinTournament error:", error);
    return { success: false, error: error?.message || "Failed to join tournament." };
  }
}

/**
 * submitWalletRequest
 */
export async function submitWalletRequest(
  userId: string,
  amount: number,
  utr: string
): Promise<{ success: boolean; error?: string }> {
  if (amount <= 0 || !utr) {
    return { success: false, error: "Invalid amount or UTR code." };
  }
  try {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      return { success: false, error: "User not found." };
    }
    const userData = userDoc.data() as UserProfile;

    const requestColRef = collection(db, "wallet_requests");
    const newRequestRef = doc(requestColRef);

    await setDoc(newRequestRef, {
      requestId: newRequestRef.id,
      userId,
      userName: userData.name || "N/A",
      userEmail: userData.email || "N/A",
      amount,
      utr,
      status: "pending",
      timestamp: serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("submitWalletRequest error:", error);
    return { success: false, error: "Failed to submit request." };
  }
}

/**
 * submitWithdrawalRequest
 */
export async function submitWithdrawalRequest(
  userId: string,
  amount: number,
  upiId: string
): Promise<{ success: boolean; error?: string }> {
  if (amount <= 0 || !upiId) {
    return { success: false, error: "Invalid amount or UPI ID." };
  }

  try {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      return { success: false, error: "User not found." };
    }
    const userData = userDoc.data() as UserProfile;

    if (userData.walletBalance < amount) {
      return { success: false, error: "Insufficient wallet balance." };
    }

    const requestColRef = collection(db, "withdrawal_requests");
    const newRequestRef = doc(requestColRef);

    await setDoc(newRequestRef, {
      requestId: newRequestRef.id,
      userId,
      userName: userData.name || "N/A",
      userEmail: userData.email || "N/A",
      amount,
      upiId,
      status: "pending",
      timestamp: serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("submitWithdrawalRequest error:", error);
    return { success: false, error: "Failed to submit request." };
  }
}

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
 * createOrUpdateTournament
 * Accepts FormData (file upload optional) and saves to firestore.
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
    
let imageUrl = tournamentData.imageUrl || "";

if (!tournamentData.date || !tournamentData.time) {
  throw new Error("Date and time are required.");
}

    const dateTimeString = `${tournamentData.date}T${tournamentData.time}`;
    const firestoreDate = Timestamp.fromDate(new Date(dateTimeString));

    const finalData: Omit<Tournament, "id"> = {
      title: tournamentData.title || "",
      gameType: tournamentData.gameType || "Solo",
      date: firestoreDate,
      time: tournamentData.time || "",
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
imageUrl:
  tournamentData.imageUrl && tournamentData.imageUrl.trim() !== ""
    ? tournamentData.imageUrl
    : tournamentData.type === "mega"
    ? "/tournaments/MegaTournaments.jpg"
    : "/tournaments/RegularTournaments.jpg",
      
      roomId: tournamentData.roomId || "",
      roomPassword: tournamentData.roomPassword || "",
      winnerPrizes: tournamentData.winnerPrizes || [], 
      joinedUsers: tournamentData.joinedUsers ?? [],
    };

    if (tournamentData.id) {
      const tournamentDocRef = doc(db, "tournaments", tournamentData.id);
      await setDoc(tournamentDocRef, finalData, { merge: true });
    } else {
      await addDoc(collection(db, "tournaments"), finalData);
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
