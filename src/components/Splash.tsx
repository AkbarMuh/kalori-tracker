import { useEffect, useRef, useState } from 'react';
import { MASCOT_NAME } from '../lib/mascot';
import { PolarBear } from './PolarBear';

type Phase = 'sleep' | 'wake' | 'wave' | 'title' | 'exit';

/** When each phase starts (ms). Total ≈ 4 s, within the requested 3–5 s. */
const TIMELINE: [Phase, number][] = [
  ['wake', 1300],
  ['wave', 2100],
  ['title', 2800],
  ['exit', 3600],
];
const DONE_AT = 4050;
const EXIT_MS = 420;

/** "Salju wakes up" intro: asleep on an ice floe → stretches → waves hello → title. Tap to skip. */
export function Splash({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('sleep');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current = [
      ...TIMELINE.map(([p, at]) => setTimeout(() => setPhase(p), at)),
      setTimeout(onDone, DONE_AT),
    ];
    return () => timers.current.forEach(clearTimeout);
  }, [onDone]);

  function skip() {
    if (phase === 'exit') return;
    timers.current.forEach(clearTimeout);
    setPhase('exit');
    timers.current = [setTimeout(onDone, EXIT_MS)];
  }

  const awake = phase !== 'sleep';

  return (
    <div className={`splash phase-${phase}`} onClick={skip} role="presentation">
      <div className="snowfall" aria-hidden />
      <div className="splash-stage">
        <p className={`splash-hello ${phase === 'wave' || phase === 'title' ? 'on' : ''}`}>Halo! Aku {MASCOT_NAME}</p>
        <div className="splash-bear">
          <PolarBear mood={awake ? 'hungry' : 'sleepy'} size={170} tracking={false} className={phase === 'wake' ? 'stretching' : ''} />
        </div>
        <svg className="floe" viewBox="0 0 240 60" aria-hidden>
          <ellipse cx="120" cy="38" rx="118" ry="20" fill="#7cc8f2" opacity="0.35" />
          <path d="M14 30 Q20 12 60 10 L180 9 Q222 12 226 30 Q200 44 120 44 Q40 44 14 30 Z" fill="#ffffff" />
          <path d="M14 30 Q40 44 120 44 Q200 44 226 30 L222 38 Q196 52 120 52 Q44 52 18 38 Z" fill="#cfe8f7" />
        </svg>
      </div>
      <div className={`splash-title ${phase === 'title' || phase === 'exit' ? 'on' : ''}`}>
        <h1>Kalori</h1>
        <p>foto makanan, {MASCOT_NAME} yang hitung</p>
      </div>
      <p className="splash-skip">ketuk untuk lewati</p>
    </div>
  );
}
