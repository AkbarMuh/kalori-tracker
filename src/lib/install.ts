/** Where the app is running, for "add to Home Screen" guidance. */
export type InstallContext =
  | { kind: 'installed' }
  | { kind: 'ios-safari'; ipad: boolean }
  | { kind: 'ios-browser'; ipad: boolean; browser: string }
  | { kind: 'in-app'; app: string }
  | { kind: 'other' };

interface Env {
  ua: string;
  standalone: boolean;
  maxTouchPoints: number;
}

/** In-app browsers can't add to the Home Screen; the page must be opened in a real browser first. */
const IN_APP: [RegExp, string][] = [
  [/Instagram/i, 'Instagram'],
  [/FBAN|FBAV|FB_IAB/i, 'Facebook'],
  [/\bLine\//i, 'LINE'],
  [/TikTok|musical_ly|BytedanceWebview/i, 'TikTok'],
  [/LinkedInApp/i, 'LinkedIn'],
  [/Snapchat/i, 'Snapchat'],
  [/\bGSA\//, 'Google'],
];

const IOS_BROWSERS: Record<string, string> = { CriOS: 'Chrome', FxiOS: 'Firefox', EdgiOS: 'Edge', OPiOS: 'Opera' };

export function detectInstallContext({ ua, standalone, maxTouchPoints }: Env): InstallContext {
  if (standalone) return { kind: 'installed' };
  for (const [re, app] of IN_APP) if (re.test(ua)) return { kind: 'in-app', app };
  // iPadOS Safari reports a Mac user agent; touch support gives it away.
  const ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  if (ipad || /iPhone|iPod/.test(ua)) {
    const browser = ua.match(/CriOS|FxiOS|EdgiOS|OPiOS/)?.[0];
    return browser ? { kind: 'ios-browser', ipad, browser: IOS_BROWSERS[browser]! } : { kind: 'ios-safari', ipad };
  }
  return { kind: 'other' };
}

export function currentInstallContext(): InstallContext {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return detectInstallContext({ ua: navigator.userAgent, standalone, maxTouchPoints: navigator.maxTouchPoints ?? 0 });
}

// --- Chromium's install prompt (Android, desktop) ---

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

/** Call once at startup: keeps the browser's install prompt so the app can offer its own button. */
export function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

export const installPromptStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  /** Non-null when the browser can show its native install dialog. */
  getSnapshot: () => deferred,
};

export async function promptInstall(): Promise<boolean> {
  const e = deferred;
  if (!e) return false;
  deferred = null;
  emit();
  await e.prompt();
  return (await e.userChoice).outcome === 'accepted';
}
