import { useState } from 'react';
import { Sheet } from '../components/Sheet';
import { deleteFavorite, saveFavorite } from '../db/repo';
import { MEAL_LABELS, type FavoriteFood } from '../db/schema';
import { useFavorites } from '../hooks';
import { EntryForm } from './EntryForm';

export function FavoritesView() {
  const favorites = useFavorites();
  const [editing, setEditing] = useState<FavoriteFood | 'new' | null>(null);

  return (
    <div className="view">
      <p className="muted">Makanan favorit muncul sebagai tombol "Tambah cepat" di halaman Harian.</p>

      {favorites.length === 0 ? (
        <div className="empty">
          <div className="empty-icon" aria-hidden>
            ⭐
          </div>
          <p>Belum ada favorit.</p>
        </div>
      ) : (
        <ul className="entry-list">
          {favorites.map((f) => (
            <li key={f.id}>
              <button className="entry" onClick={() => setEditing(f)}>
                <span className="entry-name">
                  {f.name}
                  {f.defaultMeal && <small>{MEAL_LABELS[f.defaultMeal]}</small>}
                </span>
                <span className="entry-kcal">{f.calories} kkal</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button className="fab" onClick={() => setEditing('new')} aria-label="Tambah favorit">
        +
      </button>

      {editing && (
        <Sheet title={editing === 'new' ? 'Favorit baru' : 'Ubah favorit'} onClose={() => setEditing(null)}>
          <EntryForm
            initial={editing === 'new' ? { meal: 'siang' } : { ...editing, meal: editing.defaultMeal ?? 'siang' }}
            submitLabel="Simpan"
            onCancel={() => setEditing(null)}
            onSubmit={async (v) => {
              await saveFavorite({
                id: editing === 'new' ? undefined : editing.id,
                name: v.name,
                calories: v.calories,
                defaultMeal: v.meal,
              });
              setEditing(null);
            }}
          />
          {editing !== 'new' && (
            <div className="row actions">
              <button
                className="danger"
                onClick={async () => {
                  await deleteFavorite(editing.id);
                  setEditing(null);
                }}
              >
                Hapus favorit
              </button>
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}
