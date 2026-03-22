export const firebaseProjectConfig = {
  apiKey: "AIzaSyDWWAKrlF7Yz8WuLrNTMPCi3OoH78UIdxI",
  authDomain: "mcad-fe4d0.firebaseapp.com",
  // Assumes the project's default Realtime Database instance name.
  databaseURL: "https://mcad-fe4d0-default-rtdb.firebaseio.com",
  projectId: "mcad-fe4d0",
  storageBucket: "mcad-fe4d0.firebasestorage.app",
  messagingSenderId: "985427513318",
  appId: "1:985427513318:web:7133b06604427267b39027"
};

export const firebaseRealtimeConfig = {
  // Set to false to force local demo mode.
  enabled: true,
  statePath: "macd/state",
  seedOnEmpty: true
};

export function isFirebaseConfigured() {
  return firebaseRealtimeConfig.enabled &&
    Object.values(firebaseProjectConfig).every((value) => typeof value === "string" && value.trim() !== "");
}
