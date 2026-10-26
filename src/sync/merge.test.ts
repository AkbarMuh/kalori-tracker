import { describe, expect, it } from 'vitest';
import { DataFileSchema, type DataFile, type FoodEntry } from '../db/schema';
import { mergeData, mergeRecords, sameData, serializeData } from './merge';

function entry(id: string, updatedAt: string, extra: Partial<FoodEntry> = {}): FoodEntry {
  return {
    id,
    date: '2026-01-05',
    time: '2026-01-05T05:00:00.000Z',
    meal: 'sarapan',
    name: id,
    calories: 100,
    source: 'manual',
    createdAt: '2026-01-05T05:00:00.000Z',
    updatedAt,
    ...extra,
  };
}

const file = (entries: FoodEntry[], settingsAt = '2026-01-01T00:00:00Z', target = 2000): DataFile => ({
  version: 1,
  settings: { id: 'main', dailyTarget: target, updatedAt: settingsAt },
  entries,
  favorites: [],
});

describe('mergeRecords', () => {
  it('unions records from both sides', () => {
    const out = mergeRecords([entry('a', 't1')], [entry('b', 't1')]);
    expect(out.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('keeps the newer copy of a record', () => {
    const local = entry('a', '2026-01-05T10:00:00Z', { calories: 200 });
    const remote = entry('a', '2026-01-05T09:00:00Z', { calories: 150 });
    expect(mergeRecords([local], [remote])[0]!.calories).toBe(200);
    expect(mergeRecords([remote], [local])[0]!.calories).toBe(200);
  });

  it('propagates soft deletes when the deletion is newer', () => {
    const live = entry('a', '2026-01-05T09:00:00Z');
    const deleted = entry('a', '2026-01-05T10:00:00Z', { deletedAt: '2026-01-05T10:00:00Z' });
    expect(mergeRecords([live], [deleted])[0]!.deletedAt).toBeDefined();
  });

  it('breaks ties toward remote so devices converge', () => {
    const local = entry('a', 't', { calories: 1 });
    const remote = entry('a', 't', { calories: 2 });
    expect(mergeRecords([local], [remote])[0]!.calories).toBe(2);
  });
});

describe('mergeData', () => {
  it('takes the newer settings', () => {
    const merged = mergeData(file([], '2026-01-02T00:00:00Z', 1800), file([], '2026-01-01T00:00:00Z', 2200));
    expect(merged.settings.dailyTarget).toBe(1800);
  });

  it('is order-independent in content', () => {
    const a = file([entry('a', '2026-01-05T10:00:00Z'), entry('c', 't')]);
    const b = file([entry('a', '2026-01-05T09:00:00Z'), entry('b', 't')], '2026-01-03T00:00:00Z');
    expect(sameData(mergeData(a, b), mergeData(b, a))).toBe(true);
  });
});

describe('serializeData', () => {
  it('produces JSON that parses back to the same data', () => {
    const data = file([entry('a', 't'), entry('b', 't', { deletedAt: 't2' })]);
    expect(DataFileSchema.parse(JSON.parse(serializeData(data)))).toEqual(data);
  });

  it('ignores key order and undefined fields', () => {
    const e = entry('a', 't');
    const reordered = Object.fromEntries(Object.entries(e).reverse()) as FoodEntry;
    expect(sameData(file([e]), file([{ ...reordered, deletedAt: undefined }]))).toBe(true);
  });

  it('puts one record per line for readable diffs', () => {
    const text = serializeData(file([entry('a', 't'), entry('b', 't')]));
    expect(text.split('\n').filter((l) => l.startsWith('  {')).length).toBe(2);
  });
});
