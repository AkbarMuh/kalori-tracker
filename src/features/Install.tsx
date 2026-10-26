import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { currentInstallContext, installPromptStore, promptInstall, type InstallContext } from '../lib/install';
import { MASCOT_NAME } from '../lib/mascot';
import { showToast } from '../lib/toast';

const DISMISS_KEY = 'kalori.installDismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/** What install help this device needs: a native prompt, a guide, or nothing. */
export function useInstall() {
  const [ctx] = useState(currentInstallContext);
  const nativePrompt = useSyncExternalStore(installPromptStore.subscribe, installPromptStore.getSnapshot);
  const canGuide = ctx.kind === 'ios-safari' || ctx.kind === 'ios-browser' || ctx.kind === 'in-app';
  return { ctx, nativePrompt: !!nativePrompt, available: ctx.kind !== 'installed' && (!!nativePrompt || canGuide) };
}

/** Starts installation: the browser's own dialog where possible, otherwise the step-by-step guide. */
export function InstallTrigger({ children }: { children: (start: () => void) => ReactNode }) {
  const { ctx, nativePrompt } = useInstall();
  const [guide, setGuide] = useState(false);
  const start = () => {
    if (nativePrompt) {
      void promptInstall().then((ok) => ok && showToast({ icon: 'check', message: `${MASCOT_NAME} sudah ada di layar utama!` }, 3000));
    } else setGuide(true);
  };
  return (
    <>
      {children(start)}
      {guide && <InstallGuide ctx={ctx} onClose={() => setGuide(false)} />}
    </>
  );
}

/** Dismissible card on the main screen until the app is installed. */
export function InstallBanner() {
  const { available, nativePrompt } = useInstall();
  const [dismissed, setDismissed] = useState(readDismissed);
  if (!available || dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // storage unavailable: hide for this session only
    }
    setDismissed(true);
  }

  return (
    <InstallTrigger>
      {(start) => (
        <div className="install-banner card">
          <span className="install-banner-icon">
            <Icon name="addSquare" size={24} />
          </span>
          <span className="install-banner-text">
            <strong>Pasang di Layar Utama</strong>
            <small>Biar terbuka seperti aplikasi, tanpa bar browser.</small>
          </span>
          <button className="primary" onClick={start}>
            {nativePrompt ? 'Pasang' : 'Caranya'}
          </button>
          <button className="icon-btn ghost" onClick={dismiss} aria-label="Sembunyikan">
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </InstallTrigger>
  );
}

function Step({ n, icon, children }: { n: number; icon: IconName; children: ReactNode }) {
  return (
    <li className="install-step">
      <span className="install-step-num">{n}</span>
      <span className="install-step-icon">
        <Icon name={icon} size={22} />
      </span>
      <span className="install-step-text">{children}</span>
    </li>
  );
}

function CopyLink() {
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href.split('#')[0]!);
      showToast({ icon: 'check', message: 'Link disalin' }, 2500);
    } catch {
      showToast({ icon: 'close', message: 'Tidak bisa menyalin otomatis' }, 2500);
    }
  }
  return (
    <button onClick={() => void copy()}>
      <Icon name="link" size={18} />
      Salin link aplikasi
    </button>
  );
}

export function InstallGuide({ ctx, onClose }: { ctx: InstallContext; onClose: () => void }) {
  return (
    <Sheet title="Pasang di Layar Utama" onClose={onClose}>
      {ctx.kind === 'in-app' ? (
        <>
          <p>
            Kamu membuka Kalori di dalam <b>{ctx.app}</b>. Dari sini aplikasi tidak bisa ditambahkan ke Layar Utama.
          </p>
          <ol className="install-steps">
            <Step n={1} icon="more">
              Ketuk menu <b>•••</b> di pojok {ctx.app}, lalu pilih <b>Buka di browser</b> / <b>Buka di Safari</b>.
            </Step>
            <Step n={2} icon="addSquare">
              Setelah terbuka di Safari, ikuti langkah pasang dari sana.
            </Step>
          </ol>
          <CopyLink />
        </>
      ) : ctx.kind === 'ios-browser' ? (
        <>
          <ol className="install-steps">
            <Step n={1} icon="share">
              Ketuk ikon <b>Bagikan</b> di bilah alamat {ctx.browser}.
            </Step>
            <Step n={2} icon="addSquare">
              Pilih <b>Tambahkan ke Layar Utama</b> <small>(Add to Home Screen)</small>
            </Step>
            <Step n={3} icon="check">
              Ketuk <b>Tambah</b>.
            </Step>
          </ol>
          <p className="muted small">Pilihan itu tidak ada? Buka link ini di Safari.</p>
          <CopyLink />
        </>
      ) : (
        <>
          <ol className="install-steps">
            <Step n={1} icon={ctx.kind === 'ios-safari' ? 'more' : 'share'}>
              {ctx.kind === 'ios-safari' ? (
                <>
                  Ketuk <b>•••</b> di samping alamat web, lalu <b>Bagikan</b>.{' '}
                  <small>
                    Di iOS lama: langsung ketuk ikon <b>Bagikan</b> {ctx.ipad ? 'di kanan atas' : 'di bawah layar'}.
                  </small>
                </>
              ) : (
                <>
                  Buka menu browser (<b>⋮</b>).
                </>
              )}
            </Step>
            <Step n={2} icon="addSquare">
              Gulir ke bawah, pilih <b>Tambahkan ke Layar Utama</b> <small>(Add to Home Screen)</small>
            </Step>
            <Step n={3} icon="check">
              Pastikan <b>Buka sebagai App Web</b> aktif, lalu ketuk <b>Tambah</b>.
            </Step>
          </ol>
          <div className="install-note">
            <Icon name="compass" size={20} />
            <span>
              Tidak ada pilihan itu? Kemungkinan halaman ini dibuka dari WhatsApp atau aplikasi lain. Ketuk ikon{' '}
              <b>kompas</b> / <b>Buka di Safari</b> dulu.
            </span>
          </div>
          <CopyLink />
        </>
      )}
      {ctx.kind !== 'other' && (
        <p className="muted small">
          Di iPhone/iPad, aplikasi di Layar Utama punya penyimpanan sendiri, terpisah dari Safari. Atur AI dari dalam
          aplikasinya: tempel link setup (dari "Pasang di HP lain") di kolom Target URI.
        </p>
      )}
    </Sheet>
  );
}
