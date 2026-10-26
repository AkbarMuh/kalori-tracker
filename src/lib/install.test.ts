import { describe, expect, it } from 'vitest';
import { detectInstallContext } from './install';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP_MODE =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1';
const IPHONE_INSTAGRAM =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 401.0.0.0 (iPhone16,2; iOS 26_1)';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 15; 23127PN0CG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';

const env = (ua: string, extra: Partial<{ standalone: boolean; maxTouchPoints: number }> = {}) => ({
  ua,
  standalone: false,
  maxTouchPoints: 0,
  ...extra,
});

describe('detectInstallContext', () => {
  it('recognises iPhone and iPad Safari (iPad reports a Mac UA)', () => {
    expect(detectInstallContext(env(IPHONE_SAFARI, { maxTouchPoints: 5 }))).toEqual({ kind: 'ios-safari', ipad: false });
    expect(detectInstallContext(env(IPAD_DESKTOP_MODE, { maxTouchPoints: 5 }))).toEqual({ kind: 'ios-safari', ipad: true });
  });

  it('treats a real Mac (no touch) as other', () => {
    expect(detectInstallContext(env(IPAD_DESKTOP_MODE))).toEqual({ kind: 'other' });
  });

  it('names other iOS browsers and in-app browsers', () => {
    expect(detectInstallContext(env(IPHONE_CHROME))).toEqual({ kind: 'ios-browser', ipad: false, browser: 'Chrome' });
    expect(detectInstallContext(env(IPHONE_INSTAGRAM))).toEqual({ kind: 'in-app', app: 'Instagram' });
  });

  it('reports installed apps and leaves Android to the native prompt', () => {
    expect(detectInstallContext(env(IPHONE_SAFARI, { standalone: true }))).toEqual({ kind: 'installed' });
    expect(detectInstallContext(env(ANDROID_CHROME))).toEqual({ kind: 'other' });
  });
});
