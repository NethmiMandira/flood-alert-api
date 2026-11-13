import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

// Initialize Firebase Admin only when a request actually needs it,
// not when the module is loaded (for example during `next build`).
function getAdminApp() {
  const existing = getApps();
  if (existing.length) return existing[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase admin environment variables");
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      // Some hosts store the key with literal "\n", so convert them back
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

export const getAdminAuth = () => getAuth(getAdminApp());
export const getAdminDb = () => getFirestore(getAdminApp());
export const getAdminMessaging = () => getMessaging(getAdminApp());