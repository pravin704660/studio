import { initializeApp, getApps, getApp, App } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import admin from "firebase-admin";

const firebaseConfig = {
  apiKey: "AIzaSyB6XufbP1uWMzbyOMAiGws4s-_Ed8RwLTI",
  authDomain: "arena-ace-2.firebaseapp.com",
  projectId: "arena-ace-2",
  storageBucket: "arena-ace-2.firebasestorage.app",
  messagingSenderId: "724343463324",
  appId: "1:724343463324:web:6cd4d755ea96d9f65b3c59"
};

// Initialize Firebase for the client
const app: App = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Initialize Firebase Admin SDK for the server
let adminApp: admin.app.App;

if (!admin.apps.length) {
    // To run locally, you need to download the service account key from
    // Firebase Console > Project Settings > Service accounts > Generate new private key
    // and set the GOOGLE_APPLICATION_CREDENTIALS environment variable.
    // In a deployed environment (like Cloud Run), this is handled automatically.
    adminApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: firebaseConfig.storageBucket,
    });
} else {
    adminApp = admin.app();
}

const adminStorage = adminApp.storage();

export { app, auth, db, storage, adminStorage };
