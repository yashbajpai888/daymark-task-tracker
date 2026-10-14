import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "your-firebase-api-key" &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== "your-project-id"
);

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

if (typeof window !== "undefined" || isFirebaseConfigured) {
  try {
    if (!getApps().length) {
      if (isFirebaseConfigured) {
        app = initializeApp(firebaseConfig);
      }
    } else {
      app = getApp();
    }

    if (app) {
      auth = getAuth(app);
      db = getFirestore(app);
    }
  } catch (err) {
    console.error("Failed to initialize Firebase client SDK:", err);
  }
}

export function canAccessFirestore(uid?: string): boolean {
  if (!isFirebaseConfigured || !db || !uid || uid === "local_user") {
    return false;
  }
  if (!auth || !auth.currentUser || auth.currentUser.uid !== uid) {
    return false;
  }
  return true;
}

/**
 * Removes undefined fields from objects before saving to Firestore,
 * preventing 'Unsupported field value: undefined' errors.
 */
export function removeUndefinedFields<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        !(value instanceof Date) &&
        typeof (value as any)?.toMillis !== "function"
      ) {
        cleaned[key] = removeUndefinedFields(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned as Partial<T>;
}

export { app, auth, db };

