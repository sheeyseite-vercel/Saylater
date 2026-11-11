import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseClientConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

function app(): FirebaseApp {
  if (!isFirebaseClientConfigured()) {
    throw new Error("Firebase is not configured. Set the NEXT_PUBLIC_FIREBASE_* variables.");
  }
  return getApps().length ? getApp() : initializeApp(config);
}

export const firebaseAuth = (): Auth => getAuth(app());
export const firebaseDb = (): Firestore => getFirestore(app());
export const firebaseStorage = (): FirebaseStorage => getStorage(app());
