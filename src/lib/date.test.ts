import { describe, expect, it } from 'vitest';
import { addDays, defaultMealForTime, fromDateKey, lastNDays, toDateKey } from './date';

describe('date helpers', () => {
  it('uses local time, not UTC, for the date key', () => {
    // 23:30 local on Jan 5 must stay Jan 5 regardless of time zone offset.
    expect(toDateKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05');
  });

  it('round-trips keys', () => {
    expect(toDateKey(fromDateKey('2026-02-28'))).toBe('2026-02-28');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('lists the last n days oldest first, ending at the given day', () => {
    expect(lastNDays('2026-03-02', 3)).toEqual(['2026-02-28', '2026-03-01', '2026-03-02']);
  });

  it('guesses the meal from the hour', () => {
    expect(defaultMealForTime(new Date(2026, 0, 1, 7))).toBe('sarapan');
    expect(defaultMealForTime(new Date(2026, 0, 1, 12))).toBe('siang');
    expect(defaultMealForTime(new Date(2026, 0, 1, 16))).toBe('camilan');
    expect(defaultMealForTime(new Date(2026, 0, 1, 20))).toBe('malam');
  });
});
