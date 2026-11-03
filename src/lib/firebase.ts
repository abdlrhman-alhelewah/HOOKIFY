import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(
  app,
  { experimentalAutoDetectLongPolling: true },
  (firebaseConfig as any).firestoreDatabaseId || "ai-studio-4ee063b3-3e47-4d63-ad62-288c52910558"
);

export const googleProvider = new GoogleAuthProvider();
