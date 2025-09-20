"use server";

import { getFirestore, Timestamp, FieldValue, Transaction, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminApp, adminStorage } from "@/lib/firebase/server";
import type { Tournament, UserProfile, TournamentFormData, Notification, PlayerResult, AppConfig } from "@/lib/types";
import { v4 as uuidv4 } from 'uuid';
import type admin from 'firebase-admin';
import { getUtrFollowUpMessage } from "@/ai/flows/utr-follow-up";


// Use the admin SDK for server-side operations
const db = getFirestore(adminApp!);


export async function joinTournament(tournamentId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if the user has already joined the tournament
    const entriesRef = db.collection("entries");
    const q = entriesRef.where("userId", "==", userId).where("tournamentId", "==", tournamentId);
    const existingEntrySnapshot = await q.get();
    if (!existingEntrySnapshot.empty) {
      return { success: false, error: "You have already joined this tournament." };
    }
      
    const userDocRef = db.doc(`users/${userId}`);
    const tournamentDocRef = db.doc(`tournaments/${tournamentId}`);

    // Fetch user and tournament data outside the transaction for notification use
    const [userDoc, tournamentDoc] = await Promise.all([
      userDocRef.get(),
      tournamentDocRef.get(),
    ]);

    if (!userDoc.exists) throw new Error("User not found.");
    if (!tournamentDoc.exists) throw new Error("Tournament not found.");

    const userProfileData = userDoc.data() as UserProfile;
    const tournamentData = { ...tournamentDoc.data(), id: tournamentDoc.id } as Tournament;

    await db.runTransaction(async (transaction: Transaction) => {
      // Re-get documents inside the transaction to ensure atomicity
      const freshUserDoc = await transaction.get(userDocRef);
      const freshTournamentDoc = await transaction.get(tournamentDocRef);

      if (!freshUserDoc.exists) throw new Error("User not found.");
      if (!freshTournamentDoc.exists) throw new Error("Tournament not found.");
      
      const userProfile = freshUserDoc.data() as UserProfile;
      const tournament = freshTournamentDoc.data() as Tournament;

      if (userProfile.walletBalance < tournament.entryFee) {
        throw new Error("Insufficient wallet balance.");
      }

      const newBalance = userProfile.walletBalance - tournament.entryFee;
      transaction.update(userDocRef, { walletBalance: newBalance });
      
      const entryDocRef = db.collection("entries").doc();
      transaction.set(entryDocRef, {
        entryId: entryDocRef.id,
        tournamentId,
        userId,
        status: "confirmed",
        paidAmount: tournament.entryFee,
      });

      const transactionDocRef = db.collection("transactions").doc();
      transaction.set(transactionDocRef, {
        txnId: transactionDocRef.id,
        userId,
        amount: tournament.entryFee,
        type: "debit",
        status: "success",
        timestamp: FieldValue.serverTimestamp(),
        description: `Entry for ${tournament.title}`
      });
    });

    // Send notification to all admins after the transaction is successful
    const adminsQuery = db.collection("users").where("role", "==", "admin");
    const adminsSnapshot = await adminsQuery.get();
    
    const title = "New Tournament Entry";
    const message = `${userProfileData.name || 'A user'} has joined the tournament: ${tournamentData.title}.`;

    const notificationPromises = adminsSnapshot.docs.map((adminDoc: QueryDocumentSnapshot) => {
        const admin = adminDoc.data() as UserProfile;
        return sendNotification(admin.uid, title, message);
    });

    await Promise.all(notificationPromises);
    
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
    const userDocRef = db.doc(`users/${userId}`);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
        return { success: false, error: "User not found." };
    }
    const userData = userDoc.data() as UserProfile;

    const requestColRef = db.collection('wallet_requests');
    const newRequestRef = requestColRef.doc();
    
    await newRequestRef.set({
      requestId: newRequestRef.id,
      userId,
      userName: userData.name || "N/A",
      userEmail: userData.email || "N/A",
      amount,
      utr,
      status: "pending",
      timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error submitting wallet request:", error);
    return { success: false, error: "Failed to submit request." };
  }
}

export async function submitWithdrawalRequest(userId: string, amount: number, upiId: string): Promise<{ success: boolean; error?: string }> {
  if (amount <= 0 || !upiId) {
    return { success: false, error: "Invalid amount or UPI ID." };
  }

  try {
    const userDocRef = db.doc(`users/${userId}`);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
        return { success: false, error: "User not found." };
    }
    const userData = userDoc.data() as UserProfile;

    if (userData.walletBalance < amount) {
        return { success: false, error: "Insufficient wallet balance." };
    }

    const requestColRef = db.collection('withdrawal_requests');
    const newRequestRef = requestColRef.doc();
    
    await newRequestRef.set({
      requestId: newRequestRef.id,
      userId,
      userName: userData.name || "N/A",
      userEmail: userData.email || "N/A",
      amount,
      upiId,
      status: "pending",
      timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error submitting withdrawal request:", error);
    return { success: false, error: "Failed to submit request." };
  }
}

export async function createOrUpdateTournament(
  tournamentData: TournamentFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    let firestoreDate: admin.firestore.Timestamp | null = null;

    // ✅ Date & Time combine safely
    if (tournamentData.date && tournamentData.time) {
      const dateTimeString = `${tournamentData.date}T${tournamentData.time}:00`;
      const jsDate = new Date(dateTimeString);
      if (!isNaN(jsDate.getTime())) {
        firestoreDate = Timestamp.fromDate(jsDate);
      }
    }

    let imageUrl = tournamentData.imageUrl || "";
    if (!tournamentData.id && !imageUrl) {
      imageUrl = tournamentData.isMega ? `/MegaTournaments.jpg` : `/RegularTournaments.jpg`;
    }

    const finalData: Omit<Tournament, "id"> & { date: admin.firestore.Timestamp | null } = {
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
  status: tournamentData.status ? tournamentData.status : "published", // ✅ FIXED
  isMega: tournamentData.isMega || false,
  imageUrl,
  roomId: tournamentData.roomId || "",
  roomPassword: tournamentData.roomPassword || "",
  winnerPrizes: tournamentData.winnerPrizes || [],
};

    if (tournamentData.id) {
      const tournamentDocRef = db.doc(`tournaments/${tournamentData.id}`);
      await tournamentDocRef.set(finalData, { merge: true });
    } else {
      await db.collection("tournaments").add(finalData);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error creating/updating tournament:", error);
    return { success: false, error: error.message || "Failed to save tournament." };
  }
}

export async function deleteTournament(tournamentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const tournamentDocRef = db.doc(`tournaments/${tournamentId}`);
    await tournamentDocRef.delete();
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
    await db.runTransaction(async (transaction: Transaction) => {
      const userDocRef = db.doc(`users/${userId}`);
      const userDoc = await transaction.get(userDocRef);

      if (!userDoc.exists) {
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

      const transactionDocRef = db.collection('transactions').doc();
      transaction.set(transactionDocRef, {
        txnId: transactionDocRef.id,
        userId,
        amount,
        type,
        status: 'success',
        timestamp: FieldValue.serverTimestamp(),
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
    await db.collection("notifications").add({
      userId: targetUserId,
      title,
      message,
      timestamp: FieldValue.serverTimestamp(),
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
        const notifDocRef = db.doc(`notifications/${notificationId}`);
        const notifDoc = await notifDocRef.get();

        if (!notifDoc.exists) {
            return { success: false, error: "Notification not found." };
        }

        const notification = notifDoc.data() as Notification;

        if (notification.userId !== userId && notification.userId !== 'all') {
            const userDoc = await db.doc(`users/${userId}`).get();
            if (!userDoc.exists || (userDoc.data() as UserProfile).role !== 'admin') {
               return { success: false, error: "You do not have permission to delete this notification." };
            }
        }

        if (notification.userId === 'all') {
             const userDoc = await db.doc(`users/${userId}`).get();
            if (!userDoc.exists || (userDoc.data() as UserProfile).role !== 'admin') {
               return { success: false, error: "You cannot delete global announcements." };
            }
        }


        await notifDocRef.delete();
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
    const userDocRef = db.doc(`users/${userId}`);
    await userDocRef.update({ name: newName.trim() });
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
        const q = db.collection("notifications").where("userId", "==", userId);
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            return { success: true }; 
        }
        
        const batch = db.batch();
        querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
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
  isMega: boolean,
  results: PlayerResult[]
): Promise<{ success: boolean; error?: string }> {
  if (!tournamentId || results.length === 0) {
    return { success: false, error: "Missing tournament ID or results." };
  }

  try {
    const batch = db.batch();
    const resultDocRef = db.doc(`results/${tournamentId}`);
    
    const sortedResults = results
      .sort((a, b) => b.points - a.points)
      .map((r, index) => ({...r, rank: index + 1}));
    
    batch.set(resultDocRef, {
      tournamentId,
      tournamentTitle,
      isMega,
      results: sortedResults,
      declaredAt: FieldValue.serverTimestamp(),
    });

    for (const result of sortedResults) {
      if (!result.userId) continue;

      const title = `Result Declared: ${tournamentTitle}`;
      let message = `Congratulations! You secured rank #${result.rank} with ${result.points} points.`;
      
      if (result.prize && result.prize > 0) {
        message += ` You've won ₹${result.prize}!`;
        const userDocRef = db.doc(`users/${result.userId}`);
        const userDoc = await userDocRef.get();
        if (userDoc.exists) {
            const userProfile = userDoc.data() as UserProfile;
            const newBalance = userProfile.walletBalance + result.prize;
            batch.update(userDocRef, { walletBalance: newBalance });

            const transactionDocRef = db.collection('transactions').doc();
            batch.set(transactionDocRef, {
                txnId: transactionDocRef.id,
                userId: result.userId,
                amount: result.prize,
                type: 'credit',
                status: 'success',
                timestamp: FieldValue.serverTimestamp(),
                description: `Prize money for ${tournamentTitle}`,
            });
        }
      }
      
      const notificationDocRef = db.collection("notifications").doc();
      batch.set(notificationDocRef, {
        userId: result.userId,
        title,
        message,
        timestamp: FieldValue.serverTimestamp(),
        isRead: false,
      });
    }

    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error("Error declaring result:", error);
    return { success: false, error: "Failed to declare result." };
  }
}

export async function updateWalletRequestStatus(
  requestId: string,
  userId: string,
  amount: number,
  newStatus: 'approved' | 'rejected'
): Promise<{ success: boolean; error?: string }> {
  try {
    const requestDocRef = db.doc(`wallet_requests/${requestId}`);

    if (newStatus === 'approved') {
        await db.runTransaction(async (transaction: Transaction) => {
            const userDocRef = db.doc(`users/${userId}`);
            const userDoc = await transaction.get(userDocRef);

            if (!userDoc.exists) {
                throw new Error('User not found.');
            }

            const userProfile = userDoc.data() as UserProfile;
            const newBalance = userProfile.walletBalance + amount;
            
            transaction.update(userDocRef, { walletBalance: newBalance });

            const transactionDocRef = db.collection('transactions').doc();
            transaction.set(transactionDocRef, {
                txnId: transactionDocRef.id,
                userId,
                amount,
                type: 'credit',
                status: 'success',
                timestamp: FieldValue.serverTimestamp(),
                description: 'Wallet deposit approved',
            });

            transaction.update(requestDocRef, { status: newStatus });
        });

        await sendNotification(userId, "Deposit Approved", `Your request to add ₹${amount} has been approved.`);

    } else { // Rejected
        await requestDocRef.update({ status: newStatus });
        await sendNotification(userId, "Deposit Rejected", `Your request to add ₹${amount} has been rejected.`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error updating wallet request:", error);
    return { success: false, error: error.message || 'Failed to update request.' };
  }
}

export async function updateWithdrawalRequestStatus(
  requestId: string,
  userId: string,
  amount: number,
  newStatus: 'approved' | 'rejected'
): Promise<{ success: boolean; error?: string }> {
  try {
    const requestDocRef = db.doc(`withdrawal_requests/${requestId}`);

    if (newStatus === 'approved') {
        await db.runTransaction(async (transaction: Transaction) => {
            const userDocRef = db.doc(`users/${userId}`);
            const userDoc = await transaction.get(userDocRef);

            if (!userDoc.exists) {
                throw new Error('User not found.');
            }

            const userProfile = userDoc.data() as UserProfile;
            if (userProfile.walletBalance < amount) {
                throw new Error('Insufficient funds for withdrawal.');
            }
            const newBalance = userProfile.walletBalance - amount;
            
            transaction.update(userDocRef, { walletBalance: newBalance });

            const transactionDocRef = db.collection('transactions').doc();
            transaction.set(transactionDocRef, {
                txnId: transactionDocRef.id,
                userId,
                amount,
                type: 'debit',
                status: 'success',
                timestamp: FieldValue.serverTimestamp(),
                description: 'Withdrawal approved',
            });

            transaction.update(requestDocRef, { status: newStatus });
        });

        await sendNotification(userId, "Withdrawal Approved", `Your request to withdraw ₹${amount} has been approved.`);

    } else { // Rejected
        await requestDocRef.update({ status: newStatus });
        await sendNotification(userId, "Withdrawal Rejected", `Your request to withdraw ₹${amount} has been rejected.`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error updating withdrawal request:", error);
    return { success: false, error: error.message || 'Failed to update request.' };
  }
}


export async function updatePaymentSettings(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const upiId = formData.get('upiId') as string;
    const qrImageFile = formData.get('qrImageFile') as File | null;
    let qrImageUrl: string | undefined = "";

    const configDocRef = db.doc("config/payment");
    const currentConfigDoc = await configDocRef.get();
    const currentConfig = currentConfigDoc.exists ? currentConfigDoc.data() as AppConfig : { upiId: "", qrImageUrl: "" };
    
    qrImageUrl = currentConfig.qrImageUrl; // Keep old image by default

    if (qrImageFile && qrImageFile.size > 0) { // ખાતરી કરો કે ફાઇલ ખરેખર અપલોડ થઈ છે
      const bucket = adminStorage.bucket();
      const fileName = `config/${uuidv4()}-${qrImageFile.name}`;
      const file = bucket.file(fileName);
      const fileBuffer = Buffer.from(await qrImageFile.arrayBuffer());

      await file.save(fileBuffer, {
        metadata: { contentType: qrImageFile.type },
      });

      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491'
      });
      qrImageUrl = url;
    }

    const newConfig: AppConfig = {
      upiId: upiId,
      qrImageUrl: qrImageUrl,
    };

    await configDocRef.set(newConfig, { merge: true }); // merge: true નો ઉપયોગ કરો જેથી અન્ય ફીલ્ડ્સ ઓવરરાઈટ ન થાય

    return { success: true };
  } catch (error: any) {
    console.error("Error updating payment settings:", error);
    return { success: false, error: error.message || "Failed to update settings." };
  }
}
