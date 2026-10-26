import type { MealType } from '../db/schema';

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' in the device's local time zone (not UTC). */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses a 'YYYY-MM-DD' key as local midnight. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

export function addDays(key: string, days: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** The `n` date keys ending at (and including) `endKey`, oldest first. */
export function lastNDays(endKey: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(endKey, i - (n - 1)));
}

export function defaultMealForTime(d: Date): MealType {
  const h = d.getHours();
  if (h < 10) return 'sarapan';
  if (h < 15) return 'siang';
  if (h < 18) return 'camilan';
  return 'malam';
}

const dayFormat = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
const shortDayFormat = new Intl.DateTimeFormat('id-ID', { weekday: 'short' });

export function formatDateLong(key: string): string {
  return dayFormat.format(fromDateKey(key));
}

export function formatWeekdayShort(key: string): string {
  return shortDayFormat.format(fromDateKey(key));
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Combines a date key with the current wall-clock time, for entries logged on past days. */
export function timeOnDate(key: string, now: Date): string {
  const d = fromDateKey(key);
  d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
  return d.toISOString();
}
