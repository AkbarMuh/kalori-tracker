import { describe, expect, it } from 'vitest';
import { bmr, dailyTarget, validateProfile, type Profile } from './tdee';

const base: Profile = { sex: 'pria', age: 30, heightCm: 170, weightKg: 70, activity: 'sedang', goal: 'jaga' };

describe('bmr (Mifflin–St Jeor)', () => {
  it('matches the reference formula', () => {
    // 10*70 + 6.25*170 - 5*30 + 5 = 1617.5
    expect(bmr(base)).toBeCloseTo(1617.5);
    expect(bmr({ ...base, sex: 'wanita' })).toBeCloseTo(1451.5);
  });
});

describe('dailyTarget', () => {
  it('applies the activity factor and rounds to 10', () => {
    // 1617.5 * 1.55 = 2507.1
    expect(dailyTarget(base).target).toBe(2510);
  });

  it('applies the goal delta', () => {
    expect(dailyTarget({ ...base, goal: 'turun' }).target).toBe(2010);
    expect(dailyTarget({ ...base, goal: 'naik' }).target).toBe(2810);
  });

  it('never goes below the safe minimum', () => {
    const r = dailyTarget({ sex: 'wanita', age: 60, heightCm: 150, weightKg: 45, activity: 'minim', goal: 'turun' });
    expect(r.target).toBe(1200);
    expect(r.clamped).toBe(true);
  });
});

describe('validateProfile', () => {
  it('accepts a normal profile', () => {
    expect(validateProfile(base)).toBeNull();
  });

  it('rejects out-of-range values', () => {
    expect(validateProfile({ ...base, age: 8 })).toContain('Umur');
    expect(validateProfile({ ...base, heightCm: NaN })).toContain('Tinggi');
  });
});
