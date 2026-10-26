import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { readSetupHash, saveAiConfig } from './ai/config';
import { providerLabel } from './ai/estimate';
import type { Toast } from './lib/toast';
import { initInstallPrompt } from './lib/install';
import { consumeJustUpdated, initPwaUpdates } from './pwa';
import { startAutoSync } from './sync/syncService';
import './styles.css';

let notice: Omit<Toast, 'id'> | undefined;

// A setup link from another device (#ai=…): store the AI config, then drop it from the address bar.
const fromLink = readSetupHash(window.location.hash);
if (fromLink) {
  saveAiConfig(fromLink);
  history.replaceState(null, '', window.location.pathname + window.location.search);
  notice = { icon: 'sparkle', message: `AI tersambung: ${providerLabel(fromLink)}` };
}

const justUpdated = consumeJustUpdated();
if (justUpdated && !notice) notice = { icon: 'refresh', message: 'Kalori sudah diperbarui ke versi terbaru' };

initInstallPrompt();
initPwaUpdates();
startAutoSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App skipSplash={justUpdated} notice={notice} />
  </StrictMode>,
);
