
import admin from "firebase-admin";

const firebaseConfig = {
  apiKey: "AIzaSyB6XufbP1uWMzbyOMAiGws4s-_Ed8RwLTI",
  authDomain: "arena-ace-2.firebaseapp.com",
  projectId: "arena-ace-2",
  storageBucket: "arena-ace-2.appspot.com",
  messagingSenderId: "724343463324",
  appId: "1:724343463324:web:6cd4d755ea96d9f65b3c59"
};

// A flag to determine if the admin SDK can be initialized, which is false in this environment.
const canInitializeAdmin = false;

let adminApp: admin.app.App;

if (!admin.apps.length) {
    try {
        // Attempt to initialize with service account, which will fail gracefully in this env.
         adminApp = admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            storageBucket: firebaseConfig.storageBucket,
        });
    } catch (e) {
        // Initialize a dummy app if credentials are not available.
        adminApp = admin.initializeApp({
            storageBucket: firebaseConfig.storageBucket,
        });
        console.warn("Firebase Admin SDK credentials not found. Some admin features might not work.");
    }
} else {
    adminApp = admin.app();
}

const adminAuth = admin.auth(adminApp);
const adminStorage = admin.storage(adminApp);


export { adminApp, adminAuth, adminStorage, canInitializeAdmin };
