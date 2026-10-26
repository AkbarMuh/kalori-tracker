import { useRef, useState, type FormEvent } from 'react';
import { AI_MODEL, loadApiKey, saveApiKey } from '../ai/estimate';
import { exportAll, mergeIntoLocal, setDailyTarget } from '../db/repo';
import { useSettings, useSyncState, useToday } from '../hooks';
import { backupFileName, parseBackup, toBackupBlob } from '../lib/backup';
import { loadConfig, saveConfig, syncNow } from '../sync/syncService';
import { parseCalories } from './EntryForm';

export function SettingsView({ onOpenOnboarding }: { onOpenOnboarding: () => void }) {
  return (
    <div className="view">
      <TargetSettings onOpenOnboarding={onOpenOnboarding} />
      <SyncSettings />
      <AiSettings />
      <BackupSettings />
    </div>
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
    <section className="card">
      <h2>Target kalori harian</h2>
      <form className="row" onSubmit={submit}>
        <input
          inputMode="numeric"
          aria-label="Target kalori"
          value={value ?? String(settings.dailyTarget)}
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="primary" type="submit" disabled={value === null}>
          {saved ? '✓ Tersimpan' : 'Simpan'}
        </button>
      </form>
      <button className="link-btn" onClick={onOpenOnboarding}>
        🐻‍❄️ Hitung ulang target bareng Salju
      </button>
    </section>
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
    <section className="card">
      <h2>Sinkron ke GitHub</h2>
      <p className="muted">
        Data disimpan ke file JSON di repo GitHub <b>privat</b> milikmu, jadi HP dan laptop memakai data yang sama.
        Buat <i>fine-grained personal access token</i> yang hanya punya akses ke repo itu dengan izin{' '}
        <b>Contents: Read and write</b>.
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
    </section>
  );
}

function SyncStatusLine() {
  const s = useSyncState();
  if (s.status === 'off') return <p className="muted">Sinkron belum diaktifkan. Data hanya ada di perangkat ini.</p>;
  const last = s.lastSync ? new Date(s.lastSync).toLocaleString('id-ID') : 'belum pernah';
  if (s.status === 'error') return <p className="error">Gagal: {s.message}</p>;
  if (s.status === 'syncing') return <p className="muted shimmer-text">Menyinkronkan…</p>;
  if (s.status === 'offline') return <p className="muted">Offline. Sinkron terakhir: {last}</p>;
  return <p className="muted">✓ Sinkron terakhir: {last}</p>;
}

function AiSettings() {
  const [key, setKey] = useState(loadApiKey() ?? '');
  const [saved, setSaved] = useState(!!loadApiKey());

  return (
    <section className="card">
      <h2>AI (foto & teks)</h2>
      <p className="muted">
        Masukkan API key Anthropic milikmu untuk menebak kalori dari foto atau deskripsi makanan (model {AI_MODEL}).
        Key hanya disimpan di perangkat ini dan dikirim langsung ke Anthropic. Biaya API ditagih ke akunmu.
      </p>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          saveApiKey(key.trim() || null);
          setSaved(!!key.trim());
        }}
      >
        <input
          type="password"
          placeholder="sk-ant-…"
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setSaved(false);
          }}
          autoComplete="off"
        />
        <button className="primary" type="submit">
          {saved ? '✓ Tersimpan' : 'Simpan'}
        </button>
      </form>
    </section>
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
    <section className="card">
      <h2>Backup</h2>
      <p className="muted">Import menggabungkan isi file dengan data yang ada. Data yang sudah ada tidak dihapus.</p>
      <div className="row actions">
        <button onClick={doExport}>⬇️ Export JSON</button>
        <button onClick={() => fileRef.current?.click()}>⬆️ Import JSON</button>
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
    </section>
  );
}
