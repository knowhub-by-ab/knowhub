import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db, subscribeAuth } from "./auth";
import { getUpdatedAt, lightSnapshot, applyLightRemoteState, subscribeStore } from "./store";
import type { AppData } from "./types";

// Cloud sync — Firestore stores ONLY light metadata (nodes, aiKeys, github).
// Heavy content (pages, notesList, resources, quizzes) lives in the GitHub
// repo as the source of truth and is never written to Firestore.
//
// Conflict strategy: last-write-wins by a per-change timestamp (updatedAt).
// A remote snapshot is applied only if it's newer than this device's state, so
// a freshly-made local change is never clobbered by a stale remote copy.

type LightData = ReturnType<typeof lightSnapshot>;

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

export function initSync(): void {
  subscribeAuth(async (user) => {
    clearWatchers();
    if (!user || !db) return;

    const ref = doc(db, "users", user.uid);

    const writeUp = () =>
      setDoc(ref, { data: lightSnapshot(), updatedAt: getUpdatedAt() }).catch(() => {});

    const applyIfNewer = (remote: LightData | AppData | undefined, remoteAt: number) => {
      if (!remote) return false;
      if (remoteAt > getUpdatedAt()) {
        applyingRemote = true;
        // Only apply light fields; ignore any heavy content that may be in
        // old Firestore docs (migration safety).
        applyLightRemoteState(
          {
            nodes: (remote as AppData).nodes,
            aiKeys: (remote as AppData).aiKeys,
            github: (remote as AppData).github,
          },
          remoteAt
        );
        applyingRemote = false;
        return true;
      }
      return false;
    };

    // 1. Initial reconcile: newer side wins; seed remote if missing.
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const d = snap.data() as { data?: LightData | AppData; updatedAt?: number };
        if (!applyIfNewer(d.data, d.updatedAt ?? 0)) {
          // Local is newer (or equal) — push light data up.
          await writeUp();
        }
      } else {
        await writeUp();
      }
    } catch {
      // offline / rules — keep working locally; writer retries on change.
    }

    // 2. Push local changes up (debounced).
    stopWriter = subscribeStore(() => {
      if (applyingRemote) return;
      if (writeTimer) clearTimeout(writeTimer);
      writeTimer = setTimeout(writeUp, 800);
    });

    // 3. Receive newer changes from other devices.
    stopSnapshot = onSnapshot(ref, (snap) => {
      if (snap.metadata.hasPendingWrites) return; // ignore our own writes
      const d = snap.data() as { data?: LightData | AppData; updatedAt?: number } | undefined;
      if (d) applyIfNewer(d.data, d.updatedAt ?? 0);
    });
  });
}
