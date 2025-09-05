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
    adminApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: firebaseConfig.storageBucket,
    });
} else {
    adminApp = admin.app();
}

const adminAuth = adminApp.auth();
const adminDb = adminApp.firestore();
const adminStorage = adminApp.storage();

export { adminApp, adminAuth, adminDb, adminStorage };
