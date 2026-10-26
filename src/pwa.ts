import { registerSW } from 'virtual:pwa-register';
import { showToast } from './lib/toast';

const JUST_UPDATED_KEY = 'kalori.justUpdated';
/** Updates found this soon after launch are applied straight away, while the splash still shows. */
const STARTUP_WINDOW_MS = 8000;
const CHECK_EVERY_MS = 60 * 60 * 1000;

let registration: ServiceWorkerRegistration | undefined;

/** True once after a reload that applied an update (so the app can skip the splash and say so). */
export function consumeJustUpdated(): boolean {
  try {
    const updated = sessionStorage.getItem(JUST_UPDATED_KEY) === '1';
    sessionStorage.removeItem(JUST_UPDATED_KEY);
    return updated;
  } catch {
    return false;
  }
}

/**
 * The service worker waits instead of taking over a running page ("prompt" mode), so an open
 * session keeps its own cached files (no missing lazy chunks after a deploy). New versions are
 * applied right after launch, or on request via a toast later on.
 */
export function initPwaUpdates() {
  const startedAt = performance.now();
  let updateSW: (reload?: boolean) => Promise<void> = async () => {};

  const apply = () => {
    try {
      sessionStorage.setItem(JUST_UPDATED_KEY, '1');
    } catch {
      // storage unavailable: the update still applies, just without the notice
    }
    void updateSW(true);
  };

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (performance.now() - startedAt < STARTUP_WINDOW_MS) return apply();
      showToast(
        {
          icon: 'refresh',
          message: 'Versi baru Kalori sudah siap',
          actions: [{ label: 'Muat ulang', icon: 'refresh', onClick: apply }],
        },
        20000,
      );
    },
    onRegisteredSW(_url, reg) {
      registration = reg;
      if (!reg) return;
      const check = () => void reg.update().catch(() => {});
      setInterval(check, CHECK_EVERY_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });
}

/** Asks the server for a newer version; a found update then shows the reload toast. */
export async function checkForUpdate(): Promise<'found' | 'none' | 'unsupported'> {
  if (!registration) return 'unsupported';
  await registration.update();
  return registration.installing || registration.waiting ? 'found' : 'none';
}
