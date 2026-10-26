/**
 * Soft duotone icon set: a pastel fill under rounded strokes, all in `currentColor`.
 * Navigation icons carry little bear ears, drawn as arcs that sit on the shape's top edge.
 */

const c = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;

const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}` +
  `h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;

const dot = (x: number, y: number) => `M${x} ${y}h.01`;

/** Bear ears resting on a horizontal top edge at y=7 (centres at x=9 and x=15). */
const EARS_Y7 = 'M7.02 7a2.1 2.1 0 1 1 3.96 0zM13.02 7a2.1 2.1 0 1 1 3.96 0z';
/** Ears resting on the top edge y=7.5 of the camera body. */
const EARS_CAMERA = 'M6.62 7.5a2.1 2.1 0 1 1 3.96 0zM13.42 7.5a2.1 2.1 0 1 1 3.96 0z';
/** Ears resting on the roof slopes of the house. */
const EARS_ROOF = 'M6.17 9.55A2 2 0 1 1 8.87 7.21zM15.13 7.21A2 2 0 1 1 17.83 9.55z';

interface Glyph {
  fill?: string;
  d: string;
}

const GLYPHS = {
  // --- navigation (bear ears) ---
  home: {
    fill: `${EARS_ROOF}M6.5 9.3L12 4.6l5.5 4.7v9.2a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2z`,
    d: `${EARS_ROOF}M4.5 11L12 4.5l7.5 6.5M6.5 9.3v9.2a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V9.3M10.2 20.5v-3.3a1.8 1.8 0 0 1 3.6 0v3.3`,
  },
  calendar: {
    fill: `${EARS_Y7}${rr(4.5, 7, 15, 13.5, 2.5)}`,
    d: `${EARS_Y7}${rr(4.5, 7, 15, 13.5, 2.5)}M4.5 11h15${dot(8.5, 14.5)}${dot(12, 14.5)}${dot(15.5, 14.5)}${dot(8.5, 17.5)}${dot(12, 17.5)}`,
  },
  camera: {
    fill: `${EARS_CAMERA}${rr(3.5, 7.5, 17, 12.5, 3)}`,
    d: `${EARS_CAMERA}${rr(3.5, 7.5, 17, 12.5, 3)}${c(12, 13.6, 3.6)}M10.4 12.6a1.8 1.8 0 0 1 1.6-.9${dot(17.2, 10.4)}`,
  },
  settings: {
    fill: `${EARS_Y7}${rr(4, 7, 16, 13, 3)}`,
    d: `${EARS_Y7}${rr(4, 7, 16, 13, 3)}M8 11.5h8M8 16h8${c(14.5, 11.5, 1.7)}${c(9.5, 16, 1.7)}`,
  },
  bear: {
    fill: `${c(6.8, 7.2, 2.6)}${c(17.2, 7.2, 2.6)}${c(12, 13.2, 7.2)}`,
    d: `M4.6 8.6a2.6 2.6 0 1 1 3.9-3.3M15.5 5.3a2.6 2.6 0 1 1 3.9 3.3${c(12, 13.2, 7.2)}${dot(9.4, 12.2)}${dot(14.6, 12.2)}M11 15.2c.6.6 1.4.6 2 0`,
  },
  paw: {
    fill: `M12 12.5c-3 0-5.5 2.6-5.5 4.8 0 1.8 1.6 2.7 3.2 2.2.8-.2 1.5-.4 2.3-.4s1.5.2 2.3.4c1.6.5 3.2-.4 3.2-2.2 0-2.2-2.5-4.8-5.5-4.8z${c(5.5, 10.5, 1.8)}${c(9.2, 6.8, 1.9)}${c(14.8, 6.8, 1.9)}${c(18.5, 10.5, 1.8)}`,
    d: `M12 12.5c-3 0-5.5 2.6-5.5 4.8 0 1.8 1.6 2.7 3.2 2.2.8-.2 1.5-.4 2.3-.4s1.5.2 2.3.4c1.6.5 3.2-.4 3.2-2.2 0-2.2-2.5-4.8-5.5-4.8z${c(5.5, 10.5, 1.8)}${c(9.2, 6.8, 1.9)}${c(14.8, 6.8, 1.9)}${c(18.5, 10.5, 1.8)}`,
  },

  // --- actions ---
  plus: { d: 'M12 5.5v13M5.5 12h13' },
  minus: { d: 'M5.5 12h13' },
  close: { d: 'M7 7l10 10M17 7L7 17' },
  check: { d: 'M5.5 12.5l4.2 4.2 8.8-9' },
  chevronLeft: { d: 'M14.5 5.5L8 12l6.5 6.5' },
  chevronRight: { d: 'M9.5 5.5L16 12l-6.5 6.5' },
  pencil: {
    fill: 'M15.2 5.3l3.5 3.5L9 18.5l-4.4.9.9-4.4z',
    d: 'M15.2 5.3l3.5 3.5L9 18.5l-4.4.9.9-4.4zM13 7.5l3.5 3.5',
  },
  trash: {
    fill: 'M6.3 8h11.4l-.8 10.5a2 2 0 0 1-2 1.8H9.1a2 2 0 0 1-2-1.8z',
    d: 'M4.5 8h15M9.5 8V6a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 6v2M6.3 8l.8 10.5a2 2 0 0 0 2 1.8h5.8a2 2 0 0 0 2-1.8L17.7 8M10.2 11.5v5M13.8 11.5v5',
  },
  undo: { d: 'M9 14.5L4.5 10 9 5.5M4.5 10h10a5.2 5.2 0 0 1 0 10.5H11' },
  refresh: { d: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5V9H15' },
  qr: {
    fill: `${rr(4, 4, 6, 6, 1.5)}${rr(14, 4, 6, 6, 1.5)}${rr(4, 14, 6, 6, 1.5)}`,
    d: `${rr(4, 4, 6, 6, 1.5)}${rr(14, 4, 6, 6, 1.5)}${rr(4, 14, 6, 6, 1.5)}${dot(15, 15)}${dot(19, 15)}${dot(17, 17)}${dot(15, 19)}${dot(19, 19)}`,
  },
  image: {
    fill: rr(4, 5, 16, 14, 3),
    d: `${rr(4, 5, 16, 14, 3)}${c(9, 10, 1.6)}M5 17l4.5-4.5 3 3 2.5-2.5 4 4`,
  },
  sparkle: {
    fill: 'M11 4c.6 4 2.6 6 6.6 6.6-4 .6-6 2.6-6.6 6.6-.6-4-2.6-6-6.6-6.6 4-.6 6-2.6 6.6-6.6zM18.5 3.5c.2 1.1.8 1.7 1.9 1.9-1.1.2-1.7.8-1.9 1.9-.2-1.1-.8-1.7-1.9-1.9 1.1-.2 1.7-.8 1.9-1.9z',
    d: 'M11 4c.6 4 2.6 6 6.6 6.6-4 .6-6 2.6-6.6 6.6-.6-4-2.6-6-6.6-6.6 4-.6 6-2.6 6.6-6.6zM18.5 3.5c.2 1.1.8 1.7 1.9 1.9-1.1.2-1.7.8-1.9 1.9-.2-1.1-.8-1.7-1.9-1.9 1.1-.2 1.7-.8 1.9-1.9z',
  },
  download: {
    fill: 'M4.5 15.5h15V18a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z',
    d: 'M12 4v10.5M7.5 10l4.5 4.5 4.5-4.5M4.5 15.5V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2.5',
  },
  upload: {
    fill: 'M4.5 15.5h15V18a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z',
    d: 'M12 15V4.5M7.5 9L12 4.5 16.5 9M4.5 15.5V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2.5',
  },

  // --- feelings & decoration ---
  star: {
    fill: 'M12 3.8l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.6-5 2.6.9-5.6-4-4 5.6-.8z',
    d: 'M12 3.8l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.6-5 2.6.9-5.6-4-4 5.6-.8z',
  },
  heart: {
    fill: 'M12 19.5s-7.5-4.5-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.5-7.5 10-7.5 10z',
    d: 'M12 19.5s-7.5-4.5-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.5-7.5 10-7.5 10z',
  },
  party: {
    fill: 'M4 20l4.2-11.2 7 7z',
    d: `M4 20l4.2-11.2 7 7zM13.5 4.5c-.5 1.5.4 2.6 2 2.2M18 9.5c1.5-.6 2.6.3 2.3 1.8${dot(15.5, 3.5)}${dot(20, 6)}${dot(11, 6)}${dot(19.5, 14.5)}`,
  },
  snowflake: {
    fill: c(12, 12, 2.4),
    d: `M12 3.5v17M4.6 7.75l14.8 8.5M19.4 7.75l-14.8 8.5M10 4.8l2 1.6 2-1.6M10 19.2l2-1.6 2 1.6${c(12, 12, 2.4)}`,
  },
  drop: {
    fill: 'M12 3.8s6 6.2 6 10.4a6 6 0 0 1-12 0C6 10 12 3.8 12 3.8z',
    d: 'M12 3.8s6 6.2 6 10.4a6 6 0 0 1-12 0C6 10 12 3.8 12 3.8zM9.3 14.5a2.8 2.8 0 0 0 2.4 2.7',
  },
  target: {
    fill: c(12, 12, 8.5),
    d: `${c(12, 12, 8.5)}${c(12, 12, 5)}${c(12, 12, 1.5)}`,
  },
  cloud: {
    fill: 'M7.5 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18.4 10a4.3 4.3 0 0 1-.9 8.5z',
    d: 'M7.5 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18.4 10a4.3 4.3 0 0 1-.9 8.5z',
  },
  chart: {
    fill: `${rr(4, 12, 4.5, 8, 1.5)}${rr(9.75, 6.5, 4.5, 13.5, 1.5)}${rr(15.5, 9.5, 4.5, 10.5, 1.5)}`,
    d: `${rr(4, 12, 4.5, 8, 1.5)}${rr(9.75, 6.5, 4.5, 13.5, 1.5)}${rr(15.5, 9.5, 4.5, 10.5, 1.5)}`,
  },
  flame: {
    fill: 'M12 20.5a6 6 0 0 1-6-6c0-3.5 3-5.5 3.5-9 2 1.2 3 3 3 4.5 1-.7 1.6-1.8 1.8-3 2 1.8 3.7 4.5 3.7 7.5a6 6 0 0 1-6 6z',
    d: 'M12 20.5a6 6 0 0 1-6-6c0-3.5 3-5.5 3.5-9 2 1.2 3 3 3 4.5 1-.7 1.6-1.8 1.8-3 2 1.8 3.7 4.5 3.7 7.5a6 6 0 0 1-6 6zM12 20.5c-1.7 0-3-1.2-3-2.8 0-1.7 1.5-2.6 2-4 1.7 1 4 2.3 4 4 0 1.6-1.3 2.8-3 2.8z',
  },

  // --- meals ---
  sunrise: {
    fill: 'M7 17a5 5 0 0 1 10 0z',
    d: 'M7 17a5 5 0 0 1 10 0M3.5 17h17M12 6.5V9M5.8 10.8l1.4 1.4M18.2 10.8l-1.4 1.4M8.5 20.5h7',
  },
  sun: {
    fill: c(12, 12, 4),
    d: `${c(12, 12, 4)}M12 3v1.8M12 19.2V21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M3 12h1.8M19.2 12H21M5.6 18.4l1.3-1.3M17.1 6.9l1.3-1.3`,
  },
  moon: {
    fill: 'M20 13.6A8 8 0 1 1 10.4 4a6.2 6.2 0 0 0 9.6 9.6z',
    d: 'M20 13.6A8 8 0 1 1 10.4 4a6.2 6.2 0 0 0 9.6 9.6z',
  },
  cookie: {
    fill: 'M20.5 12A8.5 8.5 0 1 1 12 3.5a2.8 2.8 0 0 0 3.5 3.5 2.8 2.8 0 0 0 5 5z',
    d: `M20.5 12A8.5 8.5 0 1 1 12 3.5a2.8 2.8 0 0 0 3.5 3.5 2.8 2.8 0 0 0 5 5z${dot(9, 9.5)}${dot(8.5, 14.5)}${dot(13, 13)}${dot(15, 16.5)}`,
  },
  bowl: {
    fill: 'M3.5 11.5h17a8.5 8.5 0 0 1-17 0z',
    d: 'M3.5 11.5h17a8.5 8.5 0 0 1-17 0zM9 8.2c0-1.2 1.2-1.6 1.2-2.8M13.5 8.2c0-1.2 1.2-1.6 1.2-2.8',
  },

  // --- people ---
  male: {
    fill: c(10, 14, 5.5),
    d: `${c(10, 14, 5.5)}M14 10l5.5-5.5M15 4.5h4.5V9`,
  },
  female: {
    fill: c(12, 9.5, 5.5),
    d: `${c(12, 9.5, 5.5)}M12 15v6M9 18.5h6`,
  },
} satisfies Record<string, Glyph>;

export type IconName = keyof typeof GLYPHS;

interface Props {
  name: IconName;
  size?: number;
  /** Any CSS color; defaults to the surrounding text color. */
  tone?: string;
  className?: string;
  strokeWidth?: number;
  label?: string;
}

export function Icon({ name, size = 22, tone, className, strokeWidth = 1.8, label }: Props) {
  const g: Glyph = GLYPHS[name];
  return (
    <svg
      className={`icon ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={tone ? { color: tone } : undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {g.fill && <path className="icon-fill" d={g.fill} stroke="none" />}
      <path d={g.d} />
    </svg>
  );
}
