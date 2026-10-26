import { useState, type FormEvent } from 'react';
import { MEAL_LABELS, MEAL_TYPES, type MealType } from '../db/schema';

export interface EntryFormValues {
  name: string;
  calories: number;
  meal: MealType;
  saveFavorite: boolean;
}

interface Props {
  initial?: Partial<EntryFormValues>;
  submitLabel: string;
  showFavoriteToggle?: boolean;
  onSubmit: (v: EntryFormValues) => void | Promise<void>;
  onCancel?: () => void;
  /** Extra controls rendered next to the submit button (e.g. AI buttons); receives the current name text. */
  extra?: (name: string) => React.ReactNode;
}

export function parseCalories(raw: string): number | null {
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 && n <= 20000 ? Math.round(n) : null;
}

export function EntryForm({ initial, submitLabel, showFavoriteToggle, onSubmit, onCancel, extra }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [calories, setCalories] = useState(initial?.calories != null ? String(initial.calories) : '');
  const [meal, setMeal] = useState<MealType>(initial?.meal ?? 'sarapan');
  const [saveFavorite, setSaveFavorite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const kcal = parseCalories(calories);
    if (!name.trim()) return setError('Nama makanan wajib diisi.');
    if (kcal === null) return setError('Kalori harus angka 0–20000.');
    setError(null);
    await onSubmit({ name: name.trim(), calories: kcal, meal, saveFavorite });
    if (!initial) {
      setName('');
      setCalories('');
      setSaveFavorite(false);
    }
  }

  return (
    <form className="entry-form" onSubmit={submit}>
      <input
        aria-label="Nama makanan"
        placeholder="Nama makanan, mis. nasi goreng"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="row">
        <input
          aria-label="Kalori"
          placeholder="kkal"
          inputMode="numeric"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          className="kcal-input"
        />
        <select aria-label="Waktu makan" value={meal} onChange={(e) => setMeal(e.target.value as MealType)}>
          {MEAL_TYPES.map((m) => (
            <option key={m} value={m}>
              {MEAL_LABELS[m]}
            </option>
          ))}
        </select>
      </div>
      {showFavoriteToggle && (
        <label className="check">
          <input type="checkbox" checked={saveFavorite} onChange={(e) => setSaveFavorite(e.target.checked)} />
          Simpan juga ke favorit
        </label>
      )}
      {error && <p className="error">{error}</p>}
      <div className="row actions">
        <button type="submit" className="primary">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Batal
          </button>
        )}
        {extra?.(name)}
      </div>
    </form>
  );
}
