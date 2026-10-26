import { useState } from 'react';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { PolarBear } from '../components/PolarBear';
import { SnowBurst } from '../components/SnowBurst';
import { setDailyTarget } from '../db/repo';
import { MASCOT_NAME, type Mood } from '../lib/mascot';
import {
  ACTIVITY_OPTIONS,
  GOAL_OPTIONS,
  LIMITS,
  dailyTarget,
  validateProfile,
  type Profile,
  type Sex,
} from '../lib/tdee';

const PROFILE_KEY = 'kalori.profile';
const DONE_KEY = 'kalori.onboarded';

export function onboardingDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return true;
  }
}

function markDone() {
  try {
    localStorage.setItem(DONE_KEY, '1');
  } catch {
    // storage unavailable
  }
}

function loadProfile(): Partial<Profile> {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}') as Partial<Profile>;
  } catch {
    return {};
  }
}

function saveProfile(p: Profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    // storage unavailable
  }
}

const STEPS = ['Tentang kamu', 'Ukuran tubuh', 'Aktivitas', 'Tujuan', 'Hasil'] as const;
const STEP_MOOD: Mood[] = ['hungry', 'happy', 'happy', 'hungry', 'proud'];
const STEP_LINE = [
  `Halo! Aku ${MASCOT_NAME}. Yuk hitung target kalorimu.`,
  'Tinggi dan beratmu berapa?',
  'Seberapa aktif kamu sehari-hari?',
  'Apa tujuanmu?',
  'Ini target harianmu!',
];

const num = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')));

export function Onboarding({ onClose }: { onClose: () => void }) {
  const saved = loadProfile();
  const [step, setStep] = useState(0);
  const [sex, setSex] = useState<Sex>(saved.sex ?? 'pria');
  const [age, setAge] = useState(saved.age ? String(saved.age) : '');
  const [height, setHeight] = useState(saved.heightCm ? String(saved.heightCm) : '');
  const [weight, setWeight] = useState(saved.weightKg ? String(saved.weightKg) : '');
  const [activity, setActivity] = useState(saved.activity ?? 'ringan');
  const [goal, setGoal] = useState(saved.goal ?? 'jaga');
  const [error, setError] = useState<string | null>(null);

  const profile: Profile = { sex, age: num(age), heightCm: num(height), weightKg: num(weight), activity, goal };
  const result = step === 4 ? dailyTarget(profile) : null;

  function next() {
    const [min, max] = LIMITS.age;
    if (step === 0 && !(profile.age >= min && profile.age <= max)) {
      return setError(`Umur harus antara ${min}–${max}.`);
    }
    if (step === 1) {
      const err = validateProfile(profile);
      if (err) return setError(err);
    }
    setError(null);
    setStep((s) => s + 1);
  }

  function skip() {
    markDone();
    onClose();
  }

  async function apply() {
    if (!result) return;
    saveProfile(profile);
    await setDailyTarget(result.target);
    markDone();
    onClose();
  }

  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-label="Hitung target kalori">
      <div className="onboarding-top">
        <div className="dots" aria-label={`Langkah ${step + 1} dari ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <span key={s} className={i <= step ? 'on' : ''} />
          ))}
        </div>
        {step < 4 && (
          <button className="link-btn" onClick={skip}>
            Lewati
          </button>
        )}
      </div>

      <div className="onboarding-hero" key={step}>
        {step === 4 && <SnowBurst />}
        <PolarBear mood={STEP_MOOD[step]!} size={150} />
        <p className="speech">{STEP_LINE[step]}</p>
      </div>

      <div className="onboarding-body" key={`b${step}`}>
        {step === 0 && (
          <>
            <div className="seg">
              {(['pria', 'wanita'] as const).map((s) => (
                <button key={s} className={sex === s ? 'on' : ''} onClick={() => setSex(s)}>
                  {s === 'pria' ? '👨 Pria' : '👩 Wanita'}
                </button>
              ))}
            </div>
            <label className="field">
              Umur
              <span className="unit-input">
                <input inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} placeholder="25" />
                <span>tahun</span>
              </span>
            </label>
          </>
        )}

        {step === 1 && (
          <>
            <label className="field">
              Tinggi badan
              <span className="unit-input">
                <input inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="165" />
                <span>cm</span>
              </span>
            </label>
            <label className="field">
              Berat badan
              <span className="unit-input">
                <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="60" />
                <span>kg</span>
              </span>
            </label>
          </>
        )}

        {step === 2 && (
          <div className="choice-list">
            {ACTIVITY_OPTIONS.map((a) => (
              <button key={a.id} className={`choice ${activity === a.id ? 'on' : ''}`} onClick={() => setActivity(a.id)}>
                <strong>{a.label}</strong>
                <small>{a.hint}</small>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="choice-list">
            {GOAL_OPTIONS.map((g) => (
              <button key={g.id} className={`choice ${goal === g.id ? 'on' : ''}`} onClick={() => setGoal(g.id)}>
                <strong>{g.label}</strong>
                <small>{g.hint}</small>
              </button>
            ))}
          </div>
        )}

        {step === 4 && result && (
          <div className="result">
            <strong className="result-number">
              <AnimatedNumber value={result.target} duration={1200} />
            </strong>
            <span className="muted">kkal per hari</span>
            <p className="muted small">
              Kebutuhan harianmu sekitar {result.maintenance.toLocaleString('id-ID')} kkal (BMR{' '}
              {result.bmr.toLocaleString('id-ID')} kkal).
              {result.clamped && ' Target dinaikkan ke batas aman minimum.'} Ini perkiraan umum, bukan saran medis.
            </p>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </div>

      <div className="onboarding-actions">
        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)} aria-label="Kembali">
            ‹
          </button>
        )}
        {step < 4 ? (
          <button className="primary grow" onClick={next}>
            Lanjut
          </button>
        ) : (
          <button className="primary grow" onClick={apply}>
            Pakai target ini
          </button>
        )}
      </div>
    </div>
  );
}
