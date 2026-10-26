import { exportAll, mergeIntoLocal, onLocalChange } from '../db/repo';
import { isConflict, readRemote, writeRemote, type GitHubConfig } from './github';
import { mergeData, sameData } from './merge';

const CONFIG_KEY = 'kalori.github';
const LAST_SYNC_KEY = 'kalori.lastSync';
const DEBOUNCE_MS = 3000;
const MAX_ATTEMPTS = 3;

export type SyncState =
  | { status: 'off' }
  | { status: 'idle'; lastSync: string | null }
  | { status: 'syncing'; lastSync: string | null }
  | { status: 'error'; lastSync: string | null; message: string }
  | { status: 'offline'; lastSync: string | null };

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode); sync config just won't persist
  }
}

export function loadConfig(): GitHubConfig | null {
  const raw = safeGet(CONFIG_KEY);
  if (!raw) return null;
  try {
    const cfg = JSON.parse(raw) as GitHubConfig;
    return cfg.token && cfg.owner && cfg.repo && cfg.path ? cfg : null;
  } catch {
    return null;
  }
}

let state: SyncState = initialState();
const listeners = new Set<() => void>();

function initialState(): SyncState {
  return loadConfig() ? { status: 'idle', lastSync: safeGet(LAST_SYNC_KEY) } : { status: 'off' };
}

function setState(next: SyncState) {
  state = next;
  for (const fn of listeners) fn();
}

export const syncStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getSnapshot: () => state,
};

export function saveConfig(cfg: GitHubConfig | null) {
  safeSet(CONFIG_KEY, cfg ? JSON.stringify(cfg) : null);
  if (!cfg) safeSet(LAST_SYNC_KEY, null);
  setState(initialState());
}

let running: Promise<void> | null = null;
let rerun = false;

/** Pull, merge, write locally, and push if anything changed. Concurrent calls coalesce. */
export function syncNow(): Promise<void> {
  if (running) {
    rerun = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        rerun = false;
        await syncOnce();
      } while (rerun);
    } finally {
      running = null;
    }
  })();
  return running;
}

async function syncOnce() {
  const cfg = loadConfig();
  if (!cfg) return setState({ status: 'off' });
  const lastSync = safeGet(LAST_SYNC_KEY);
  if (!navigator.onLine) return setState({ status: 'offline', lastSync });

  setState({ status: 'syncing', lastSync });
  try {
    for (let attempt = 1; ; attempt++) {
      const remote = await readRemote(cfg);
      const local = await exportAll();
      const merged = remote ? mergeData(local, remote.data) : local;

      if (!sameData(merged, local)) await mergeIntoLocal(merged);
      if (remote && sameData(merged, remote.data)) break;

      try {
        await writeRemote(cfg, merged, remote?.sha ?? null);
        break;
      } catch (e) {
        // Another device pushed in between; re-read and merge again.
        if (isConflict(e) && attempt < MAX_ATTEMPTS) continue;
        throw e;
      }
    }
    const ts = new Date().toISOString();
    safeSet(LAST_SYNC_KEY, ts);
    setState({ status: 'idle', lastSync: ts });
  } catch (e) {
    setState({ status: 'error', lastSync, message: e instanceof Error ? e.message : String(e) });
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;

function scheduleSync() {
  if (!loadConfig()) return;
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), DEBOUNCE_MS);
}

/** Wire up automatic sync: on start, after local changes, and when coming back online. */
export function startAutoSync() {
  onLocalChange(scheduleSync);
  window.addEventListener('online', () => void syncNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleSync();
  });
  if (loadConfig()) void syncNow();
}
