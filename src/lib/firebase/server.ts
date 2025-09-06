
import admin from "firebase-admin";
import { config } from 'dotenv';

config();

const firebaseConfig = {
  apiKey: "AIzaSyB6XufbP1uWMzbyOMAiGws4s-_Ed8RwLTI",
  authDomain: "arena-ace-2.firebaseapp.com",
  projectId: "arena-ace-2",
  storageBucket: "arena-ace-2.appspot.com",
  messagingSenderId: "724343463324",
  appId: "1:724343463324:web:6cd4d755ea96d9f65b3c59"
};

// Check if the required environment variables are set.
// If not, we cannot initialize the admin SDK.
const canInitializeAdmin = process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY;

let adminApp: admin.app.App;

if (!admin.apps.length) {
    if (canInitializeAdmin) {
        const serviceAccount = {
            project_id: firebaseConfig.projectId, // Using projectId from firebaseConfig
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            private_key: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        };

        adminApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: firebaseConfig.storageBucket,
        });
    } else {
        console.warn("Firebase Admin SDK not initialized. Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY.");
        // Create a dummy app to avoid crashing the server, but it won't be functional.
        adminApp = admin.initializeApp();
    }
} else {
    adminApp = admin.app();
}

const adminAuth = adminApp.auth();
const adminDb = adminApp.firestore();
const adminStorage = adminApp.storage();

export { adminApp, adminAuth, adminDb, adminStorage, canInitializeAdmin };
