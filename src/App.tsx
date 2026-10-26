import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useState } from 'react';
import { Icon } from './components/Icon';
import { Splash } from './components/Splash';
import { SyncBadge } from './components/SyncBadge';
import { ToastHost } from './components/ToastHost';
import { db } from './db/db';
import { CameraButton, CameraProvider } from './features/Camera';
import { HistoryView } from './features/HistoryView';
import { Onboarding, onboardingDone } from './features/Onboarding';
import { SettingsPage } from './features/SettingsPage';
import { TodayView } from './features/TodayView';
import { useToday } from './hooks';
import { haptic } from './lib/haptics';

type Tab = 'today' | 'history';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function App() {
  const today = useToday();
  const [tab, setTab] = useState<Tab>('today');
  // null = follow "today" (also across midnight); otherwise a specific past day.
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const date = pickedDate ?? today;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [splash, setSplash] = useState(() => !prefersReducedMotion());
  const endSplash = useCallback(() => setSplash(false), []);

  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(onboardingDone);
  // undefined while loading, null when no target has ever been saved (on any synced device).
  const savedSettings = useLiveQuery(async () => (await db.settings.get('main')) ?? null, []);
  const showOnboarding = onboardingOpen || (savedSettings === null && !onboardingDismissed);

  const changeDate = (d: string) => setPickedDate(d === today ? null : d);
  const switchTab = (t: Tab) => {
    if (t !== tab) haptic(6);
    setTab(t);
  };

  return (
    <CameraProvider date={tab === 'today' ? date : today} isToday={tab !== 'today' || date === today}>
      <div className="app">
        <div className="sky" aria-hidden>
          <div className="aurora" />
          <div className="snowfall" />
        </div>

        <header className="topbar">
          <h1>
            <Icon name="bear" size={26} tone="var(--accent)" />
            Kalori
          </h1>
          <div className="topbar-actions">
            <SyncBadge onClick={() => setSettingsOpen(true)} />
            <button className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Pengaturan">
              <Icon name="settings" size={24} />
            </button>
          </div>
        </header>

        <main className="content">
          {tab === 'today' ? (
            <TodayView date={date} today={today} onDateChange={changeDate} />
          ) : (
            <HistoryView
              onOpenDay={(d) => {
                changeDate(d);
                switchTab('today');
              }}
            />
          )}
        </main>

        <nav className="tabbar">
          <span className={`tab-pill ${tab}`} aria-hidden />
          <button
            className={`tab ${tab === 'today' ? 'active' : ''}`}
            onClick={() => switchTab('today')}
            aria-current={tab === 'today' ? 'page' : undefined}
          >
            <Icon name="home" size={26} />
            Hari ini
          </button>
          <CameraButton />
          <button
            className={`tab ${tab === 'history' ? 'active' : ''}`}
            onClick={() => switchTab('history')}
            aria-current={tab === 'history' ? 'page' : undefined}
          >
            <Icon name="calendar" size={26} />
            Riwayat
          </button>
        </nav>

        {settingsOpen && (
          <SettingsPage
            onClose={() => setSettingsOpen(false)}
            onOpenOnboarding={() => {
              setSettingsOpen(false);
              setOnboardingOpen(true);
            }}
          />
        )}
        {showOnboarding && (
          <Onboarding
            onClose={() => {
              setOnboardingDismissed(true);
              setOnboardingOpen(false);
            }}
          />
        )}
        <ToastHost />
        {splash && <Splash onDone={endSplash} />}
      </div>
    </CameraProvider>
  );
}
