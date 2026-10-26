import { useState } from 'react';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { Icon } from '../components/Icon';
import { PolarBear } from '../components/PolarBear';
import { useEntriesForDates, useSettings, useToday } from '../hooks';
import { addDays, formatDateLong, formatWeekdayShort, lastNDays } from '../lib/date';
import { haptic } from '../lib/haptics';
import { moodFor } from '../lib/mascot';
import { recentDays, summarizeWeek } from '../lib/summary';

const RECENT_DAYS = 30;

export function HistoryView({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const today = useToday();
  const [end, setEnd] = useState(today);
  const [selected, setSelected] = useState<string | null>(null);
  const settings = useSettings();
  const dates = lastNDays(end, 7);
  const weekEntries = useEntriesForDates(dates);
  const week = summarizeWeek(weekEntries, end, settings.dailyTarget);
  const recent = recentDays(useEntriesForDates(lastNDays(today, RECENT_DAYS)), today, RECENT_DAYS);

  const selectedDay = week.days.find((d) => d.date === selected);

  function shiftWeek(days: number) {
    const next = addDays(end, days);
    setEnd(next > today ? today : next);
    setSelected(null);
  }

  return (
    <div className="view">
      <div className="date-nav">
        <button className="icon-btn" onClick={() => shiftWeek(-7)} aria-label="Minggu sebelumnya">
          <Icon name="chevronLeft" />
        </button>
        <button
          className="date-label"
          onClick={() => {
            setEnd(today);
            setSelected(null);
          }}
          disabled={end === today}
        >
          {end === today ? '7 hari terakhir' : `${formatDateLong(dates[0]!)} – ${formatDateLong(end)}`}
          <small>Ketuk batang untuk detail</small>
        </button>
        <button className="icon-btn" onClick={() => shiftWeek(7)} disabled={end === today} aria-label="Minggu berikutnya">
          <Icon name="chevronRight" />
        </button>
      </div>

      <section className="card" key={end}>
        <p className={`chart-callout ${selectedDay ? 'on' : ''}`}>
          {selectedDay ? (
            <>
              <b>{formatDateLong(selectedDay.date)}</b> · {selectedDay.total.toLocaleString('id-ID')} kkal
              {settings.dailyTarget > 0 && selectedDay.total > 0 && (
                <span className={selectedDay.total > settings.dailyTarget ? 'over' : 'ok'}>
                  {selectedDay.total > settings.dailyTarget
                    ? ` · lebih ${(selectedDay.total - settings.dailyTarget).toLocaleString('id-ID')}`
                    : ` · sisa ${(settings.dailyTarget - selectedDay.total).toLocaleString('id-ID')}`}
                </span>
              )}
              {selectedDay.total > 0 && (
                <button className="link-btn inline" onClick={() => onOpenDay(selectedDay.date)}>
                  Lihat
                </button>
              )}
            </>
          ) : (
            'Rata-rata harian dibanding target'
          )}
        </p>
        <WeekChart
          days={week.days}
          target={week.target}
          today={today}
          selected={selected}
          onSelect={(d) => {
            haptic(6);
            setSelected((s) => (s === d ? null : d));
          }}
        />
      </section>

      <section className="stat-grid">
        <Stat icon="flame" tone="#f59e5b" label="Rata-rata / hari" value={week.averageLoggedDays} sub={`dari ${week.loggedDays} hari tercatat`} />
        <Stat icon="chart" tone="var(--accent)" label="Total 7 hari" value={week.total} sub="kkal" />
        <Stat icon="drop" tone="#e5484d" label="Di atas target" value={week.daysOverTarget} sub="hari" />
        <Stat icon="target" tone="#8b7cf6" label="Target harian" value={week.target} sub="kkal" />
      </section>

      <section>
        <h2 className="section-title">
          <span className="section-title-name">
            <Icon name="calendar" size={18} tone="var(--accent)" />
            Hari-hari terakhir
          </span>
        </h2>
        {recent.length === 0 ? (
          <p className="muted empty-line">Belum ada riwayat. Foto makanan pertamamu dulu!</p>
        ) : (
          <ul className="entry-list">
            {recent.map((d) => {
              const mood = moodFor(d.total, settings.dailyTarget);
              const pct = settings.dailyTarget > 0 ? Math.min(1, d.total / settings.dailyTarget) : 0;
              return (
                <li key={d.date}>
                  <button className="entry day-row" onClick={() => onOpenDay(d.date)}>
                    <PolarBear mood={mood} still size={44} />
                    <span className="entry-name">
                      <span>{d.date === today ? 'Hari ini' : formatDateLong(d.date)}</span>
                      <span className="mini-bar wide">
                        <span
                          style={{ width: `${pct * 100}%`, background: mood === 'stuffed' ? 'var(--danger)' : undefined }}
                        />
                      </span>
                    </span>
                    <span className="entry-kcal">{d.total.toLocaleString('id-ID')} kkal</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat(props: { icon: Parameters<typeof Icon>[0]['name']; tone: string; label: string; value: number; sub: string }) {
  return (
    <div className="card stat">
      <span className="stat-label">
        <Icon name={props.icon} size={18} tone={props.tone} />
        {props.label}
      </span>
      <strong>
        <AnimatedNumber value={props.value} />
      </strong>
      <small>{props.sub}</small>
    </div>
  );
}

interface ChartProps {
  days: { date: string; total: number }[];
  target: number;
  today: string;
  selected: string | null;
  onSelect: (date: string) => void;
}

function WeekChart({ days, target, today, selected, onSelect }: ChartProps) {
  const W = 320;
  const H = 180;
  const top = 18;
  const bottom = 24;
  const max = Math.max(target, ...days.map((d) => d.total), 1) * 1.1;
  const y = (v: number) => top + (H - top - bottom) * (1 - v / max);
  const slot = W / days.length;
  const barW = slot * 0.56;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="week-chart" role="img" aria-label="Kalori per hari, 7 hari">
      {target > 0 && (
        <g>
          <line x1={0} x2={W} y1={y(target)} y2={y(target)} className="target-line" />
          <text x={W - 2} y={y(target) - 4} textAnchor="end" className="target-label">
            target
          </text>
        </g>
      )}
      {days.map((d, i) => {
        const x = i * slot + (slot - barW) / 2;
        const over = target > 0 && d.total > target;
        const isSel = selected === d.date;
        return (
          <g
            key={d.date}
            className={`bar-group ${isSel ? 'selected' : ''} ${selected && !isSel ? 'dim' : ''}`}
            onClick={() => onSelect(d.date)}
            role="button"
            aria-label={`${formatDateLong(d.date)}: ${d.total} kkal`}
          >
            {/* full-height hit area so short bars are easy to tap */}
            <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
            <rect
              className="bar"
              style={{ animationDelay: `${i * 50}ms` }}
              x={x}
              y={y(d.total)}
              width={barW}
              height={Math.max(H - bottom - y(d.total), 0)}
              rx={7}
              fill={over ? 'var(--danger)' : 'var(--accent)'}
              opacity={d.total === 0 ? 0 : 1}
            />
            {d.total > 0 && (
              <text x={x + barW / 2} y={y(d.total) - 5} textAnchor="middle" className="bar-value">
                {d.total >= 1000 ? `${(d.total / 1000).toFixed(1)}k` : d.total}
              </text>
            )}
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" className={`bar-label ${d.date === today ? 'today' : ''}`}>
              {formatWeekdayShort(d.date)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
