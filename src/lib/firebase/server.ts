
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
const hasServiceAccount = process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY;

let adminApp: admin.app.App;

if (!admin.apps.length) {
    if (hasServiceAccount) {
        const serviceAccount = {
            project_id: firebaseConfig.projectId,
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            private_key: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        };

        adminApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: firebaseConfig.storageBucket,
        });
    } else {
        console.warn("Firebase Admin SDK not initialized with credentials. Using default initialization.");
        // Initialize without credentials. Some admin features might not work.
        adminApp = admin.initializeApp({
            storageBucket: firebaseConfig.storageBucket,
        });
    }
} else {
    adminApp = admin.app();
}

const adminAuth = adminApp.auth();
const adminDb = adminApp.firestore();
const adminStorage = adminApp.storage();

// A flag to check if admin SDK was initialized with full credentials
const canInitializeAdmin = hasServiceAccount;

export { adminApp, adminAuth, adminDb, adminStorage, canInitializeAdmin };
