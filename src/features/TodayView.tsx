import { useEffect, useRef, useState } from 'react';
import { AiError, estimateFood, loadApiKey, photoToBase64, type Estimate } from '../ai/estimate';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { PolarBear } from '../components/PolarBear';
import { ProgressRing } from '../components/ProgressRing';
import { Sheet } from '../components/Sheet';
import { SnowBurst } from '../components/SnowBurst';
import { addEntries, deleteEntry, saveFavorite, updateEntry } from '../db/repo';
import { MEAL_LABELS, MEAL_SHORT_LABELS, MEAL_TYPES, type FoodEntry, type MealType } from '../db/schema';
import { useEntriesForDates, useFavorites, useSettings, useToday } from '../hooks';
import { addDays, defaultMealForTime, formatDateLong, formatTime, timeOnDate } from '../lib/date';
import { mascotMessage, moodFor } from '../lib/mascot';
import { summarizeDay } from '../lib/summary';
import { AiReview } from './AiReview';
import { EntryForm } from './EntryForm';

type SheetState = { kind: 'add' } | { kind: 'edit'; entry: FoodEntry } | { kind: 'ai'; estimate: Estimate } | null;

export function TodayView() {
  const today = useToday();
  const [date, setDate] = useState(today);
  const settings = useSettings();
  const entries = useEntriesForDates([date]);
  const favorites = useFavorites();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [leaving, setLeaving] = useState<Set<string>>(new Set());

  const summary = summarizeDay(entries, date, settings.dailyTarget);
  const mood = moodFor(summary.total, settings.dailyTarget);
  const suggestedMeal = defaultMealForTime(new Date());
  const isToday = date === today;

  // "nyam" animation, played after the user adds food on this screen.
  const [eatTick, setEatTick] = useState(0);
  const [eating, setEating] = useState(false);
  const eatTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(eatTimer.current), []);

  function playEat() {
    setEatTick((n) => n + 1);
    setEating(true);
    clearTimeout(eatTimer.current);
    eatTimer.current = setTimeout(() => setEating(false), 1100);
  }

  const newEntryBase = () => ({ date, time: isToday ? new Date().toISOString() : timeOnDate(date, new Date()) });

  async function add(items: Parameters<typeof addEntries>[0]) {
    await addEntries(items);
    playEat();
  }

  async function quickAdd(name: string, calories: number, meal: MealType) {
    await add([{ ...newEntryBase(), name, calories, meal, source: 'favorite' }]);
  }

  async function remove(id: string) {
    setLeaving((s) => new Set(s).add(id));
    setTimeout(() => void deleteEntry(id), 220);
  }

  const byMeal = MEAL_TYPES.map((meal) => ({
    meal,
    items: entries.filter((e) => e.meal === meal).sort((a, b) => a.time.localeCompare(b.time)),
  }));

  return (
    <div className="view">
      <div className="date-nav">
        <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Hari sebelumnya">
          ‹
        </button>
        <button className="date-label" onClick={() => setDate(today)} disabled={isToday}>
          {isToday ? 'Hari ini' : formatDateLong(date)}
          {isToday && <small>{formatDateLong(date)}</small>}
        </button>
        <button
          className="icon-btn"
          onClick={() => setDate(addDays(date, 1))}
          disabled={isToday}
          aria-label="Hari berikutnya"
        >
          ›
        </button>
      </div>

      <section className="card hero" key={date}>
        {mood === 'proud' && <SnowBurst key={`burst-${summary.total}`} />}
        <div className="ring-wrap">
          <ProgressRing progress={summary.progress} size={230} />
          <div className="ring-center">
            <PolarBear
              mood={mood}
              eating={eating}
              fishing={summary.total === 0}
              key={`bear-${eatTick}`}
              size={150}
            />
          </div>
        </div>
        <div className="total-line">
          <strong>
            <AnimatedNumber value={summary.total} />
          </strong>
          <span>/ {settings.dailyTarget.toLocaleString('id-ID')} kkal</span>
        </div>
        <p className={`speech ${mood === 'stuffed' ? 'over' : ''}`} key={mood}>
          {mascotMessage(mood, summary.total, settings.dailyTarget)}
        </p>
        <div className="meal-grid">
          {MEAL_TYPES.map((m) => (
            <div key={m} className="meal-stat">
              <span>{MEAL_SHORT_LABELS[m]}</span>
              <strong>
                <AnimatedNumber value={summary.byMeal[m]} />
              </strong>
              <div className="mini-bar">
                <div
                  style={{
                    width: `${summary.total > 0 ? (summary.byMeal[m] / summary.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {favorites.length > 0 && (
        <section>
          <h2 className="section-title">Tambah cepat</h2>
          <div className="chips">
            {favorites.map((f) => (
              <button
                key={f.id}
                className="chip"
                onClick={() => quickAdd(f.name, f.calories, f.defaultMeal ?? suggestedMeal)}
              >
                {f.name} <small>{f.calories}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {entries.length === 0 ? (
        <div className="empty">
          <p>Belum ada catatan{isToday ? ' hari ini' : ''}.</p>
          <p className="muted">Tekan + untuk menambah makanan.</p>
        </div>
      ) : (
        byMeal
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <section key={g.meal}>
              <h2 className="section-title">
                {MEAL_LABELS[g.meal]} <span>{summary.byMeal[g.meal]} kkal</span>
              </h2>
              <ul className="entry-list">
                {g.items.map((e) => (
                  <li key={e.id} className={leaving.has(e.id) ? 'leaving' : ''}>
                    <button className="entry" onClick={() => setSheet({ kind: 'edit', entry: e })}>
                      <span className="entry-name">
                        <span>
                          {e.source === 'ai' && <span title="Dari AI">✨ </span>}
                          {e.name}
                        </span>
                        <small>{formatTime(e.time)}</small>
                      </span>
                      <span className="entry-kcal">{e.calories} kkal</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
      )}

      <button className="fab" onClick={() => setSheet({ kind: 'add' })} aria-label="Tambah makanan">
        +
      </button>

      {sheet?.kind === 'add' && (
        <Sheet title="Tambah makanan" onClose={() => setSheet(null)}>
          <EntryForm
            initial={{ meal: suggestedMeal }}
            submitLabel="Tambah"
            showFavoriteToggle
            onSubmit={async (v) => {
              await add([{ ...newEntryBase(), name: v.name, calories: v.calories, meal: v.meal, source: 'manual' }]);
              if (v.saveFavorite) await saveFavorite({ name: v.name, calories: v.calories, defaultMeal: v.meal });
              setSheet(null);
            }}
          />
          <AiButtons mealHint={MEAL_LABELS[suggestedMeal]} onResult={(estimate) => setSheet({ kind: 'ai', estimate })} />
        </Sheet>
      )}

      {sheet?.kind === 'ai' && (
        <Sheet title="Periksa hasil AI" onClose={() => setSheet(null)}>
          <AiReview
            estimate={sheet.estimate}
            onCancel={() => setSheet(null)}
            onConfirm={async (items) => {
              const base = newEntryBase();
              await add(items.map((i) => ({ ...base, ...i, source: 'ai' as const })));
              setSheet(null);
            }}
          />
        </Sheet>
      )}

      {sheet?.kind === 'edit' && (
        <Sheet title="Ubah catatan" onClose={() => setSheet(null)}>
          <EntryForm
            initial={sheet.entry}
            submitLabel="Simpan"
            onCancel={() => setSheet(null)}
            onSubmit={async (v) => {
              await updateEntry(sheet.entry.id, { name: v.name, calories: v.calories, meal: v.meal });
              setSheet(null);
            }}
          />
          <div className="row actions">
            <button
              className="danger"
              onClick={() => {
                void remove(sheet.entry.id);
                setSheet(null);
              }}
            >
              Hapus
            </button>
            <button
              onClick={async () => {
                await saveFavorite({ name: sheet.entry.name, calories: sheet.entry.calories, defaultMeal: sheet.entry.meal });
                setSheet(null);
              }}
            >
              ⭐ Jadikan favorit
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function AiButtons({ mealHint, onResult }: { mealHint: string; onResult: (e: Estimate) => void }) {
  const apiKey = loadApiKey();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!apiKey) {
    return (
      <p className="muted ai-hint">
        ✨ Isi API key Anthropic di Pengaturan untuk menebak kalori dari foto atau teks.
      </p>
    );
  }

  async function run(input: { text?: string; file?: File }) {
    setBusy(true);
    setError(null);
    try {
      const imageBase64 = input.file ? await photoToBase64(input.file) : undefined;
      onResult(await estimateFood(apiKey!, { text: input.text, imageBase64, mealHint }));
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Gagal memproses. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ai-box">
      <div className="divider">
        <span>atau pakai AI</span>
      </div>
      <textarea
        placeholder="Ceritakan makananmu, mis. nasi padang rendang + sayur nangka, es teh manis"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        disabled={busy}
      />
      <div className="row actions">
        <button onClick={() => run({ text })} disabled={busy || !text.trim()}>
          ✨ Tebak dari teks
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={busy}>
          📷 Foto
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void run({ file, text });
          }}
        />
      </div>
      {busy && (
        <p className="muted shimmer-text" role="status">
          Menganalisis makanan…
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
