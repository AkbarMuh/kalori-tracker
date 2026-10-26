import { z } from 'zod';

export const MEAL_TYPES = ['sarapan', 'siang', 'malam', 'camilan'] as const;
export const MealTypeSchema = z.enum(MEAL_TYPES);
export type MealType = z.infer<typeof MealTypeSchema>;

export const MEAL_LABELS: Record<MealType, string> = {
  sarapan: 'Sarapan',
  siang: 'Makan siang',
  malam: 'Makan malam',
  camilan: 'Camilan',
};

export const MEAL_SHORT_LABELS: Record<MealType, string> = {
  sarapan: 'Sarapan',
  siang: 'Siang',
  malam: 'Malam',
  camilan: 'Camilan',
};

const calories = z.number().int().min(0).max(20000);

export const FoodEntrySchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string(),
  meal: MealTypeSchema,
  name: z.string(),
  calories,
  source: z.enum(['manual', 'favorite', 'ai']),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional(),
});
export type FoodEntry = z.infer<typeof FoodEntrySchema>;

export const FavoriteFoodSchema = z.object({
  id: z.string(),
  name: z.string(),
  calories,
  defaultMeal: MealTypeSchema.optional(),
  updatedAt: z.string(),
  deletedAt: z.string().optional(),
});
export type FavoriteFood = z.infer<typeof FavoriteFoodSchema>;

export const SettingsSchema = z.object({
  id: z.literal('main'),
  dailyTarget: z.number().int().min(0).max(20000),
  updatedAt: z.string(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  dailyTarget: 2000,
  // Epoch so any explicitly saved settings (local or remote) win a merge.
  updatedAt: new Date(0).toISOString(),
};

export const DATA_VERSION = 1;

/** Shape of data.json in the sync repo, and of export/backup files. */
export const DataFileSchema = z.object({
  version: z.literal(DATA_VERSION),
  settings: SettingsSchema,
  entries: z.array(FoodEntrySchema),
  favorites: z.array(FavoriteFoodSchema),
});
export type DataFile = z.infer<typeof DataFileSchema>;
