export type Sex = 'pria' | 'wanita';
export type Activity = 'minim' | 'ringan' | 'sedang' | 'aktif' | 'sangat';
export type Goal = 'turun' | 'jaga' | 'naik';

export interface Profile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: Goal;
}

export const ACTIVITY_OPTIONS: { id: Activity; label: string; hint: string; factor: number }[] = [
  { id: 'minim', label: 'Minim', hint: 'Kebanyakan duduk, jarang olahraga', factor: 1.2 },
  { id: 'ringan', label: 'Ringan', hint: 'Olahraga ringan 1–3x seminggu', factor: 1.375 },
  { id: 'sedang', label: 'Sedang', hint: 'Olahraga 3–5x seminggu', factor: 1.55 },
  { id: 'aktif', label: 'Aktif', hint: 'Olahraga berat 6–7x seminggu', factor: 1.725 },
  { id: 'sangat', label: 'Sangat aktif', hint: 'Kerja fisik + latihan harian', factor: 1.9 },
];

export const GOAL_OPTIONS: { id: Goal; label: string; hint: string; delta: number }[] = [
  { id: 'turun', label: 'Turun berat', hint: 'Defisit ±500 kkal/hari', delta: -500 },
  { id: 'jaga', label: 'Jaga berat', hint: 'Sesuai kebutuhan harian', delta: 0 },
  { id: 'naik', label: 'Naik berat', hint: 'Surplus ±300 kkal/hari', delta: 300 },
];

export const LIMITS = {
  age: [13, 100],
  heightCm: [120, 230],
  weightKg: [30, 300],
} as const;

/** Basal metabolic rate, Mifflin–St Jeor. */
export function bmr(p: Pick<Profile, 'sex' | 'age' | 'heightCm' | 'weightKg'>): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === 'pria' ? base + 5 : base - 161;
}

/** Floors below which a self-set deficit is not advisable without supervision. */
const MIN_TARGET: Record<Sex, number> = { pria: 1500, wanita: 1200 };

export interface TargetResult {
  bmr: number;
  maintenance: number;
  target: number;
  /** True when the goal adjustment was clamped to the safe minimum. */
  clamped: boolean;
}

export function dailyTarget(p: Profile): TargetResult {
  const factor = ACTIVITY_OPTIONS.find((a) => a.id === p.activity)!.factor;
  const delta = GOAL_OPTIONS.find((g) => g.id === p.goal)!.delta;
  const b = bmr(p);
  const maintenance = b * factor;
  const raw = maintenance + delta;
  const floor = MIN_TARGET[p.sex];
  const target = Math.round(Math.max(raw, floor) / 10) * 10;
  return { bmr: Math.round(b), maintenance: Math.round(maintenance / 10) * 10, target, clamped: raw < floor };
}

export function validateProfile(p: Partial<Profile>): string | null {
  for (const key of ['age', 'heightCm', 'weightKg'] as const) {
    const v = p[key];
    const [min, max] = LIMITS[key];
    if (v === undefined || !Number.isFinite(v) || v < min || v > max) {
      const label = key === 'age' ? 'Umur' : key === 'heightCm' ? 'Tinggi' : 'Berat';
      return `${label} harus antara ${min}–${max}.`;
    }
  }
  return null;
}
