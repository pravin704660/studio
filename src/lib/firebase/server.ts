
import admin from "firebase-admin";

// Prevent reinitialization of the app
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "arena-ace-2.appspot.com",
    });
  } catch (error: any) {
    console.error("Firebase Admin SDK initialization error:", error.message);
  }
}

const adminApp = admin.app();
const adminAuth = admin.auth();
const adminStorage = admin.storage();

export { adminApp, adminAuth, adminStorage };
