import { useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../lib/firebase";
import { UserProfile } from "../types/cad";

const demoProfile: UserProfile = {
  uid: "demo-session",
  email: "demo@meddispatch.local",
  displayName: "Demo Supervisor",
  role: "dispatcher",
  active: true,
  allowedUnitId: "MICA401"
};

function mapUserProfile(authUser: User, raw: Record<string, unknown>): UserProfile {
  return {
    uid: authUser.uid,
    email: authUser.email ?? "",
    displayName: String(raw.displayName ?? authUser.email ?? "CAD User"),
    role: String(raw.role ?? "dispatcher") as UserProfile["role"],
    active: Boolean(raw.active),
    allowedUnitId:
      raw.allowedUnitId === null || raw.allowedUnitId === undefined
        ? null
        : String(raw.allowedUnitId)
  };
}

export function useAuthSession() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(
    isFirebaseConfigured ? null : demoProfile
  );
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      setLoading(false);
      setProfile(demoProfile);
      return;
    }

    const firebaseAuth = auth as NonNullable<typeof auth>;
    const firestoreDb = db as NonNullable<typeof db>;
    let profileUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setAuthUser(nextUser);
      setError(null);

      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      profileUnsubscribe = onSnapshot(
        doc(firestoreDb, "users", nextUser.uid),
        (snapshot) => {
          if (!snapshot.exists()) {
            setProfile(null);
            setError(
              "This account signed in successfully, but no role profile exists in Firestore users/{uid}."
            );
            setLoading(false);
            return;
          }

          const nextProfile = mapUserProfile(
            nextUser,
            snapshot.data() as Record<string, unknown>
          );

          setProfile(nextProfile);
          if (!nextProfile.active) {
            setError("This account is marked inactive and cannot access the CAD system.");
          }
          setLoading(false);
        },
        (snapshotError) => {
          setProfile(null);
          setError(snapshotError.message);
          setLoading(false);
        }
      );
    });

    return () => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
      authUnsubscribe();
    };
  }, []);

  async function signInWithPassword(email: string, password: string) {
    if (!auth || !isFirebaseConfigured) {
      return;
    }

    setAuthenticating(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (signInError) {
      const nextMessage =
        signInError instanceof Error ? signInError.message : "Unable to sign in.";
      setError(nextMessage);
      throw signInError;
    } finally {
      setAuthenticating(false);
    }
  }

  async function signOutUser() {
    if (!auth || !isFirebaseConfigured) {
      setProfile(demoProfile);
      return;
    }

    await signOut(auth);
  }

  return {
    authUser,
    session: profile?.active ? profile : null,
    profile,
    loading,
    authenticating,
    error,
    mode: isFirebaseConfigured ? "firebase" : "demo",
    signInWithPassword,
    signOutUser
  };
}
