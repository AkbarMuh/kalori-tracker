import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { isAiReady, loadAiConfig, setupLink } from '../ai/config';
import { AiError, estimateFood, providerLabel } from '../ai/estimate';
import { Icon, type IconName } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { deleteFavorite, exportAll, mergeIntoLocal, saveFavorite, setDailyTarget } from '../db/repo';
import { MEAL_LABELS, type FavoriteFood } from '../db/schema';
import { useFavorites, useSettings, useSyncState, useToday } from '../hooks';
import { backupFileName, parseBackup, toBackupBlob } from '../lib/backup';
import { MASCOT_NAME } from '../lib/mascot';
import { showToast } from '../lib/toast';
import { checkForUpdate } from '../pwa';
import { loadConfig, saveConfig, syncNow } from '../sync/syncService';
import { AiSetupForm } from './AiSetupForm';
import { EntryForm, parseCalories } from './EntryForm';

interface Props {
  onClose: () => void;
  onOpenOnboarding: () => void;
}

/** Full-screen settings page that slides in from the right. */
export function SettingsPage({ onClose, onOpenOnboarding }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="page" role="dialog" aria-modal="true" aria-label="Pengaturan">
      <header className="page-head">
        <button className="icon-btn" onClick={onClose} aria-label="Kembali">
          <Icon name="chevronLeft" />
        </button>
        <h1>Pengaturan</h1>
      </header>
      <div className="page-body view">
        <TargetSettings onOpenOnboarding={onOpenOnboarding} />
        <AiSettings />
        <FavoriteSettings />
        <SyncSettings />
        <BackupSettings />
        <AboutSection />
      </div>
    </div>
  );
}

function Section({ icon, tone, title, children }: { icon: IconName; tone: string; title: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2 className="card-title">
        <span className="card-title-icon" style={{ color: tone }}>
          <Icon name={icon} size={20} />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function SavedLabel({ saved, label = 'Simpan' }: { saved: boolean; label?: string }) {
  return saved ? (
    <>
      <Icon name="check" size={18} /> Tersimpan
    </>
  ) : (
    <>{label}</>
  );
}

function TargetSettings({ onOpenOnboarding }: { onOpenOnboarding: () => void }) {
  const settings = useSettings();
  const [value, setValue] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = parseCalories(value ?? '');
    if (n === null || n === 0) return;
    await setDailyTarget(n);
    setValue(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <Section icon="target" tone="#8b7cf6" title="Target kalori harian">
      <form className="row" onSubmit={submit}>
        <input
          inputMode="numeric"
          aria-label="Target kalori"
          value={value ?? String(settings.dailyTarget)}
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="primary" type="submit" disabled={value === null}>
          <SavedLabel saved={saved} />
        </button>
      </form>
      <button className="link-btn" onClick={onOpenOnboarding}>
        <Icon name="bear" size={18} />
        Hitung ulang target bareng {MASCOT_NAME}
      </button>
    </Section>
  );
}

type TestState = { state: 'idle' } | { state: 'running' } | { state: 'ok' | 'error'; text: string };

function AiSettings() {
  const [cfg, setCfg] = useState(loadAiConfig);
  const [editing, setEditing] = useState(() => !isAiReady(loadAiConfig()));
  const [test, setTest] = useState<TestState>({ state: 'idle' });
  const [qr, setQr] = useState<{ svg: string; link: string } | null>(null);
  const ready = isAiReady(cfg);

  async function runTest() {
    if (!isAiReady(cfg)) return;
    setTest({ state: 'running' });
    try {
      const r = await estimateFood(cfg, { text: 'segelas teh manis', mealHint: 'Camilan' });
      const first = r.items[0];
      setTest({ state: 'ok', text: first ? `Tersambung! “${first.name}” ≈ ${first.calories} kkal` : 'Tersambung!' });
    } catch (e) {
      setTest({ state: 'error', text: e instanceof AiError ? e.message : 'Gagal menghubungi AI.' });
    }
  }

  async function showQr() {
    if (!isAiReady(cfg)) return;
    const link = setupLink(cfg, window.location.href);
    const { renderSVG } = await import('uqr');
    setQr({ link, svg: renderSVG(link, { ecc: 'M', border: 2 }) });
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      showToast({ icon: 'check', message: 'Link setup disalin' }, 2500);
    } catch {
      showToast({ icon: 'close', message: 'Tidak bisa menyalin otomatis' }, 2500);
    }
  }

  return (
    <Section icon="sparkle" tone="#8b7cf6" title="AI pengenal makanan">
      <p className="muted status-line">
        {ready ? <Icon name="check" size={16} tone="var(--accent)" /> : <Icon name="close" size={16} tone="var(--danger)" />}
        {providerLabel(ready ? cfg : null)}
      </p>

      {ready && !editing ? (
        <div className="row actions">
          <button onClick={runTest} disabled={test.state === 'running'}>
            <Icon name="sparkle" size={18} tone="#8b7cf6" />
            {test.state === 'running' ? 'Mengetes…' : 'Tes koneksi'}
          </button>
          <button onClick={showQr}>
            <Icon name="qr" size={18} />
            Pasang di HP lain
          </button>
          <button onClick={() => setEditing(true)}>
            <Icon name="pencil" size={18} />
            Ubah
          </button>
        </div>
      ) : (
        <AiSetupForm
          initial={cfg}
          submitLabel="Simpan"
          onSaved={(c) => {
            setCfg(c);
            setEditing(false);
            setTest({ state: 'idle' });
            setQr(null);
            showToast({ icon: 'check', message: 'AI tersambung' }, 2500);
          }}
        />
      )}

      {(test.state === 'ok' || test.state === 'error') && (
        <p className={test.state === 'ok' ? 'muted status-line' : 'error'}>{test.text}</p>
      )}

      {qr && (
        <div className="qr-box">
          <img src={`data:image/svg+xml;utf8,${encodeURIComponent(qr.svg)}`} alt="QR untuk menyambungkan AI di perangkat lain" />
          <p className="muted small">
            Scan pakai kamera HP, aplikasi akan langsung tersambung. QR dan link ini berisi key, jangan dibagikan ke orang lain.
          </p>
          <div className="row actions center">
            <button onClick={() => void copyLink(qr.link)}>Salin link</button>
            <button onClick={() => setQr(null)}>Tutup</button>
          </div>
        </div>
      )}
    </Section>
  );
}

function FavoriteSettings() {
  const favorites = useFavorites();
  const [editing, setEditing] = useState<FavoriteFood | 'new' | null>(null);

  return (
    <Section icon="star" tone="#eaa915" title="Makanan favorit">
      <p className="muted">Muncul sebagai tombol cepat saat mencatat manual.</p>
      {favorites.length > 0 && (
        <ul className="fav-list">
          {favorites.map((f) => (
            <li key={f.id}>
              <button className="fav-item" onClick={() => setEditing(f)}>
                <span>
                  {f.name}
                  {f.defaultMeal && <small> · {MEAL_LABELS[f.defaultMeal]}</small>}
                </span>
                <span className="entry-kcal">{f.calories} kkal</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="link-btn" onClick={() => setEditing('new')}>
        <Icon name="plus" size={18} />
        Tambah favorit
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
                <Icon name="trash" size={18} />
                Hapus favorit
              </button>
            </div>
          )}
        </Sheet>
      )}
    </Section>
  );
}

function SyncSettings() {
  const sync = useSyncState();
  const existing = loadConfig();
  const [form, setForm] = useState({
    token: existing?.token ?? '',
    owner: existing?.owner ?? '',
    repo: existing?.repo ?? '',
    path: existing?.path ?? 'data.json',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value.trim() }));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.token || !form.owner || !form.repo || !form.path) return;
    saveConfig(form);
    void syncNow();
  }

  return (
    <Section icon="cloud" tone="var(--accent)" title="Sinkron ke GitHub">
      <p className="muted">
        Data disimpan ke file JSON di repo GitHub <b>privat</b> milikmu, jadi HP dan laptop memakai data yang sama.
        Buat <i>fine-grained personal access token</i> yang hanya punya akses ke repo itu dengan izin{' '}
        <b>Contents: Read and write</b>. Foto makanan tidak ikut disinkronkan.
      </p>
      <form className="stack" onSubmit={submit}>
        <input placeholder="Owner (username GitHub)" value={form.owner} onChange={set('owner')} autoComplete="off" />
        <input placeholder="Nama repo data, mis. kalori-data" value={form.repo} onChange={set('repo')} autoComplete="off" />
        <input placeholder="Path file" value={form.path} onChange={set('path')} autoComplete="off" />
        <input
          placeholder="Token (github_pat_…)"
          type="password"
          value={form.token}
          onChange={set('token')}
          autoComplete="off"
        />
        <div className="row actions">
          <button className="primary" type="submit">
            Simpan & sinkron
          </button>
          {existing && (
            <>
              <button type="button" onClick={() => void syncNow()} disabled={sync.status === 'syncing'}>
                Sinkron sekarang
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  saveConfig(null);
                  setForm({ token: '', owner: '', repo: '', path: 'data.json' });
                }}
              >
                Putuskan
              </button>
            </>
          )}
        </div>
      </form>
      <SyncStatusLine />
    </Section>
  );
}

function SyncStatusLine() {
  const s = useSyncState();
  if (s.status === 'off') return <p className="muted">Sinkron belum diaktifkan. Data hanya ada di perangkat ini.</p>;
  const last = s.lastSync ? new Date(s.lastSync).toLocaleString('id-ID') : 'belum pernah';
  if (s.status === 'error') return <p className="error">Gagal: {s.message}</p>;
  if (s.status === 'syncing') return <p className="muted shimmer-text">Menyinkronkan…</p>;
  if (s.status === 'offline') return <p className="muted">Offline. Sinkron terakhir: {last}</p>;
  return (
    <p className="muted status-line">
      <Icon name="check" size={16} tone="var(--accent)" /> Sinkron terakhir: {last}
    </p>
  );
}

const buildLabel = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
  new Date(__APP_BUILD__),
);

function AboutSection() {
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    try {
      const result = await checkForUpdate();
      if (result === 'none') showToast({ icon: 'check', message: 'Sudah versi terbaru' }, 2500);
      else if (result === 'found') showToast({ icon: 'refresh', message: 'Versi baru sedang diunduh…' }, 4000);
      else showToast({ icon: 'close', message: 'Pembaruan otomatis tidak aktif di sini' }, 3000);
    } catch {
      showToast({ icon: 'close', message: 'Tidak bisa memeriksa pembaruan (offline?)' }, 3000);
    } finally {
      setChecking(false);
    }
  }

  return (
    <Section icon="bear" tone="var(--accent)" title="Tentang">
      <p className="muted">
        Kalori bareng {MASCOT_NAME} · versi {buildLabel}
      </p>
      <button className="link-btn" onClick={check} disabled={checking}>
        <Icon name="refresh" size={18} />
        {checking ? 'Memeriksa…' : 'Cek pembaruan'}
      </button>
    </Section>
  );
}

function BackupSettings() {
  const today = useToday();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function doExport() {
    const url = URL.createObjectURL(toBackupBlob(await exportAll()));
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName(today);
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport(file: File) {
    try {
      const data = parseBackup(await file.text());
      await mergeIntoLocal(data, { emitChange: true });
      setMsg({ ok: true, text: `Berhasil: ${data.entries.length} catatan, ${data.favorites.length} favorit digabungkan.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Import gagal.' });
    }
  }

  return (
    <Section icon="download" tone="#2fb38a" title="Backup">
      <p className="muted">Import menggabungkan isi file dengan data yang ada. Data yang sudah ada tidak dihapus.</p>
      <div className="row actions">
        <button onClick={doExport}>
          <Icon name="download" size={18} />
          Export JSON
        </button>
        <button onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={18} />
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void doImport(f);
          }}
        />
      </div>
      {msg && <p className={msg.ok ? 'muted' : 'error'}>{msg.text}</p>}
    </Section>
  );
}
