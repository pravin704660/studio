
import admin from "firebase-admin";
import { config } from 'dotenv';

config(); // This loads variables from .env file

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
      console.error("Firebase Admin SDK Error: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.");
      // In a server environment, you might want to throw an error to prevent the app from starting without proper config.
      // For this interactive environment, we'll log the error and proceed, which might lead to runtime errors if admin features are used.
      return null;
    }
    const serviceAccount = JSON.parse(serviceAccountString);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "arena-ace-2.appspot.com",
    });
  } catch (error: any) {
    console.error("Firebase Admin SDK initialization error:", error.message);
    // As above, preventing a hard crash but logging the critical configuration error.
    return null;
  }
}

const adminApp = initializeFirebaseAdmin();
let adminAuth: admin.auth.Auth;
let adminStorage: admin.storage.Storage;

if (adminApp) {
    adminAuth = admin.auth();
    adminStorage = admin.storage();
} else {
    // Provide dummy objects or handle the uninitialized case
    // to prevent crashes on import if the app couldn't initialize.
    console.warn("Firebase Admin SDK not initialized. Admin features will not be available.");
    // Assigning mock/dummy objects to prevent crashes on destructuring imports.
    adminAuth = {} as admin.auth.Auth;
    adminStorage = {} as admin.storage.Storage;
}


export { adminApp, adminAuth, adminStorage };
