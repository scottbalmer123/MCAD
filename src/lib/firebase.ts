import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

type FirebaseWebConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

function readInjectedFirebaseConfig(): FirebaseWebConfig {
  const rawConfig = import.meta.env.FIREBASE_WEBAPP_CONFIG as string | undefined;

  if (!rawConfig) {
    return {};
  }

  try {
    return JSON.parse(rawConfig) as FirebaseWebConfig;
  } catch {
    return {};
  }
}

const injectedConfig = readInjectedFirebaseConfig();

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || injectedConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || injectedConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || injectedConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || injectedConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || injectedConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || injectedConfig.appId
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

let authInstance: ReturnType<typeof getAuth> | null = null;
let dbInstance: ReturnType<typeof getFirestore> | null = null;

if (isFirebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
}

export const auth = authInstance;
export const db = dbInstance;
