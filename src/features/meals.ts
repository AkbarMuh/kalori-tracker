import type { IconName } from '../components/Icon';
import type { MealType } from '../db/schema';
import type { Mood } from '../lib/mascot';

export const MEAL_ICON: Record<MealType, IconName> = {
  sarapan: 'sunrise',
  siang: 'sun',
  malam: 'moon',
  camilan: 'cookie',
};

/** Soft pastel tones per meal, readable on both light and dark surfaces. */
export const MEAL_TONE: Record<MealType, string> = {
  sarapan: '#f59e5b',
  siang: '#eaa915',
  malam: '#8b7cf6',
  camilan: '#e879a6',
};

export const MOOD_ICON: Record<Mood, IconName> = {
  sleepy: 'moon',
  hungry: 'bowl',
  happy: 'heart',
  proud: 'party',
  stuffed: 'drop',
};
