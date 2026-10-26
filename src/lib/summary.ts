import { MEAL_TYPES, type FoodEntry, type MealType } from '../db/schema';
import { lastNDays } from './date';

export interface DailySummary {
  date: string;
  total: number;
  byMeal: Record<MealType, number>;
  target: number;
  remaining: number;
  /** 0..1+, total / target (0 when target is 0). */
  progress: number;
}

const live = (e: FoodEntry) => !e.deletedAt;

export function summarizeDay(entries: FoodEntry[], date: string, target: number): DailySummary {
  const byMeal = Object.fromEntries(MEAL_TYPES.map((m) => [m, 0])) as Record<MealType, number>;
  let total = 0;
  for (const e of entries) {
    if (!live(e) || e.date !== date) continue;
    byMeal[e.meal] += e.calories;
    total += e.calories;
  }
  return {
    date,
    total,
    byMeal,
    target,
    remaining: target - total,
    progress: target > 0 ? total / target : 0,
  };
}

export interface WeeklySummary {
  days: { date: string; total: number }[];
  target: number;
  total: number;
  /** Average over days that have at least one entry. */
  averageLoggedDays: number;
  loggedDays: number;
  daysOverTarget: number;
}

export function summarizeWeek(entries: FoodEntry[], endDate: string, target: number, n = 7): WeeklySummary {
  const keys = lastNDays(endDate, n);
  const totals = new Map(keys.map((k) => [k, 0]));
  const logged = new Set<string>();
  for (const e of entries) {
    if (!live(e) || !totals.has(e.date)) continue;
    totals.set(e.date, totals.get(e.date)! + e.calories);
    logged.add(e.date);
  }
  const days = keys.map((date) => ({ date, total: totals.get(date)! }));
  const total = days.reduce((s, d) => s + d.total, 0);
  return {
    days,
    target,
    total,
    loggedDays: logged.size,
    averageLoggedDays: logged.size > 0 ? Math.round(total / logged.size) : 0,
    daysOverTarget: target > 0 ? days.filter((d) => d.total > target).length : 0,
  };
}
