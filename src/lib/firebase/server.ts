
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

const hasServiceAccount = process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PROJECT_ID;

let adminApp: admin.app.App;

if (!admin.apps.length) {
    if (hasServiceAccount) {
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        };
        adminApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: firebaseConfig.storageBucket,
        });
    } else {
        console.warn("Firebase Admin SDK credentials not found. Initializing with default config. Some admin features like file uploads might not work.");
        adminApp = admin.initializeApp({
            storageBucket: firebaseConfig.storageBucket,
        });
    }
} else {
    adminApp = admin.app();
}

const adminAuth = admin.auth(adminApp);
const adminStorage = admin.storage(adminApp);
const canInitializeAdmin = hasServiceAccount;

export { adminApp, adminAuth, adminStorage, canInitializeAdmin };
