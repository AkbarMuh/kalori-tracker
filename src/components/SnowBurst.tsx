const FLAKES = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i * 113) % 900,
  duration: 1400 + ((i * 271) % 900),
  size: 10 + ((i * 7) % 10),
}));

/** One-shot snowflake confetti; remount (change `key`) to replay. */
export function SnowBurst() {
  return (
    <div className="snow-burst" aria-hidden>
      {FLAKES.map((f, i) => (
        <span
          key={i}
          style={{
            left: `${f.left}%`,
            fontSize: f.size,
            animationDelay: `${f.delay}ms`,
            animationDuration: `${f.duration}ms`,
          }}
        >
          ❄
        </span>
      ))}
    </div>
  );
}
