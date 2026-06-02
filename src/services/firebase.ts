import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer, initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCVfLP71tkORtgT632w7R_i4UuGsyacivM",
  authDomain: "moneytracknew-fixed-9196-c6eea.firebaseapp.com",
  projectId: "moneytracknew-fixed-9196-c6eea",
  storageBucket: "moneytracknew-fixed-9196-c6eea.firebasestorage.app",
  messagingSenderId: "992616087106",
  appId: "1:992616087106:web:c0b454064adf1d6282b7db",
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, { localCache: persistentLocalCache() });
export const auth = getAuth(app);
export const storage = getStorage(app);
export async function testConnection() { try { await getDocFromServer(doc(db, "connection_test", "check")); return true; } catch { return false; } }
