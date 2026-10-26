/** Short vibration on devices that support it (Android); silently ignored elsewhere. */
export function haptic(pattern: number | number[] = 10) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // not supported
  }
}
