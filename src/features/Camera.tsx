import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import {
  AiCancelled,
  AiError,
  estimateFood,
  loadApiKey,
  photoPreview,
  photoThumbnail,
  photoToBase64,
  saveApiKey,
} from '../ai/estimate';
import { Icon } from '../components/Icon';
import { PolarBear } from '../components/PolarBear';
import { Sheet } from '../components/Sheet';
import { addEntries, deleteEntry, savePhoto, setEntriesDeleted, updateEntry } from '../db/repo';
import { MEAL_LABELS, type FoodEntry } from '../db/schema';
import { defaultMealForTime, timeOnDate } from '../lib/date';
import { haptic } from '../lib/haptics';
import { MASCOT_NAME } from '../lib/mascot';
import { hideToast, showToast } from '../lib/toast';
import { ItemsEditor } from './ItemsEditor';

interface CameraApi {
  /** Opens the camera (must be called from a tap handler). */
  capture: () => void;
  /** Opens the photo picker (must be called from a tap handler). */
  pickFromGallery: () => void;
  /** Estimates from a text description instead of a photo. */
  analyzeText: (text: string) => void;
}

const CameraContext = createContext<CameraApi | null>(null);

export function useCamera(): CameraApi {
  const api = useContext(CameraContext);
  if (!api) throw new Error('useCamera must be used inside <CameraProvider>');
  return api;
}

type Source = 'camera' | 'gallery' | { text: string };

type Phase =
  | { kind: 'idle' }
  | { kind: 'needKey'; then: Source }
  | { kind: 'analyzing'; preview?: string; text?: string }
  | { kind: 'error'; preview?: string; text?: string; message: string; retry: () => void }
  | { kind: 'empty'; preview?: string; note: string }
  | { kind: 'edit'; entries: FoodEntry[]; note: string; photo?: string };

interface Props {
  /** Day that new entries are logged on (the day being viewed, or today). */
  date: string;
  isToday: boolean;
  children: ReactNode;
}

/**
 * The core flow: photo → Claude estimates the items → entries are saved right away,
 * with a toast to edit or undo. Also handles the text-description variant.
 */
export function CameraProvider({ date, isToday, children }: Props) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [keyDraft, setKeyDraft] = useState('');

  async function run(input: { file?: File; text?: string }) {
    const apiKey = loadApiKey();
    if (!apiKey) return;
    const controller = new AbortController();
    abort.current = controller;
    let preview: string | undefined;
    try {
      if (input.file) preview = await photoPreview(input.file);
      setPhase({ kind: 'analyzing', preview, text: input.text });

      const [imageBase64, thumb] = input.file
        ? await Promise.all([photoToBase64(input.file), photoThumbnail(input.file)])
        : [undefined, undefined];
      const mealHint = MEAL_LABELS[defaultMealForTime(new Date())];
      const estimate = await estimateFood(apiKey, { text: input.text, imageBase64, mealHint }, controller.signal);

      if (estimate.items.length === 0) {
        setPhase({ kind: 'empty', preview, note: estimate.note });
        return;
      }

      const time = isToday ? new Date().toISOString() : timeOnDate(date, new Date());
      const saved = await addEntries(
        estimate.items.map((i) => ({ date, time, meal: i.meal, name: i.name, calories: i.calories, source: 'ai' as const })),
      );
      if (thumb) await savePhoto(saved.map((e) => e.id), thumb);
      setPhase({ kind: 'idle' });
      haptic(15);

      const total = saved.reduce((s, e) => s + e.calories, 0);
      showToast(
        {
          icon: 'paw',
          message: `${saved.length} makanan tercatat · ${total.toLocaleString('id-ID')} kkal`,
          actions: [
            {
              label: 'Ubah',
              icon: 'pencil',
              onClick: () => {
                hideToast();
                setPhase({ kind: 'edit', entries: saved, note: estimate.note, photo: thumb });
              },
            },
            {
              label: 'Urungkan',
              icon: 'undo',
              onClick: () => {
                hideToast();
                void setEntriesDeleted(
                  saved.map((e) => e.id),
                  true,
                );
              },
            },
          ],
        },
        7000,
      );
    } catch (e) {
      if (e instanceof AiCancelled) return setPhase({ kind: 'idle' });
      setPhase({
        kind: 'error',
        preview,
        text: input.text,
        message: e instanceof AiError ? e.message : 'Gagal memproses. Coba lagi.',
        retry: () => void run(input),
      });
    } finally {
      if (abort.current === controller) abort.current = null;
    }
  }

  function start(source: Source) {
    if (!loadApiKey()) return setPhase({ kind: 'needKey', then: source });
    if (source === 'camera') cameraInput.current?.click();
    else if (source === 'gallery') galleryInput.current?.click();
    else void run({ text: source.text });
  }

  const api: CameraApi = {
    capture: () => start('camera'),
    pickFromGallery: () => start('gallery'),
    analyzeText: (text) => start({ text }),
  };

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void run({ file });
  }

  const close = () => setPhase({ kind: 'idle' });
  const showsOverlay = phase.kind === 'analyzing' || phase.kind === 'error' || phase.kind === 'empty';

  return (
    <CameraContext.Provider value={api}>
      {children}

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={galleryInput} type="file" accept="image/*" hidden onChange={onFile} />

      {showsOverlay && (
        <div className="analyze-overlay" role="dialog" aria-modal="true" aria-label="Menganalisis makanan">
          <div className="analyze-card">
            {phase.preview ? (
              <div className="analyze-photo">
                <img src={phase.preview} alt="Foto makanan" />
                {phase.kind === 'analyzing' && <div className="scan-line" />}
              </div>
            ) : (
              'text' in phase && phase.text && <p className="analyze-quote">“{phase.text}”</p>
            )}
            <div className="analyze-bear">
              <PolarBear
                mood={phase.kind === 'error' ? 'stuffed' : phase.kind === 'empty' ? 'sleepy' : 'hungry'}
                size={92}
              />
            </div>
            {phase.kind === 'analyzing' && (
              <p className="analyze-status">
                {MASCOT_NAME} lagi menebak kalorinya
                <span className="dots" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
              </p>
            )}
            {phase.kind === 'empty' && (
              <p className="analyze-status">
                Hmm, {MASCOT_NAME} nggak nemu makanan di sini.
                {phase.note && <small className="muted"> {phase.note}</small>}
              </p>
            )}
            {phase.kind === 'error' && <p className="error">{phase.message}</p>}
            <div className="row actions center">
              {phase.kind === 'analyzing' && <button onClick={() => abort.current?.abort()}>Batal</button>}
              {phase.kind === 'error' && (
                <>
                  <button className="primary" onClick={phase.retry}>
                    Coba lagi
                  </button>
                  <button onClick={close}>Tutup</button>
                </>
              )}
              {phase.kind === 'empty' && (
                <>
                  <button
                    className="primary"
                    onClick={() => {
                      close();
                      cameraInput.current?.click();
                    }}
                  >
                    <Icon name="camera" size={18} />
                    Foto ulang
                  </button>
                  <button onClick={close}>Tutup</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {phase.kind === 'needKey' && (
        <Sheet title="Atur AI dulu" onClose={close}>
          <p className="muted">
            {MASCOT_NAME} butuh API key Anthropic untuk mengenali makanan dari foto. Key hanya disimpan di HP ini dan
            biaya API ditagih ke akunmu.
          </p>
          <input
            type="password"
            placeholder="sk-ant-…"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            autoComplete="off"
          />
          <button
            className="primary"
            disabled={!keyDraft.trim()}
            onClick={() => {
              saveApiKey(keyDraft.trim());
              setKeyDraft('');
              const then = phase.then;
              close();
              start(then);
            }}
          >
            Simpan & lanjut
          </button>
        </Sheet>
      )}

      {phase.kind === 'edit' && (
        <Sheet title="Ubah hasil foto" onClose={close}>
          <ItemsEditor
            items={phase.entries}
            note={phase.note}
            photo={phase.photo}
            confirmLabel="Simpan"
            onCancel={close}
            onConfirm={async (edited) => {
              await Promise.all(
                edited.map((item, i) => {
                  const id = phase.entries[i]!.id;
                  return item.include
                    ? updateEntry(id, { name: item.name, calories: item.calories, meal: item.meal })
                    : deleteEntry(id);
                }),
              );
              close();
              showToast({ icon: 'check', message: 'Perubahan disimpan' }, 2500);
            }}
          />
        </Sheet>
      )}
    </CameraContext.Provider>
  );
}

/** The big round camera button in the middle of the tab bar. */
export function CameraButton() {
  const { capture } = useCamera();
  return (
    <button className="camera-btn" onClick={capture} aria-label="Foto makanan">
      <span className="camera-btn-ring" aria-hidden />
      <Icon name="camera" size={32} strokeWidth={2} />
    </button>
  );
}
