import { useState } from 'react';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { useEntriesForDates, useSettings, useToday } from '../hooks';
import { addDays, formatDateLong, formatWeekdayShort, lastNDays } from '../lib/date';
import { summarizeWeek } from '../lib/summary';

export function WeekView() {
  const today = useToday();
  const [end, setEnd] = useState(today);
  const settings = useSettings();
  const dates = lastNDays(end, 7);
  const entries = useEntriesForDates(dates);
  const week = summarizeWeek(entries, end, settings.dailyTarget);

  return (
    <div className="view">
      <div className="date-nav">
        <button className="icon-btn" onClick={() => setEnd(addDays(end, -7))} aria-label="Minggu sebelumnya">
          ‹
        </button>
        <button className="date-label" onClick={() => setEnd(today)} disabled={end === today}>
          {end === today ? '7 hari terakhir' : `${formatDateLong(dates[0]!)} – ${formatDateLong(end)}`}
        </button>
        <button
          className="icon-btn"
          onClick={() => setEnd(addDays(end, 7) > today ? today : addDays(end, 7))}
          disabled={end === today}
          aria-label="Minggu berikutnya"
        >
          ›
        </button>
      </div>

      <section className="card" key={end}>
        <WeekChart days={week.days} target={week.target} today={today} />
      </section>

      <section className="stat-grid">
        <div className="card stat">
          <span>Rata-rata / hari</span>
          <strong>
            <AnimatedNumber value={week.averageLoggedDays} />
          </strong>
          <small>dari {week.loggedDays} hari tercatat</small>
        </div>
        <div className="card stat">
          <span>Total 7 hari</span>
          <strong>
            <AnimatedNumber value={week.total} />
          </strong>
          <small>kkal</small>
        </div>
        <div className="card stat">
          <span>Di atas target</span>
          <strong>
            <AnimatedNumber value={week.daysOverTarget} />
          </strong>
          <small>hari</small>
        </div>
        <div className="card stat">
          <span>Target harian</span>
          <strong>{week.target.toLocaleString('id-ID')}</strong>
          <small>kkal</small>
        </div>
      </section>
    </div>
  );
}

function WeekChart({ days, target, today }: { days: { date: string; total: number }[]; target: number; today: string }) {
  const W = 320;
  const H = 180;
  const top = 16;
  const bottom = 24;
  const max = Math.max(target, ...days.map((d) => d.total), 1) * 1.1;
  const y = (v: number) => top + (H - top - bottom) * (1 - v / max);
  const slot = W / days.length;
  const barW = slot * 0.56;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="week-chart" role="img" aria-label="Kalori per hari, 7 hari">
      {days.map((d, i) => {
        const x = i * slot + (slot - barW) / 2;
        const h = H - bottom - y(d.total);
        const over = target > 0 && d.total > target;
        return (
          <g key={d.date}>
            <title>{`${formatDateLong(d.date)}: ${d.total} kkal`}</title>
            <rect
              className="bar"
              style={{ animationDelay: `${i * 50}ms` }}
              x={x}
              y={y(d.total)}
              width={barW}
              height={Math.max(h, 0)}
              rx={6}
              fill={over ? 'var(--danger)' : 'var(--accent)'}
              opacity={d.total === 0 ? 0 : 1}
            />
            {d.total > 0 && (
              <text x={x + barW / 2} y={y(d.total) - 4} textAnchor="middle" className="bar-value">
                {d.total >= 1000 ? `${(d.total / 1000).toFixed(1)}k` : d.total}
              </text>
            )}
            <text
              x={x + barW / 2}
              y={H - 6}
              textAnchor="middle"
              className={`bar-label ${d.date === today ? 'today' : ''}`}
            >
              {formatWeekdayShort(d.date)}
            </text>
          </g>
        );
      })}
      {target > 0 && (
        <g>
          <line x1={0} x2={W} y1={y(target)} y2={y(target)} className="target-line" />
          <text x={W - 2} y={y(target) - 4} textAnchor="end" className="target-label">
            target
          </text>
        </g>
      )}
    </svg>
  );
}
