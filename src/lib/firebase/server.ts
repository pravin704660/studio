
import admin from "firebase-admin";

const firebaseConfig = {
  apiKey: "AIzaSyB6XufbP1uWMzbyOMAiGws4s-_Ed8RwLTI",
  authDomain: "arena-ace-2.firebaseapp.com",
  projectId: "arena-ace-2",
  storageBucket: "arena-ace-2.appspot.com",
  messagingSenderId: "724343463324",
  appId: "1:724343463324:web:6cd4d755ea96d9f65b3c59"
};

let adminApp: admin.app.App;

if (!admin.apps.length) {
    try {
        // When running in a Google Cloud environment, the SDK automatically finds the credentials.
        // For local development, you would set the GOOGLE_APPLICATION_CREDENTIALS env var.
        adminApp = admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            storageBucket: firebaseConfig.storageBucket,
        });
    } catch (e) {
        console.error("Firebase Admin SDK initialization error:", e);
        // Fallback for environments without default credentials
        adminApp = admin.initializeApp({
            storageBucket: firebaseConfig.storageBucket,
        });
        console.warn("Firebase Admin SDK initialized without credentials. Storage and Auth operations might be restricted.");
    }
} else {
    adminApp = admin.app();
}

const adminAuth = adminApp.auth();
const adminStorage = adminApp.storage();

export { adminApp, adminAuth, adminStorage };
