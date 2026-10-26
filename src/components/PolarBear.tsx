import { useEffect, useRef, type RefObject } from 'react';
import type { Mood } from '../lib/mascot';

interface Props {
  mood: Mood;
  /** Plays a short chomp animation; remount (change `key`) to replay. */
  eating?: boolean;
  /** Plays a giggle wiggle (when tapped). */
  poked?: boolean;
  /** Empty-state variant: dozing by an ice hole with a fishing rod. */
  fishing?: boolean;
  /** No idle animation or pointer tracking (for small, repeated bears). */
  still?: boolean;
  /** Eyes and face follow the pointer / finger. */
  tracking?: boolean;
  size?: number;
  className?: string;
}

const INK = '#27323f';
const FUR = '#ffffff';
const LINE = '#b8d4e6';
const SHADE = '#e9f3fa';
const BLUSH = '#ffb3c1';

const MOOD_LABEL: Record<Mood, string> = {
  sleepy: 'mengantuk',
  hungry: 'lapar',
  happy: 'senang',
  proud: 'bangga',
  stuffed: 'kekenyangan',
};

/** Writes the pointer direction into --lx / --ly on the svg; CSS turns it into a glance. */
function useLookAt(ref: RefObject<SVGSVGElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const set = (x: number, y: number) => {
      el.style.setProperty('--lx', `${x.toFixed(2)}px`);
      el.style.setProperty('--ly', `${y.toFixed(2)}px`);
    };
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
        const dy = (e.clientY - (r.top + r.height * 0.4)) / (window.innerHeight / 2);
        set(Math.max(-1, Math.min(1, dx)) * 5, Math.max(-1, Math.min(1, dy)) * 4);
      });
      clearTimeout(idle);
      idle = setTimeout(() => set(0, 0), 2500);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      cancelAnimationFrame(raf);
      clearTimeout(idle);
    };
  }, [ref, enabled]);
}

function Eyes({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'sleepy':
      return (
        <g stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M70 86 q8 6 16 0" />
          <path d="M114 86 q8 6 16 0" />
        </g>
      );
    case 'happy':
    case 'proud':
      return (
        <g stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none">
          <path d="M70 88 q8 -10 16 0" />
          <path d="M114 88 q8 -10 16 0" />
        </g>
      );
    case 'stuffed':
      return (
        <g stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M70 82 l14 5 l-14 5" />
          <path d="M130 82 l-14 5 l14 5" />
        </g>
      );
    case 'hungry':
      return (
        <g className="bear-eyes">
          <g className="bear-pupils">
            <circle cx="78" cy="85" r="7" fill={INK} />
            <circle cx="122" cy="85" r="7" fill={INK} />
            <circle cx="80.5" cy="82.5" r="2.4" fill="#fff" />
            <circle cx="124.5" cy="82.5" r="2.4" fill="#fff" />
          </g>
        </g>
      );
  }
}

function Mouth({ mood }: { mood: Mood }) {
  const common = { stroke: INK, strokeWidth: 3.5, strokeLinecap: 'round' as const, fill: 'none' };
  switch (mood) {
    case 'sleepy':
      return <ellipse cx="100" cy="114" rx="4" ry="5" fill={INK} />;
    case 'hungry':
      return (
        <g>
          <path d="M88 110 q12 16 24 0 z" fill={INK} />
          <path d="M94 116 q6 5 12 0" fill="#ff8fa3" />
        </g>
      );
    case 'happy':
      return <path d="M88 110 q6 7 12 0 q6 7 12 0" {...common} />;
    case 'proud':
      return (
        <g>
          <path d="M84 108 q16 22 32 0 z" fill={INK} />
          <path d="M92 116 q8 6 16 0" fill="#ff8fa3" />
        </g>
      );
    case 'stuffed':
      return <path d="M86 114 q4.5 -5 9 0 t9 0 t9 0" {...common} />;
  }
}

export function PolarBear({
  mood,
  eating = false,
  poked = false,
  fishing = false,
  still = false,
  tracking = !still,
  size = 150,
  className,
}: Props) {
  const ref = useRef<SVGSVGElement>(null);
  useLookAt(ref, tracking);
  const classes = ['bear', `mood-${mood}`, eating && 'eating', poked && 'poked', still && 'still', className]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      ref={ref}
      className={classes}
      width={size}
      height={size}
      viewBox="0 0 200 210"
      role="img"
      aria-label={`Salju sedang ${MOOD_LABEL[mood]}`}
    >
      {fishing && (
        <g className="bear-fishing">
          <ellipse cx="168" cy="200" rx="26" ry="7" fill="#9fd3f0" stroke={LINE} strokeWidth="2" />
          <path d="M150 150 L186 92" stroke="#8b5e3c" strokeWidth="4" strokeLinecap="round" />
          <path className="bear-line" d="M186 92 L178 198" stroke={INK} strokeWidth="1.2" fill="none" />
        </g>
      )}

      <g className="bear-body-wrap">
        <ellipse cx="100" cy="204" rx="56" ry="6" fill="#000" opacity="0.08" />
        <g className="bear-body">
          <ellipse cx="100" cy="160" rx={mood === 'stuffed' ? 62 : 52} ry="42" fill={FUR} stroke={LINE} strokeWidth="3" />
          <ellipse cx="100" cy="166" rx={mood === 'stuffed' ? 40 : 30} ry="26" fill={SHADE} />
          <ellipse cx="74" cy="198" rx="16" ry="9" fill={FUR} stroke={LINE} strokeWidth="3" />
          <ellipse cx="126" cy="198" rx="16" ry="9" fill={FUR} stroke={LINE} strokeWidth="3" />
        </g>

        <g className="bear-arm left">
          <ellipse cx="56" cy="150" rx="13" ry="22" fill={FUR} stroke={LINE} strokeWidth="3" transform="rotate(20 56 150)" />
        </g>
        <g className={`bear-arm right ${fishing ? 'holding' : ''}`}>
          <ellipse
            cx="144"
            cy="150"
            rx="13"
            ry="22"
            fill={FUR}
            stroke={LINE}
            strokeWidth="3"
            transform={fishing ? 'rotate(-60 144 150)' : 'rotate(-20 144 150)'}
          />
        </g>

        <g className="bear-head">
          <circle cx="58" cy="50" r="19" fill={FUR} stroke={LINE} strokeWidth="3" />
          <circle cx="58" cy="50" r="9" fill={SHADE} />
          <circle cx="142" cy="50" r="19" fill={FUR} stroke={LINE} strokeWidth="3" />
          <circle cx="142" cy="50" r="9" fill={SHADE} />
          <ellipse cx="100" cy="92" rx="60" ry="52" fill={FUR} stroke={LINE} strokeWidth="3" />
          <g className="bear-face">
            <ellipse cx="100" cy="108" rx="24" ry="18" fill={SHADE} />
            <ellipse cx="100" cy="100" rx="9" ry="6.5" fill={INK} />
            <ellipse cx="97" cy="98" rx="2.5" ry="1.5" fill="#fff" opacity="0.7" />
            <Eyes mood={mood} />
            <g className="bear-mouth">
              <Mouth mood={mood} />
            </g>
            <ellipse cx="66" cy="104" rx="9" ry="5.5" fill={BLUSH} opacity={mood === 'sleepy' ? 0.25 : 0.7} />
            <ellipse cx="134" cy="104" rx="9" ry="5.5" fill={BLUSH} opacity={mood === 'sleepy' ? 0.25 : 0.7} />
          </g>
          {mood === 'stuffed' && <path className="bear-sweat" d="M150 62 q6 10 0 14 q-6 -4 0 -14 z" fill="#8fd0f5" />}
        </g>
      </g>

      {mood === 'sleepy' && !still && (
        <g className="bear-zzz" fill={INK} fontWeight="700" fontFamily="system-ui, sans-serif">
          <text x="150" y="40" fontSize="18">z</text>
          <text x="164" y="26" fontSize="14">z</text>
          <text x="176" y="14" fontSize="11">z</text>
        </g>
      )}
      {mood === 'proud' && (
        <g className="bear-sparkles" fill="#ffd166">
          <path d="M28 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 z" />
          <path d="M172 30 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" />
        </g>
      )}
      {eating && (
        <text className="bear-nyam" x="100" y="20" textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--accent)">
          nyam!
        </text>
      )}
    </svg>
  );
}
