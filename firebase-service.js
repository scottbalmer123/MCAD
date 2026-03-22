import {
  firebaseProjectConfig,
  firebaseRealtimeConfig,
  isFirebaseConfigured
} from "./firebase-config.js";

const FIREBASE_SYNC_LABEL = "Firebase live sync";
const FIREBASE_ERROR_LABEL = "Firebase unavailable";

let appInstance = null;
let databaseInstance = null;
let stateRef = null;
let unsubscribeState = null;
let firebaseSdk = null;

async function ensureFirebase() {
  if (!appInstance) {
    const [{ initializeApp }, databaseSdk] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js")
    ]);

    firebaseSdk = databaseSdk;
    appInstance = initializeApp(firebaseProjectConfig);
    databaseInstance = firebaseSdk.getDatabase(appInstance, firebaseProjectConfig.databaseURL);
  }
}

export function hasFirebaseStateSync() {
  return isFirebaseConfigured();
}

export async function startFirebaseStateSync({ getSeedState, onRemoteState, onStatusChange }) {
  if (!isFirebaseConfigured()) {
    onStatusChange?.({ mode: "local", label: "Demo sync" });
    return { mode: "local", label: "Demo sync" };
  }

  try {
    await ensureFirebase();
    stateRef = firebaseSdk.ref(databaseInstance, firebaseRealtimeConfig.statePath);

    const snapshot = await firebaseSdk.get(stateRef);
    if (!snapshot.exists() && firebaseRealtimeConfig.seedOnEmpty) {
      await firebaseSdk.set(stateRef, getSeedState());
    }

    if (unsubscribeState) {
      unsubscribeState();
    }

    unsubscribeState = firebaseSdk.onValue(
      stateRef,
      (incomingSnapshot) => {
        if (incomingSnapshot.exists()) {
          onRemoteState?.(incomingSnapshot.val());
        }
      },
      (error) => {
        onStatusChange?.({ mode: "firebase-error", label: FIREBASE_ERROR_LABEL, error });
      }
    );

    onStatusChange?.({ mode: "firebase", label: FIREBASE_SYNC_LABEL });
    return { mode: "firebase", label: FIREBASE_SYNC_LABEL };
  } catch (error) {
    onStatusChange?.({ mode: "firebase-error", label: FIREBASE_ERROR_LABEL, error });
    return { mode: "firebase-error", label: FIREBASE_ERROR_LABEL, error };
  }
}

export async function persistFirebaseState(nextState) {
  if (!isFirebaseConfigured()) {
    return false;
  }

  await ensureFirebase();
  if (!stateRef) {
    stateRef = firebaseSdk.ref(databaseInstance, firebaseRealtimeConfig.statePath);
  }

  await firebaseSdk.set(stateRef, nextState);
  return true;
}
