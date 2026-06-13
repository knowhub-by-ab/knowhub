import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db, subscribeAuth } from "./auth";
import { getState, replaceAll, subscribeStore } from "./store";
import type { AppData } from "./types";

// Cloud sync (spec 02/18). When the user is signed in (Firebase), the local-first
// AppData is mirrored to Firestore at users/{uid}, so data follows the account
// across devices and the Android app. In local mode (no auth / signed out) the
// app uses localStorage only.
//
// NOTE: the GitHub connection (github.token etc.) is intentionally NOT synced —
// OAuth tokens are device-scoped and shouldn't be stored in Firestore. It stays
// in localStorage on each device, and remote updates never overwrite it.

let stopWriter: () => void = () => {};
let stopSnapshot: () => void = () => {};
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let applyingRemote = false;

/** The portion of state we mirror to the cloud (everything except github). */
function syncedPart(): Omit<AppData, "github"> {
  const { github: _omit, ...rest } = getState();
  void _omit;
  return rest;
}

/** Apply remote data while preserving this device's local GitHub connection. */
function applyRemote(remote: Partial<AppData>) {
  applyingRemote = true;
  replaceAll({ ...remote, github: getState().github });
  applyingRemote = false;
}

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

    try {
      const snap = await getDoc(ref);
      const remote = snap.exists() ? (snap.data().data as AppData | undefined) : undefined;
      if (remote) {
        applyRemote(remote);
      } else {
        await setDoc(ref, { data: syncedPart(), updatedAt: Date.now() });
      }
    } catch {
      // offline / rules issue — keep working locally; writer retries on change.
    }

    // Write local changes up (debounced), excluding the GitHub connection.
    stopWriter = subscribeStore(() => {
      if (applyingRemote) return;
      if (writeTimer) clearTimeout(writeTimer);
      writeTimer = setTimeout(() => {
        setDoc(ref, { data: syncedPart(), updatedAt: Date.now() }).catch(() => {});
      }, 800);
    });

    // Receive changes from other devices.
    stopSnapshot = onSnapshot(ref, (s) => {
      if (s.metadata.hasPendingWrites) return; // ignore our own writes
      const remote = s.data()?.data as AppData | undefined;
      if (!remote) return;
      // Compare against synced part only (github is local-only).
      if (JSON.stringify(remote) === JSON.stringify(syncedPart())) return;
      applyRemote(remote);
    });
  });
}
