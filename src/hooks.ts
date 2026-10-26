import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { db } from './db/db';
import { DEFAULT_SETTINGS } from './db/schema';
import { toDateKey } from './lib/date';
import { syncStore } from './sync/syncService';

export function useSettings() {
  return useLiveQuery(() => db.settings.get('main'), []) ?? DEFAULT_SETTINGS;
}

export function useEntriesForDates(dates: string[]) {
  const key = dates.join(',');
  return (
    useLiveQuery(
      () => db.entries.where('date').anyOf(key.split(',')).filter((e) => !e.deletedAt).toArray(),
      [key],
    ) ?? []
  );
}

export function useFavorites() {
  return (
    useLiveQuery(async () => {
      const all = await db.favorites.orderBy('name').toArray();
      return all.filter((f) => !f.deletedAt);
    }, []) ?? []
  );
}

export function useSyncState() {
  return useSyncExternalStore(syncStore.subscribe, syncStore.getSnapshot);
}

/** Today's date key, refreshed when the app regains focus or the day rolls over. */
export function useToday() {
  const [today, setToday] = useState(() => toDateKey(new Date()));
  useEffect(() => {
    const refresh = () => setToday(toDateKey(new Date()));
    const id = setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return today;
}
