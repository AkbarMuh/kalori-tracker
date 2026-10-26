import { describe, expect, it } from 'vitest';
import { mascotMessage, moodFor, pickPokeLine } from './mascot';

describe('moodFor', () => {
  it.each([
    [0, 2000, 'sleepy'],
    [500, 2000, 'hungry'],
    [1199, 2000, 'hungry'],
    [1200, 2000, 'happy'],
    [1899, 2000, 'happy'],
    [1900, 2000, 'proud'],
    [2100, 2000, 'proud'],
    [2101, 2000, 'stuffed'],
    [300, 0, 'happy'],
  ] as const)('total %i of %i is %s', (total, target, mood) => {
    expect(moodFor(total, target)).toBe(mood);
  });
});

describe('mascotMessage', () => {
  it('mentions the remaining calories', () => {
    expect(mascotMessage('hungry', 500, 2000)).toContain('1.500 kkal');
  });

  it('mentions how far over target', () => {
    expect(mascotMessage('stuffed', 2600, 2000)).toContain('lebih 600 kkal');
  });
});

describe('pickPokeLine', () => {
  it('can pick mood-specific lines', () => {
    expect(pickPokeLine('sleepy', 0)).toBe('Hoaam… lima menit lagi…');
  });

  it('never repeats the previous line back to back', () => {
    for (let r = 0; r < 1; r += 0.05) {
      const first = pickPokeLine('happy', r);
      expect(pickPokeLine('happy', r, first)).not.toBe(first);
    }
  });

  it('stays in range for rand close to 1', () => {
    expect(typeof pickPokeLine('proud', 0.9999)).toBe('string');
  });
});
