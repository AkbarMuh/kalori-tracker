export type SwipeDirection = 'left' | 'right';

/** A quick, mostly horizontal flick; vertical drags are left to page scrolling. */
export function classifySwipe(dx: number, dy: number, durationMs: number): SwipeDirection | null {
  if (durationMs > 800) return null;
  if (Math.abs(dx) < 50) return null;
  if (Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  return dx < 0 ? 'left' : 'right';
}

/** Swipe-to-delete: how far (px, negative) a row must be dragged before release deletes it. */
export const DELETE_THRESHOLD = -90;

export function clampRowDrag(dx: number): number {
  return Math.max(-140, Math.min(0, dx));
}
