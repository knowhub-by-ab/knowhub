import { useEffect, useState } from "react";
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
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

/** True when running inside the Capacitor Android/iOS WebView. */
function isNative(): boolean {
  return Boolean(
    (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
      ?.isNativePlatform?.()
  );
}

export async function signInWithGoogle(): Promise<void> {
  if (!auth) return;
  const provider = new GoogleAuthProvider();

  // In the native app, browser-based OAuth (popup/redirect) is blocked by Google
  // inside a WebView. Use the native Google account picker via the Capacitor
  // Firebase Authentication plugin, then sign the JS SDK in with the credential.
  if (isNative()) {
    const { FirebaseAuthentication } = await import(
      "@capacitor-firebase/authentication"
    );
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result.credential?.idToken;
    if (!idToken) throw new Error("No Google credential returned.");
    await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    return;
  }
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    // Fall back to redirect if the popup is blocked/unsupported.
    const code = (err as { code?: string })?.code ?? "";
    if (
      code.includes("popup-blocked") ||
      code.includes("popup-closed") ||
      code.includes("operation-not-supported") ||
      code.includes("cancelled-popup")
    ) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw err;
  }
}

/** Completes a redirect-based sign-in (call once at startup). Safe in all modes. */
export async function completeRedirectSignIn(): Promise<void> {
  if (!auth) return;
  try {
    await getRedirectResult(auth);
  } catch {
    /* ignore — onAuthStateChanged still reflects the result */
  }
}

export async function signOutUser(): Promise<void> {
  if (isNative()) {
    try {
      const { FirebaseAuthentication } = await import(
        "@capacitor-firebase/authentication"
      );
      await FirebaseAuthentication.signOut();
    } catch {
      /* ignore */
    }
  }
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
