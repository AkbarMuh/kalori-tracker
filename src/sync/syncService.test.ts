import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataFile, FoodEntry } from '../db/schema';
import { mergeData } from './merge';

// In-memory stand-ins for the local database and the remote file.
let local: DataFile;
let remote: { data: DataFile; sha: string } | null;
let conflictsToInject = 0;

vi.mock('../db/repo', () => ({
  exportAll: async () => structuredClone(local),
  mergeIntoLocal: async (d: DataFile) => {
    local = mergeData(local, d);
  },
  onLocalChange: () => () => {},
}));

vi.mock('./github', () => ({
  isConflict: (e: unknown) => e instanceof Error && e.message === 'conflict',
  readRemote: async () => structuredClone(remote),
  writeRemote: vi.fn(async (_cfg: unknown, data: DataFile, sha: string | null) => {
    if (conflictsToInject > 0) {
      conflictsToInject--;
      // Simulate another device pushing a new entry right before our write.
      remote = { data: { ...remote!.data, entries: [...remote!.data.entries, entry('other-device')] }, sha: 'x' + sha };
      throw new Error('conflict');
    }
    remote = { data, sha: 'sha' + Math.random() };
    return remote.sha;
  }),
}));

const { syncNow, saveConfig, syncStore } = await import('./syncService');
const github = await import('./github');

function entry(id: string): FoodEntry {
  return {
    id,
    date: '2026-01-05',
    time: 't',
    meal: 'siang',
    name: id,
    calories: 100,
    source: 'manual',
    createdAt: 't',
    updatedAt: 't',
  };
}

const empty = (): DataFile => ({
  version: 1,
  settings: { id: 'main', dailyTarget: 2000, updatedAt: '1970-01-01T00:00:00.000Z' },
  entries: [],
  favorites: [],
});

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  });
  vi.stubGlobal('navigator', { onLine: true });
  local = empty();
  remote = null;
  conflictsToInject = 0;
  vi.mocked(github.writeRemote).mockClear();
  saveConfig({ token: 't', owner: 'o', repo: 'r', path: 'data.json' });
});

describe('syncNow', () => {
  it('creates the remote file on first sync', async () => {
    local.entries = [entry('a')];
    await syncNow();
    expect(remote?.data.entries.map((e) => e.id)).toEqual(['a']);
    expect(syncStore.getSnapshot().status).toBe('idle');
  });

  it('pulls remote entries into the local database', async () => {
    remote = { data: { ...empty(), entries: [entry('from-phone')] }, sha: 's1' };
    local.entries = [entry('from-laptop')];
    await syncNow();
    expect(local.entries.map((e) => e.id)).toEqual(['from-laptop', 'from-phone']);
    expect(remote!.data.entries.map((e) => e.id)).toEqual(['from-laptop', 'from-phone']);
  });

  it('does not write when nothing changed', async () => {
    remote = { data: { ...empty(), entries: [entry('a')] }, sha: 's1' };
    local.entries = [entry('a')];
    await syncNow();
    expect(github.writeRemote).not.toHaveBeenCalled();
  });

  it('re-reads and merges after a write conflict, keeping both devices’ entries', async () => {
    remote = { data: empty(), sha: 's1' };
    local.entries = [entry('mine')];
    conflictsToInject = 1;
    await syncNow();
    expect(github.writeRemote).toHaveBeenCalledTimes(2);
    expect(remote!.data.entries.map((e) => e.id)).toEqual(['mine', 'other-device']);
    expect(local.entries.map((e) => e.id)).toEqual(['mine', 'other-device']);
  });

  it('reports an error after repeated conflicts', async () => {
    remote = { data: empty(), sha: 's1' };
    local.entries = [entry('mine')];
    conflictsToInject = 5;
    await syncNow();
    expect(syncStore.getSnapshot().status).toBe('error');
  });

  it('marks offline without calling GitHub', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    await syncNow();
    expect(syncStore.getSnapshot().status).toBe('offline');
    expect(github.writeRemote).not.toHaveBeenCalled();
  });
});
