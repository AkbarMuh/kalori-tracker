import type { DataFile } from '../db/schema';

interface Versioned {
  id: string;
  updatedAt: string;
}

/** Newer `updatedAt` wins; on a tie the remote copy wins so every device converges. */
function newer<T extends Versioned>(local: T, remote: T): T {
  return local.updatedAt > remote.updatedAt ? local : remote;
}

export function mergeRecords<T extends Versioned>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>();
  for (const r of remote) byId.set(r.id, r);
  for (const l of local) {
    const r = byId.get(l.id);
    byId.set(l.id, r ? newer(l, r) : l);
  }
  return [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function mergeData(local: DataFile, remote: DataFile): DataFile {
  return {
    version: local.version,
    settings: newer(local.settings, remote.settings),
    entries: mergeRecords(local.entries, remote.entries),
    favorites: mergeRecords(local.favorites, remote.favorites),
  };
}

/**
 * Stable serialization with one record per line, so the sync repo's git history
 * shows readable per-entry diffs while staying compact.
 */
export function serializeData(data: DataFile): string {
  const list = (items: object[]) =>
    items.length === 0 ? '[]' : `[\n${items.map((i) => '  ' + stableStringify(i)).join(',\n')}\n]`;
  return (
    `{\n"version": ${data.version},\n` +
    `"settings": ${stableStringify(data.settings)},\n` +
    `"entries": ${list(data.entries)},\n` +
    `"favorites": ${list(data.favorites)}\n}\n`
  );
}

/** JSON for a flat record with keys sorted, so key insertion order never causes a diff. */
function stableStringify(record: object): string {
  const sorted = Object.fromEntries(
    Object.entries(record)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1)),
  );
  return JSON.stringify(sorted);
}

/** True when two data files would serialize identically (i.e. nothing to upload). */
export function sameData(a: DataFile, b: DataFile): boolean {
  return serializeData(a) === serializeData(b);
}
