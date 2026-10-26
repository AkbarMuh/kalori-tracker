import { mergeData } from '../sync/merge';
import { db } from './db';
import {
  DATA_VERSION,
  DEFAULT_SETTINGS,
  type DataFile,
  type FavoriteFood,
  type FoodEntry,
  type MealType,
  type Settings,
} from './schema';

type Listener = () => void;
const changeListeners = new Set<Listener>();

/** Subscribe to local data changes made through this module (used to trigger sync). */
export function onLocalChange(fn: Listener): () => void {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

function changed() {
  for (const fn of changeListeners) fn();
}

type AddedListener = (entries: FoodEntry[]) => void;
const addedListeners = new Set<AddedListener>();

/** Subscribe to newly added entries (used for the mascot's "nyam" reaction). */
export function onEntriesAdded(fn: AddedListener): () => void {
  addedListeners.add(fn);
  return () => addedListeners.delete(fn);
}

const now = () => new Date().toISOString();

export interface NewEntry {
  date: string;
  time: string;
  meal: MealType;
  name: string;
  calories: number;
  source: FoodEntry['source'];
}

export async function addEntries(items: NewEntry[]): Promise<FoodEntry[]> {
  const ts = now();
  const entries = items.map((i) => ({ ...i, id: crypto.randomUUID(), createdAt: ts, updatedAt: ts }));
  await db.entries.bulkAdd(entries);
  changed();
  for (const fn of addedListeners) fn(entries);
  return entries;
}

/** Attaches one photo thumbnail to several entries (e.g. all items found in one picture). */
export async function savePhoto(entryIds: string[], dataUrl: string): Promise<void> {
  await db.photos.bulkPut(entryIds.map((entryId) => ({ entryId, dataUrl })));
}

export async function updateEntry(
  id: string,
  patch: Partial<Pick<FoodEntry, 'name' | 'calories' | 'meal' | 'date' | 'time'>>,
): Promise<void> {
  await db.entries.update(id, { ...patch, updatedAt: now() });
  changed();
}

/** Soft delete so the deletion propagates through sync. */
export async function deleteEntry(id: string): Promise<void> {
  await setEntriesDeleted([id], true);
}

/** Soft-deletes or restores (undo) entries; either way the change wins the next sync merge. */
export async function setEntriesDeleted(ids: string[], deleted: boolean): Promise<void> {
  const ts = now();
  await db.entries
    .where('id')
    .anyOf(ids)
    .modify((e) => {
      if (deleted) e.deletedAt = ts;
      else delete e.deletedAt;
      e.updatedAt = ts;
    });
  changed();
}

export async function saveFavorite(fav: Omit<FavoriteFood, 'id' | 'updatedAt'> & { id?: string }): Promise<void> {
  await db.favorites.put({ ...fav, id: fav.id ?? crypto.randomUUID(), updatedAt: now() });
  changed();
}

export async function deleteFavorite(id: string): Promise<void> {
  const ts = now();
  await db.favorites.update(id, { deletedAt: ts, updatedAt: ts });
  changed();
}

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('main')) ?? DEFAULT_SETTINGS;
}

export async function setDailyTarget(dailyTarget: number): Promise<void> {
  await db.settings.put({ id: 'main', dailyTarget, updatedAt: now() });
  changed();
}

/** Everything in the local database, including soft-deleted records. */
export async function exportAll(): Promise<DataFile> {
  const [settings, entries, favorites] = await Promise.all([
    getSettings(),
    db.entries.toArray(),
    db.favorites.toArray(),
  ]);
  return { version: DATA_VERSION, settings, entries, favorites };
}

/**
 * Merges `data` into the local database in one transaction, re-reading current rows so an
 * edit made while a sync was in flight is never overwritten by an older copy.
 */
export async function mergeIntoLocal(data: DataFile, { emitChange = false } = {}): Promise<void> {
  await db.transaction('rw', db.entries, db.favorites, db.settings, async () => {
    const current = await exportAll();
    const merged = mergeData(current, data);
    await db.entries.bulkPut(merged.entries);
    await db.favorites.bulkPut(merged.favorites);
    await db.settings.put(merged.settings);
  });
  if (emitChange) changed();
}
