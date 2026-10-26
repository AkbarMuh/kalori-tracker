import { describe, expect, it } from 'vitest';
import { DELETE_THRESHOLD, clampRowDrag, classifySwipe } from './gesture';

describe('classifySwipe', () => {
  it('detects quick horizontal flicks', () => {
    expect(classifySwipe(-120, 10, 200)).toBe('left');
    expect(classifySwipe(90, -20, 300)).toBe('right');
  });

  it('ignores short, slow, or mostly vertical movement', () => {
    expect(classifySwipe(-30, 0, 100)).toBeNull();
    expect(classifySwipe(-200, 0, 1200)).toBeNull();
    expect(classifySwipe(80, 70, 200)).toBeNull();
  });
});

describe('clampRowDrag', () => {
  it('only allows dragging left, up to a limit', () => {
    expect(clampRowDrag(40)).toBe(0);
    expect(clampRowDrag(-60)).toBe(-60);
    expect(clampRowDrag(-400)).toBe(-140);
    expect(clampRowDrag(-400)).toBeLessThan(DELETE_THRESHOLD);
  });
});
