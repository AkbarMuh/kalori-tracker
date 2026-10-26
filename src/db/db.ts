import Dexie, { type EntityTable } from 'dexie';
import type { FavoriteFood, FoodEntry, Settings } from './schema';

export const db = new Dexie('kalori-tracker') as Dexie & {
  entries: EntityTable<FoodEntry, 'id'>;
  favorites: EntityTable<FavoriteFood, 'id'>;
  settings: EntityTable<Settings, 'id'>;
};

db.version(1).stores({
  entries: 'id, date, updatedAt',
  favorites: 'id, name, updatedAt',
  settings: 'id',
});
