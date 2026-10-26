import Dexie, { type EntityTable } from 'dexie';
import type { FavoriteFood, FoodEntry, Settings } from './schema';

/** Food photo thumbnail for an entry. Kept on this device only; never synced or exported. */
export interface Photo {
  entryId: string;
  dataUrl: string;
}

export const db = new Dexie('kalori-tracker') as Dexie & {
  entries: EntityTable<FoodEntry, 'id'>;
  favorites: EntityTable<FavoriteFood, 'id'>;
  settings: EntityTable<Settings, 'id'>;
  photos: EntityTable<Photo, 'entryId'>;
};

db.version(1).stores({
  entries: 'id, date, updatedAt',
  favorites: 'id, name, updatedAt',
  settings: 'id',
});

db.version(2).stores({
  photos: 'entryId',
});
