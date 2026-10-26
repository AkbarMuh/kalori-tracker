import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { isAiReady, loadAiConfig } from '../ai/config';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { Icon } from '../components/Icon';
import { PolarBear } from '../components/PolarBear';
import { ProgressRing } from '../components/ProgressRing';
import { Sheet } from '../components/Sheet';
import { SnowBurst } from '../components/SnowBurst';
import { SwipeRow } from '../components/SwipeRow';
import { addEntries, onEntriesAdded, saveFavorite, setEntriesDeleted, updateEntry } from '../db/repo';
import { MEAL_LABELS, MEAL_SHORT_LABELS, MEAL_TYPES, type FoodEntry, type MealType } from '../db/schema';
import { useEntriesForDates, useFavorites, usePhotos, useSettings } from '../hooks';
import { addDays, defaultMealForTime, formatDateLong, formatTime, timeOnDate } from '../lib/date';
import { classifySwipe } from '../lib/gesture';
import { haptic } from '../lib/haptics';
import { MASCOT_NAME, mascotMessage, moodFor, pickPokeLine } from '../lib/mascot';
import { summarizeDay } from '../lib/summary';
import { showToast } from '../lib/toast';
import { useCamera } from './Camera';
import { EntryForm } from './EntryForm';
import { InstallBanner } from './Install';
import { MEAL_ICON, MEAL_TONE, MOOD_ICON } from './meals';

type SheetState = { kind: 'add'; meal: MealType } | { kind: 'edit'; entry: FoodEntry } | null;

interface Props {
  date: string;
  today: string;
  onDateChange: (date: string) => void;
}

export function TodayView({ date, today, onDateChange }: Props) {
  const settings = useSettings();
  const entries = useEntriesForDates([date]);
  const photos = usePhotos(entries.map((e) => e.id));
  const camera = useCamera();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const [slide, setSlide] = useState<'from-left' | 'from-right' | ''>('');

  const summary = summarizeDay(entries, date, settings.dailyTarget);
  const mood = moodFor(summary.total, settings.dailyTarget);
  const suggestedMeal = defaultMealForTime(new Date());
  const isToday = date === today;

  // --- "nyam" reaction whenever food is added for the day on screen (camera, manual, favorites) ---
  const [eatTick, setEatTick] = useState(0);
  const [eating, setEating] = useState(false);
  const eatTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef({ date, total: summary.total, target: settings.dailyTarget });
  useEffect(() => {
    latest.current = { date, total: summary.total, target: settings.dailyTarget };
  });

  const playEat = useCallback(() => {
    setEatTick((n) => n + 1);
    setEating(true);
    clearTimeout(eatTimer.current);
    eatTimer.current = setTimeout(() => setEating(false), 1100);
  }, []);

  useEffect(
    () =>
      onEntriesAdded((added) => {
        const { date: shown, total, target } = latest.current;
        const forShown = added.filter((e) => e.date === shown);
        if (forShown.length === 0) return;
        playEat();
        const after = total + forShown.reduce((s, e) => s + e.calories, 0);
        if (moodFor(after, target) === 'proud' && moodFor(total, target) !== 'proud') haptic([20, 40, 20]);
      }),
    [playEat],
  );
  useEffect(() => () => clearTimeout(eatTimer.current), []);

  // --- tap Salju ---
  const [poke, setPoke] = useState<{ tick: number; line: string } | null>(null);
  const pokeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(pokeTimer.current), []);
  function pokeBear() {
    haptic(10);
    setPoke((p) => ({ tick: (p?.tick ?? 0) + 1, line: pickPokeLine(mood, Math.random(), p?.line) }));
    clearTimeout(pokeTimer.current);
    pokeTimer.current = setTimeout(() => setPoke(null), 2600);
  }

  // --- change day: arrows or swipe on the summary card ---
  function goTo(next: string) {
    if (next > today) return;
    setSlide(next > date ? 'from-right' : 'from-left');
    onDateChange(next);
  }
  const swipeStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const swiped = useRef(false);
  function onSwipeDown(e: PointerEvent) {
    swipeStart.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    swiped.current = false;
  }
  function onSwipeUp(e: PointerEvent) {
    const s = swipeStart.current;
    swipeStart.current = null;
    if (!s) return;
    const dir = classifySwipe(e.clientX - s.x, e.clientY - s.y, e.timeStamp - s.t);
    if (!dir) return;
    swiped.current = true;
    haptic(6);
    goTo(addDays(date, dir === 'left' ? 1 : -1));
  }

  // --- entries ---
  const newEntryBase = () => ({ date, time: isToday ? new Date().toISOString() : timeOnDate(date, new Date()) });

  async function quickAdd(name: string, calories: number, meal: MealType) {
    await addEntries([{ ...newEntryBase(), name, calories, meal, source: 'favorite' }]);
    setSheet(null);
  }

  function remove(entry: FoodEntry) {
    haptic(8);
    setLeaving((s) => new Set(s).add(entry.id));
    setTimeout(() => void setEntriesDeleted([entry.id], true), 220);
    showToast({
      icon: 'trash',
      message: `“${entry.name}” dihapus`,
      actions: [
        {
          label: 'Urungkan',
          icon: 'undo',
          onClick: () => {
            setLeaving((s) => {
              const next = new Set(s);
              next.delete(entry.id);
              return next;
            });
            void setEntriesDeleted([entry.id], false);
          },
        },
      ],
    });
  }

  const byMeal = MEAL_TYPES.map((meal) => ({
    meal,
    items: entries.filter((e) => e.meal === meal).sort((a, b) => a.time.localeCompare(b.time)),
  }));

  return (
    <div className="view">
      <InstallBanner />
      <div className="date-nav">
        <button className="icon-btn" onClick={() => goTo(addDays(date, -1))} aria-label="Hari sebelumnya">
          <Icon name="chevronLeft" />
        </button>
        <button className="date-label" onClick={() => goTo(today)} disabled={isToday}>
          {isToday ? 'Hari ini' : formatDateLong(date)}
          <small>{isToday ? formatDateLong(date) : 'Ketuk untuk kembali ke hari ini'}</small>
        </button>
        <button
          className="icon-btn"
          onClick={() => goTo(addDays(date, 1))}
          disabled={isToday}
          aria-label="Hari berikutnya"
        >
          <Icon name="chevronRight" />
        </button>
      </div>

      <section
        className={`card hero ${slide}`}
        key={date}
        onPointerDown={onSwipeDown}
        onPointerUp={onSwipeUp}
        onPointerCancel={() => (swipeStart.current = null)}
      >
        {mood === 'proud' && <SnowBurst key={`burst-${summary.total}`} />}
        <div className="ring-wrap">
          <ProgressRing progress={summary.progress} size={230} />
          <button
            className="ring-center bear-btn"
            onClick={() => {
              if (!swiped.current) pokeBear();
            }}
            aria-label={`Sentuh ${MASCOT_NAME}`}
          >
            <PolarBear
              mood={mood}
              eating={eating}
              poked={poke !== null}
              fishing={summary.total === 0}
              key={`bear-${eatTick}`}
              size={150}
            />
          </button>
          {poke && (
            <div className="float-hearts" key={poke.tick} aria-hidden>
              <Icon name="heart" tone="#ff8fab" size={18} />
              <Icon name="heart" tone="#ffb3c6" size={24} />
              <Icon name="snowflake" tone="#7cc8f2" size={16} />
            </div>
          )}
        </div>
        <div className="total-line">
          <strong>
            <AnimatedNumber value={summary.total} />
          </strong>
          <span>/ {settings.dailyTarget.toLocaleString('id-ID')} kkal</span>
        </div>
        <p className={`speech ${mood === 'stuffed' && !poke ? 'over' : ''}`} key={poke ? `poke-${poke.tick}` : mood}>
          <Icon name={poke ? 'heart' : MOOD_ICON[mood]} size={18} />
          {poke ? poke.line : mascotMessage(mood, summary.total, settings.dailyTarget)}
        </p>
        <div className="meal-grid">
          {MEAL_TYPES.map((m) => (
            <button key={m} className="meal-stat" onClick={() => setSheet({ kind: 'add', meal: m })}>
              <span className="meal-stat-head">
                <Icon name={MEAL_ICON[m]} tone={MEAL_TONE[m]} size={18} />
                {MEAL_SHORT_LABELS[m]}
              </span>
              <strong>
                <AnimatedNumber value={summary.byMeal[m]} />
              </strong>
              <div className="mini-bar">
                <div
                  style={{
                    width: `${summary.total > 0 ? (summary.byMeal[m] / summary.total) * 100 : 0}%`,
                    background: MEAL_TONE[m],
                  }}
                />
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="quick-actions">
        <button onClick={() => setSheet({ kind: 'add', meal: suggestedMeal })}>
          <Icon name="pencil" size={18} />
          Catat manual
        </button>
        <button onClick={camera.pickFromGallery}>
          <Icon name="image" size={18} />
          Dari galeri
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="empty card">
          <Icon name="camera" size={34} tone="var(--accent)" />
          <p>Belum ada catatan{isToday ? ' hari ini' : ''}.</p>
          <p className="muted">Foto makananmu pakai tombol kamera, {MASCOT_NAME} yang hitung kalorinya.</p>
        </div>
      ) : (
        byMeal
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <section key={g.meal}>
              <h2 className="section-title">
                <span className="section-title-name">
                  <Icon name={MEAL_ICON[g.meal]} tone={MEAL_TONE[g.meal]} size={18} />
                  {MEAL_LABELS[g.meal]}
                </span>
                <span>{summary.byMeal[g.meal].toLocaleString('id-ID')} kkal</span>
              </h2>
              <ul className="entry-list">
                {g.items.map((e) => (
                  <li key={e.id} className={leaving.has(e.id) ? 'leaving' : ''}>
                    <SwipeRow onOpen={() => setSheet({ kind: 'edit', entry: e })} onDelete={() => remove(e)}>
                      {photos.get(e.id) ? (
                        <img className="entry-thumb" src={photos.get(e.id)} alt="" />
                      ) : (
                        <span className="entry-thumb placeholder" style={{ color: MEAL_TONE[e.meal] }}>
                          <Icon name={e.source === 'ai' ? 'sparkle' : e.source === 'favorite' ? 'star' : MEAL_ICON[e.meal]} size={20} />
                        </span>
                      )}
                      <span className="entry-name">
                        <span>{e.name}</span>
                        <small>
                          {formatTime(e.time)}
                          {e.source === 'ai' && ' · tebakan AI'}
                        </small>
                      </span>
                      <span className="entry-kcal">{e.calories.toLocaleString('id-ID')} kkal</span>
                    </SwipeRow>
                  </li>
                ))}
              </ul>
            </section>
          ))
      )}
      {entries.length > 0 && <p className="hint">Geser makanan ke kiri untuk menghapus</p>}

      {sheet?.kind === 'add' && (
        <Sheet title={`Catat ${MEAL_LABELS[sheet.meal].toLowerCase()}`} onClose={() => setSheet(null)}>
          <AddSheet
            meal={sheet.meal}
            onQuickAdd={quickAdd}
            onSubmit={async (v) => {
              await addEntries([{ ...newEntryBase(), name: v.name, calories: v.calories, meal: v.meal, source: 'manual' }]);
              if (v.saveFavorite) await saveFavorite({ name: v.name, calories: v.calories, defaultMeal: v.meal });
              setSheet(null);
            }}
            onAiText={(text) => {
              setSheet(null);
              camera.analyzeText(text);
            }}
            onGallery={() => {
              setSheet(null);
              camera.pickFromGallery();
            }}
          />
        </Sheet>
      )}

      {sheet?.kind === 'edit' && (
        <Sheet title="Ubah catatan" onClose={() => setSheet(null)}>
          {photos.get(sheet.entry.id) && <img className="editor-photo" src={photos.get(sheet.entry.id)} alt="" />}
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
                remove(sheet.entry);
                setSheet(null);
              }}
            >
              <Icon name="trash" size={18} />
              Hapus
            </button>
            <button
              onClick={async () => {
                await saveFavorite({ name: sheet.entry.name, calories: sheet.entry.calories, defaultMeal: sheet.entry.meal });
                setSheet(null);
                showToast({ icon: 'star', message: `“${sheet.entry.name}” jadi favorit` }, 2500);
              }}
            >
              <Icon name="star" size={18} tone="#eaa915" />
              Jadikan favorit
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

interface AddSheetProps {
  meal: MealType;
  onQuickAdd: (name: string, calories: number, meal: MealType) => void;
  onSubmit: Parameters<typeof EntryForm>[0]['onSubmit'];
  onAiText: (text: string) => void;
  onGallery: () => void;
}

function AddSheet({ meal, onQuickAdd, onSubmit, onAiText, onGallery }: AddSheetProps) {
  const favorites = useFavorites();
  const [text, setText] = useState('');
  const hasAi = isAiReady(loadAiConfig());

  return (
    <>
      {favorites.length > 0 && (
        <div>
          <h3 className="sheet-subtitle">
            <Icon name="star" size={16} tone="#eaa915" />
            Favorit
          </h3>
          <div className="chips">
            {favorites.map((f) => (
              <button key={f.id} className="chip" onClick={() => onQuickAdd(f.name, f.calories, meal)}>
                {f.name} <small>{f.calories}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <EntryForm initial={{ meal }} submitLabel="Tambah" showFavoriteToggle onSubmit={onSubmit} />

      <div className="ai-box">
        <div className="divider">
          <span>atau biar {MASCOT_NAME} yang tebak</span>
        </div>
        <textarea
          placeholder="Ceritakan makananmu, mis. nasi padang rendang + es teh manis"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
        />
        <div className="row actions">
          <button onClick={() => onAiText(text)} disabled={!text.trim()}>
            <Icon name="sparkle" size={18} tone="#8b7cf6" />
            Tebak dari teks
          </button>
          <button onClick={onGallery}>
            <Icon name="image" size={18} />
            Pilih foto
          </button>
        </div>
        {!hasAi && <p className="muted small">AI belum tersambung; akan diminta saat pertama dipakai.</p>}
      </div>
    </>
  );
}
