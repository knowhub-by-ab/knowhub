import { useEffect, useState } from "react";
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Firebase Google authentication (spec 10). Entirely optional: if the
// VITE_FIREBASE_* env vars are not set, KnowHub runs in local mode with no
// login (the app still works fully). When configured, /app is gated behind
// Google sign-in.

const env = import.meta.env as Record<string, string | undefined>;

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const isAuthConfigured = Boolean(
  config.apiKey && config.authDomain && config.projectId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
export let db: Firestore | null = null;
if (isAuthConfigured) {
  app = initializeApp(config as Required<typeof config>);
  auth = getAuth(app);
  db = getFirestore(app);
}

/** Non-hook auth subscription (for the sync layer). Calls back with null in local mode. */
export function subscribeAuth(cb: (user: User | null) => void): () => void {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export async function signInWithGoogle(): Promise<void> {
  if (!auth) return;
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOutUser(): Promise<void> {
  if (auth) await signOut(auth);
}

export interface AuthState {
  loading: boolean;
  user: User | null;
}

/** Subscribe to auth state. In local mode (unconfigured) resolves to no user. */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    loading: isAuthConfigured,
    user: null,
  });

  useEffect(() => {
    if (!auth) {
      setState({ loading: false, user: null });
      return;
    }
    return onAuthStateChanged(auth, (user) => setState({ loading: false, user }));
  }, []);

  return state;
}
