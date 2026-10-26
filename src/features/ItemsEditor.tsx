import { useState } from 'react';
import { Icon } from '../components/Icon';
import { MEAL_LABELS, MEAL_TYPES, type MealType } from '../db/schema';
import { parseCalories } from './EntryForm';

export interface EditableItem {
  name: string;
  calories: number;
  meal: MealType;
}

export interface EditedItem extends EditableItem {
  /** False when the user unticked the row (it should be removed). */
  include: boolean;
}

interface Row {
  include: boolean;
  name: string;
  calories: string;
  meal: MealType;
}

interface Props {
  items: EditableItem[];
  note?: string;
  photo?: string;
  confirmLabel: string;
  onConfirm: (items: EditedItem[]) => void | Promise<void>;
  onCancel: () => void;
}

/** Edit a batch of food items (e.g. what the AI found in one photo). Rows keep their order. */
export function ItemsEditor({ items, note, photo, confirmLabel, onConfirm, onCancel }: Props) {
  const [rows, setRows] = useState<Row[]>(() =>
    items.map((i) => ({ include: true, name: i.name, calories: String(i.calories), meal: i.meal })),
  );
  const [error, setError] = useState<string | null>(null);

  const update = (idx: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  async function confirm() {
    const parsed = rows.map((r) => ({ ...r, name: r.name.trim(), kcal: parseCalories(r.calories) }));
    if (parsed.some((r) => r.include && (!r.name || r.kcal === null))) {
      return setError('Periksa nama dan kalori setiap item yang dicentang.');
    }
    await onConfirm(parsed.map((r) => ({ include: r.include, name: r.name, calories: r.kcal ?? 0, meal: r.meal })));
  }

  const total = rows.reduce((s, r) => s + (r.include ? (parseCalories(r.calories) ?? 0) : 0), 0);

  return (
    <div className="items-editor">
      {photo && <img className="editor-photo" src={photo} alt="" />}
      {note && <p className="muted">{note}</p>}
      {rows.map((r, idx) => (
        <div key={idx} className={`ai-row ${r.include ? '' : 'excluded'}`}>
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
        <button className="primary" onClick={confirm}>
          <Icon name="check" size={18} />
          {confirmLabel} ({total.toLocaleString('id-ID')} kkal)
        </button>
        <button onClick={onCancel}>Batal</button>
      </div>
    </div>
  );
}
