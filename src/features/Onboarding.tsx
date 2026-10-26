import { useState } from 'react';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { Icon } from '../components/Icon';
import { NumberSlider } from '../components/NumberSlider';
import { PolarBear } from '../components/PolarBear';
import { SnowBurst } from '../components/SnowBurst';
import { setDailyTarget } from '../db/repo';
import { haptic } from '../lib/haptics';
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

/** Slider ranges stay inside the validated limits. */
const WEIGHT_MAX = 200;

export function Onboarding({ onClose }: { onClose: () => void }) {
  const [saved] = useState(loadProfile);
  const [step, setStep] = useState(0);
  const [sex, setSex] = useState<Sex>(saved.sex ?? 'pria');
  const [age, setAge] = useState(saved.age ?? 25);
  const [height, setHeight] = useState(saved.heightCm ?? 165);
  const [weight, setWeight] = useState(saved.weightKg ?? 60);
  const [activity, setActivity] = useState(saved.activity ?? 'ringan');
  const [goal, setGoal] = useState(saved.goal ?? 'jaga');

  const profile: Profile = { sex, age, heightCm: height, weightKg: weight, activity, goal };
  const result = step === 4 ? dailyTarget(profile) : null;

  function go(delta: number) {
    haptic(delta > 0 ? 8 : 5);
    if (step + delta === 4) haptic([20, 40, 30]);
    setStep((s) => s + delta);
  }

  function skip() {
    markDone();
    onClose();
  }

  async function apply() {
    if (!result || validateProfile(profile)) return;
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
                <button
                  key={s}
                  className={sex === s ? 'on' : ''}
                  onClick={() => {
                    haptic(5);
                    setSex(s);
                  }}
                >
                  <Icon name={s === 'pria' ? 'male' : 'female'} size={22} />
                  {s === 'pria' ? 'Pria' : 'Wanita'}
                </button>
              ))}
            </div>
            <NumberSlider label="Umur" unit="tahun" value={age} min={LIMITS.age[0]} max={LIMITS.age[1]} onChange={setAge} />
          </>
        )}

        {step === 1 && (
          <>
            <NumberSlider
              label="Tinggi badan"
              unit="cm"
              value={height}
              min={LIMITS.heightCm[0]}
              max={LIMITS.heightCm[1]}
              onChange={setHeight}
            />
            <NumberSlider
              label="Berat badan"
              unit="kg"
              value={weight}
              min={LIMITS.weightKg[0]}
              max={WEIGHT_MAX}
              step={0.5}
              onChange={setWeight}
            />
          </>
        )}

        {step === 2 && (
          <div className="choice-list">
            {ACTIVITY_OPTIONS.map((a) => (
              <button
                key={a.id}
                className={`choice ${activity === a.id ? 'on' : ''}`}
                onClick={() => {
                  haptic(5);
                  setActivity(a.id);
                }}
              >
                <strong>{a.label}</strong>
                <small>{a.hint}</small>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="choice-list">
            {GOAL_OPTIONS.map((g) => (
              <button
                key={g.id}
                className={`choice ${goal === g.id ? 'on' : ''}`}
                onClick={() => {
                  haptic(5);
                  setGoal(g.id);
                }}
              >
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

      </div>

      <div className="onboarding-actions">
        {step > 0 && (
          <button onClick={() => go(-1)} aria-label="Kembali">
            <Icon name="chevronLeft" />
          </button>
        )}
        {step < 4 ? (
          <button className="primary grow" onClick={() => go(1)}>
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
