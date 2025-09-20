// actions.ts (server-side) - COMPLETE

"use server";

import admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";
import type {
  Tournament,
  UserProfile,
  TournamentFormData,
  Notification,
  PlayerResult,
  AppConfig,
  UTRFollowUpInput,
} from "./lib/types";
import { utrFollowUp } from "@/ai/flows/utr-follow-up";

const adminInitialized = (() => {
  // આપની lib/firebase/server માં જો initialize કરો છો તો તે વધુ સારી રીત છે.
  // અહીં defensive ચેક છે — જો admin પહેલેથી initialize ન હોય તો તમે સાચું સેટિંગ ન આપ્યું હશે.
  try {
    if (!admin.apps || admin.apps.length === 0) {
      // તેઓ પોતાના lib/firebase/server માં initialize કરીને export કરે છે તો અહીં કંઈ કરવા નહી.
      // જો પરસ特马્યુક નહિં પણ, અમે પ્રયત્નરૂપે initialize ન કરીએ કારણ કે serviceAccountJSONString અહિ ન હોય.
      // તેથી વિધવિ એક મેસેજ ટોસ કરવા માટે આપશો.
      // (આંકડાકીય રીતે, તમને lib/firebase/server માં initialization જોઈ લેવી.)
    }
  } catch (e) {
    // noop
  }
  return true;
})();

// utility to get firestore & storage, but check admin initialized
function getAdminServices() {
  if (!admin.apps || admin.apps.length === 0) {
    throw new Error(
      "Firebase Admin SDK not initialized. Ensure FIREBASE_SERVICE_ACCOUNT_KEY is set and lib/firebase/server initializes admin."
    );
  }
  const db = admin.firestore();
  const storage = admin.storage();
  return { db, storage };
}

/**
 * joinTournament
 */
export async function joinTournament(
  tournamentId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getAdminServices();

    // check existing entry
    const entriesRef = db.collection("entries");
    const q = entriesRef.where("userId", "==", userId).where("tournamentId", "==", tournamentId);
    const existingSnapshot = await q.get();
    if (!existingSnapshot.empty) {
      return { success: false, error: "You have already joined this tournament." };
    }

    const userDocRef = db.collection("users").doc(userId);
    const tournamentDocRef = db.collection("tournaments").doc(tournamentId);

    const [userDoc, tournamentDoc] = await Promise.all([userDocRef.get(), tournamentDocRef.get()]);

    if (!userDoc.exists) throw new Error("User not found.");
    if (!tournamentDoc.exists) throw new Error("Tournament not found.");

    const userProfile = userDoc.data() as UserProfile;
    const tournament = tournamentDoc.data() as Tournament;

    // transaction
    await db.runTransaction(async (tx) => {
      const freshUserDoc = await tx.get(userDocRef);
      const freshTournamentDoc = await tx.get(tournamentDocRef);

      if (!freshUserDoc.exists) throw new Error("User not found.");
      if (!freshTournamentDoc.exists) throw new Error("Tournament not found.");

      const freshUser = freshUserDoc.data() as UserProfile;
      const freshTournament = freshTournamentDoc.data() as Tournament;

      if ((freshUser.walletBalance || 0) < (freshTournament.entryFee || 0)) {
        throw new Error("Insufficient wallet balance.");
      }

      const newBalance = (freshUser.walletBalance || 0) - (freshTournament.entryFee || 0);
      tx.update(userDocRef, { walletBalance: newBalance });

      const entryRef = db.collection("entries").doc();
      tx.set(entryRef, {
        entryId: entryRef.id,
        tournamentId,
        userId,
        status: "confirmed",
        paidAmount: freshTournament.entryFee || 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const txnRef = db.collection("transactions").doc();
      tx.set(txnRef, {
        txnId: txnRef.id,
        userId,
        amount: freshTournament.entryFee || 0,
        type: "debit",
        status: "success",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        description: `Entry for ${freshTournament.title || ""}`,
      });
    });

    // notify admins
    const adminsSnap = await db.collection("users").where("role", "==", "admin").get();
    const title = "New Tournament Entry";
    const message = `${(userProfile && userProfile.name) || "A user"} has joined tournament: ${(tournament && tournament.title) || ""}`;

    const notifPromises = adminsSnap.docs.map((d) =>
      db.collection("notifications").add({
        userId: d.id,
        title,
        message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        isRead: false,
      })
    );
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
  try {
    if (amount <= 0 || !utr) return { success: false, error: "Invalid amount or UTR." };

    const { db } = getAdminServices();
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return { success: false, error: "User not found." };
    const userData = userDoc.data() as UserProfile;

    const reqRef = db.collection("wallet_requests").doc();
    await reqRef.set({
      requestId: reqRef.id,
      userId,
      userName: userData.name || "N/A",
      userEmail: userData.email || "N/A",
      amount,
      utr,
      status: "pending",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("submitWalletRequest error:", error);
    return { success: false, error: "Failed to submit wallet request." };
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
  try {
    if (amount <= 0 || !upiId) return { success: false, error: "Invalid amount or UPI." };

    const { db } = getAdminServices();
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return { success: false, error: "User not found." };
    const userData = userDoc.data() as UserProfile;

    if ((userData.walletBalance || 0) < amount) return { success: false, error: "Insufficient wallet balance." };

    const reqRef = db.collection("withdrawal_requests").doc();
    await reqRef.set({
      requestId: reqRef.id,
      userId,
      userName: userData.name || "N/A",
      userEmail: userData.email || "N/A",
      amount,
      upiId,
      status: "pending",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("submitWithdrawalRequest error:", error);
    return { success: false, error: "Failed to submit withdrawal request." };
  }
}

/**
 * getUtrFollowUpMessage - wrapper for AI flow
 */
export async function getUtrFollowUpMessage(input: UTRFollowUpInput): Promise<string | null> {
  try {
    const res = await utrFollowUp(input);
    return res.followUpMessage;
  } catch (err) {
    console.error("getUtrFollowUpMessage error:", err);
    return "We've noticed your payment request is still pending. Please contact support.";
  }
}

/**
 * createOrUpdateTournament
 * - Accepts FormData (imageFile optional) from Next.js server action
 * - If status != 'draft', date+time required
 */
export async function createOrUpdateTournament(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { db, storage } = getAdminServices();

    const tournamentDataString = formData.get("tournamentData") as string | null;
    if (!tournamentDataString) {
      throw new Error("Tournament data missing.");
    }
    const tournamentData: TournamentFormData = JSON.parse(tournamentDataString);

    // imageFile may come from the admin panel (File)
    const file = formData.get("imageFile") as File | null;
    let imageUrl = (tournamentData.imageUrl || "").trim();

    // If tournament is not draft, ensure date/time present
    if (String(tournamentData.status || "").toLowerCase() !== "draft") {
      if (!tournamentData.date || !tournamentData.time) {
        throw new Error("Date and time are required for non-draft tournaments.");
      }
    }

    // Upload image if provided
    if (file && storage && typeof (file as any).arrayBuffer === "function") {
      // create unique filename
      const fileName = `${uuidv4()}-${(file as any).name || "upload"}`;
      const bucket = storage.bucket();
      const destPath = `tournaments/${fileName}`;
      const fileRef = bucket.file(destPath);

      const buffer = Buffer.from(await (file as any).arrayBuffer());
      await fileRef.save(buffer, {
        metadata: {
          contentType: (file as any).type || "application/octet-stream",
        },
      });

      // Make signed url (long expiry)
      try {
        const [signedUrl] = await fileRef.getSignedUrl({ action: "read", expires: "03-09-2491" });
        imageUrl = signedUrl;
      } catch (err) {
        console.warn("Could not create signed URL, using gs:// path instead", err);
        imageUrl = `gs://${bucket.name}/${destPath}`;
      }
    }

    // If no imageUrl set, and creating new, set a sensible default path (frontend can fallback)
    if (!imageUrl) {
      if (!tournamentData.id) {
        imageUrl = tournamentData.isMega ? "/tournament/MegaTournaments.jpg" : "/tournament/RegularTournaments.jpg";
      } else {
        // keep empty string (null) for existing tournaments
        imageUrl = tournamentData.imageUrl || "";
      }
    }

    // Prepare date field
    let firestoreDate: admin.firestore.Timestamp | null = null;
    if (tournamentData.date && tournamentData.time) {
      const dt = new Date(`${tournamentData.date}T${tournamentData.time}`);
      if (isNaN(dt.getTime())) {
        throw new Error("Invalid date/time provided.");
      }
      firestoreDate = admin.firestore.Timestamp.fromDate(dt);
    } else {
      // if draft or no date provided, keep null
      firestoreDate = null;
    }

    const finalData: Omit<Tournament, "id"> = {
      title: tournamentData.title || "",
      gameType: tournamentData.gameType || "Solo",
      date: firestoreDate, // may be null (handle on frontend)
      time: tournamentData.time || "",
      entryFee: tournamentData.entryFee || 0,
      slots: tournamentData.slots || 100,
      prize: tournamentData.prize || 0,
      rules: Array.isArray(tournamentData.rules)
        ? tournamentData.rules
        : String(tournamentData.rules || "").split("\n").filter((r) => r.trim() !== ""),
      status: tournamentData.status || "draft",
      isMega: !!tournamentData.isMega,
      imageUrl: imageUrl,
      roomId: tournamentData.roomId || "",
      roomPassword: tournamentData.roomPassword || "",
      winnerPrizes: tournamentData.winnerPrizes || [],
    };

    if (tournamentData.id) {
      await db.collection("tournaments").doc(tournamentData.id).set(finalData, { merge: true });
    } else {
      await db.collection("tournaments").add(finalData);
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
    const { db } = getAdminServices();
    await db.collection("tournaments").doc(tournamentId).delete();
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
  try {
    if (amount <= 0) return { success: false, error: "Amount must be positive." };
    const { db } = getAdminServices();

    await db.runTransaction(async (tx) => {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await tx.get(userRef);
      if (!userDoc.exists) throw new Error("User not found.");

      const userProfile = userDoc.data() as UserProfile;
      let newBal = userProfile.walletBalance || 0;
      if (type === "credit") newBal += amount;
      else {
        if (newBal < amount) throw new Error("Insufficient funds for debit.");
        newBal -= amount;
      }
      tx.update(userRef, { walletBalance: newBal });

      const txnRef = db.collection("transactions").doc();
      tx.set(txnRef, {
        txnId: txnRef.id,
        userId,
        amount,
        type,
        status: "success",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        description: `Admin ${type}`,
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("updateWalletBalance error:", error);
    return { success: false, error: error?.message || "Failed to update wallet balance." };
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
  try {
    if (!title || !message) return { success: false, error: "Title and message required." };
    const { db } = getAdminServices();
    await db.collection("notifications").add({
      userId: targetUserId,
      title,
      message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
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
export async function deleteUserNotification(notificationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getAdminServices();
    const notifRef = db.collection("notifications").doc(notificationId);
    const notifDoc = await notifRef.get();
    if (!notifDoc.exists) return { success: false, error: "Notification not found." };

    const notification = notifDoc.data() as Notification;
    if (notification.userId !== userId && notification.userId !== "all") {
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists || (userDoc.data() as UserProfile).role !== "admin") {
        return { success: false, error: "You do not have permission to delete this notification." };
      }
    }

    if (notification.userId === "all") {
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists || (userDoc.data() as UserProfile).role !== "admin") {
        return { success: false, error: "Cannot delete global announcement." };
      }
    }

    await notifRef.delete();
    return { success: true };
  } catch (error: any) {
    console.error("deleteUserNotification error:", error);
    return { success: false, error: "Failed to delete notification." };
  }
}

/**
 * updateUserProfileName
 */
export async function updateUserProfileName(userId: string, newName: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newName || newName.trim().length === 0) return { success: false, error: "Name cannot be empty." };
    const { db } = getAdminServices();
    await db.collection("users").doc(userId).update({ name: newName.trim() });
    return { success: true };
  } catch (error: any) {
    console.error("updateUserProfileName error:", error);
    return { success: false, error: "Failed to update user name." };
  }
}

/**
 * deleteUserNotifications (batch)
 */
export async function deleteUserNotifications(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getAdminServices();
    const q = db.collection("notifications").where("userId", "==", userId);
    const snap = await q.get();
    if (snap.empty) return { success: true };
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
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
  try {
    if (!tournamentId || !results || results.length === 0) return { success: false, error: "Missing tournament or results." };
    const { db } = getAdminServices();

    const batch = db.batch();
    const resRef = db.collection("results").doc(tournamentId);

    const sorted = results.sort((a, b) => b.points - a.points).map((r, i) => ({ ...r, rank: i + 1 }));

    batch.set(resRef, {
      tournamentId,
      tournamentTitle,
      isMega,
      results: sorted,
      declaredAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    for (const r of sorted) {
      const title = `Result Declared: ${tournamentTitle}`;
      let message = `Congratulations! You got rank #${r.rank} with ${r.points} points.`;
      if (r.prize && r.prize > 0) {
        message += ` You've won ₹${r.prize}!`;
        const userRef = db.collection("users").doc(r.userId);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
          const user = userDoc.data() as UserProfile;
          const newBal = (user.walletBalance || 0) + (r.prize || 0);
          batch.update(userRef, { walletBalance: newBal });

          const txnRef = db.collection("transactions").doc();
          batch.set(txnRef, {
            txnId: txnRef.id,
            userId: r.userId,
            amount: r.prize,
            type: "credit",
            status: "success",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            description: `Prize for ${tournamentTitle}`,
          });
        }
      }

      const notifRef = db.collection("notifications").doc();
      batch.set(notifRef, {
        userId: r.userId,
        title,
        message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
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
    const { db } = getAdminServices();
    const requestRef = db.collection("wallet_requests").doc(requestId);
    if (newStatus === "approved") {
      await db.runTransaction(async (tx) => {
        const userRef = db.collection("users").doc(userId);
        const userDoc = await tx.get(userRef);
        if (!userDoc.exists) throw new Error("User not found.");
        const user = userDoc.data() as UserProfile;
        const newBal = (user.walletBalance || 0) + amount;
        tx.update(userRef, { walletBalance: newBal });

        const txnRef = db.collection("transactions").doc();
        tx.set(txnRef, {
          txnId: txnRef.id,
          userId,
          amount,
          type: "credit",
          status: "success",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          description: "Wallet deposit approved",
        });

        tx.update(requestRef, { status: newStatus });
      });
      await sendNotification(userId, "Deposit Approved", `Your deposit of ₹${amount} has been approved.`);
    } else {
      await requestRef.update({ status: newStatus });
      await sendNotification(userId, "Deposit Reject
