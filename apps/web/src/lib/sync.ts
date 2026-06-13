import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db, subscribeAuth } from "./auth";
import { getState, replaceAll, subscribeStore } from "./store";
import type { AppData } from "./types";

// Cloud sync (spec 02/18). When the user is signed in (Firebase), the whole
// local-first AppData is mirrored to Firestore at users/{uid}, so keys and all
// learning data follow the account across devices and the Android app. In local
// mode (no auth configured / signed out) the app uses localStorage only.

let stopWriter: () => void = () => {};
let stopSnapshot: () => void = () => {};
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let applyingRemote = false;

function clearWatchers() {
  stopWriter();
  stopSnapshot();
  stopWriter = () => {};
  stopSnapshot = () => {};
  if (writeTimer) clearTimeout(writeTimer);
}

/** Call once at app startup. No-op in local mode. */
export function initSync(): void {
  subscribeAuth(async (user) => {
    clearWatchers();
    if (!user || !db) return;

    const ref = doc(db, "users", user.uid);

    // 1. Initial load: remote wins if it exists; otherwise seed from local.
    try {
      const snap = await getDoc(ref);
      const remote = snap.exists() ? (snap.data().data as AppData | undefined) : undefined;
      if (remote) {
        applyingRemote = true;
        replaceAll(remote);
        applyingRemote = false;
      } else {
        await setDoc(ref, { data: getState(), updatedAt: Date.now() });
      }
    } catch {
      // offline / rules issue — keep working locally; writer will retry on change.
    }

    // 2. Write local changes up (debounced).
    stopWriter = subscribeStore(() => {
      if (applyingRemote) return;
      if (writeTimer) clearTimeout(writeTimer);
      writeTimer = setTimeout(() => {
        setDoc(ref, { data: getState(), updatedAt: Date.now() }).catch(() => {});
      }, 800);
    });

    // 3. Receive changes from other devices in real time.
    stopSnapshot = onSnapshot(ref, (snap) => {
      if (snap.metadata.hasPendingWrites) return; // ignore our own writes
      const remote = snap.data()?.data as AppData | undefined;
      if (!remote) return;
      if (JSON.stringify(remote) === JSON.stringify(getState())) return;
      applyingRemote = true;
      replaceAll(remote);
      applyingRemote = false;
    });
  });
}
