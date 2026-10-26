import { describe, expect, it } from 'vitest';
import type { FoodEntry } from '../db/schema';
import { recentDays, summarizeDay, summarizeWeek } from './summary';

let n = 0;
function entry(date: string, calories: number, extra: Partial<FoodEntry> = {}): FoodEntry {
  const ts = '2026-01-01T00:00:00.000Z';
  return {
    id: `e${n++}`,
    date,
    time: ts,
    meal: 'siang',
    name: 'x',
    calories,
    source: 'manual',
    createdAt: ts,
    updatedAt: ts,
    ...extra,
  };
}

describe('summarizeDay', () => {
  it('totals by meal and ignores other days and deleted entries', () => {
    const s = summarizeDay(
      [
        entry('2026-01-05', 300, { meal: 'sarapan' }),
        entry('2026-01-05', 500),
        entry('2026-01-05', 999, { deletedAt: '2026-01-05T10:00:00Z' }),
        entry('2026-01-04', 700),
      ],
      '2026-01-05',
      2000,
    );
    expect(s.total).toBe(800);
    expect(s.byMeal).toEqual({ sarapan: 300, siang: 500, malam: 0, camilan: 0 });
    expect(s.remaining).toBe(1200);
    expect(s.progress).toBeCloseTo(0.4);
  });

  it('reports negative remaining when over target', () => {
    expect(summarizeDay([entry('2026-01-05', 2500)], '2026-01-05', 2000).remaining).toBe(-500);
  });

  it('handles a zero target', () => {
    expect(summarizeDay([entry('2026-01-05', 100)], '2026-01-05', 0).progress).toBe(0);
  });
});

describe('recentDays', () => {
  it('lists only days with entries in the window, newest first', () => {
    const days = recentDays(
      [
        entry('2026-01-10', 500),
        entry('2026-01-10', 300),
        entry('2026-01-08', 900),
        entry('2026-01-09', 400, { deletedAt: 't' }),
        entry('2025-12-01', 700),
      ],
      '2026-01-10',
      30,
    );
    expect(days).toEqual([
      { date: '2026-01-10', total: 800 },
      { date: '2026-01-08', total: 900 },
    ]);
  });
});

describe('summarizeWeek', () => {
  it('covers 7 days and averages only over logged days', () => {
    const w = summarizeWeek(
      [entry('2026-01-07', 2400), entry('2026-01-05', 1600), entry('2025-12-31', 5000)],
      '2026-01-07',
      2000,
    );
    expect(w.days.map((d) => d.date)).toEqual([
      '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07',
    ]);
    expect(w.total).toBe(4000);
    expect(w.loggedDays).toBe(2);
    expect(w.averageLoggedDays).toBe(2000);
    expect(w.daysOverTarget).toBe(1);
  });
});
