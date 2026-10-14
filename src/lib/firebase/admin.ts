import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  // Replace escaped newlines with actual line breaks
  privateKey = privateKey.replace(/\\n/g, "\n");
}

export const isAdminConfigured = Boolean(
  projectId &&
  projectId !== "your-project-id" &&
  clientEmail &&
  clientEmail !== "firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com" &&
  privateKey &&
  !privateKey.includes("...")
);

let adminApp: App | undefined;
let adminAuth: Auth | undefined;
let adminDb: Firestore | undefined;

if (!getApps().length) {
  if (isAdminConfigured && projectId && clientEmail && privateKey) {
    try {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch (err) {
      console.error("Firebase Admin initialization error:", err);
    }
  }
} else {
  adminApp = getApps()[0];
}

if (adminApp) {
  adminAuth = getAuth(adminApp);
  adminDb = getFirestore(adminApp);
}

export { adminAuth, adminDb, adminApp };
