import { useState } from 'react';
import { MEAL_LABELS, MEAL_TYPES, type MealType } from '../db/schema';
import type { Estimate } from '../ai/estimate';
import { parseCalories } from './EntryForm';

interface Row {
  include: boolean;
  name: string;
  calories: string;
  meal: MealType;
}

interface Props {
  estimate: Estimate;
  onConfirm: (items: { name: string; calories: number; meal: MealType }[]) => void | Promise<void>;
  onCancel: () => void;
}

/** Lets the user correct the model's estimate before anything is saved. */
export function AiReview({ estimate, onConfirm, onCancel }: Props) {
  const [rows, setRows] = useState<Row[]>(() =>
    estimate.items.map((i) => ({ include: true, name: i.name, calories: String(i.calories), meal: i.meal })),
  );
  const [error, setError] = useState<string | null>(null);

  const update = (idx: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  async function confirm() {
    const chosen = rows.filter((r) => r.include);
    const items = chosen.map((r) => ({ name: r.name.trim(), calories: parseCalories(r.calories), meal: r.meal }));
    if (items.some((i) => !i.name || i.calories === null)) {
      return setError('Periksa nama dan kalori setiap item yang dicentang.');
    }
    await onConfirm(items.map((i) => ({ ...i, calories: i.calories! })));
  }

  const total = rows.reduce((s, r) => s + (r.include ? (parseCalories(r.calories) ?? 0) : 0), 0);

  return (
    <div className="card ai-review">
      {estimate.note && <p className="muted">{estimate.note}</p>}
      {rows.length === 0 && <p>Tidak ada makanan yang dikenali.</p>}
      {rows.map((r, idx) => (
        <div key={idx} className="ai-row">
          <input
            type="checkbox"
            aria-label="Sertakan"
            checked={r.include}
            onChange={(e) => update(idx, { include: e.target.checked })}
          />
          <input aria-label="Nama" value={r.name} onChange={(e) => update(idx, { name: e.target.value })} />
          <input
            aria-label="Kalori"
            className="kcal-input"
            inputMode="numeric"
            value={r.calories}
            onChange={(e) => update(idx, { calories: e.target.value })}
          />
          <select aria-label="Waktu makan" value={r.meal} onChange={(e) => update(idx, { meal: e.target.value as MealType })}>
            {MEAL_TYPES.map((m) => (
              <option key={m} value={m}>
                {MEAL_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
      ))}
      {error && <p className="error">{error}</p>}
      <div className="row actions">
        <button className="primary" onClick={confirm} disabled={!rows.some((r) => r.include)}>
          Tambahkan ({total} kkal)
        </button>
        <button onClick={onCancel}>Batal</button>
      </div>
    </div>
  );
}
