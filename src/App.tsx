import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { SyncBadge } from './components/SyncBadge';
import { db } from './db/db';
import { FavoritesView } from './features/FavoritesView';
import { Onboarding, onboardingDone } from './features/Onboarding';
import { SettingsView } from './features/SettingsView';
import { TodayView } from './features/TodayView';
import { WeekView } from './features/WeekView';

const TABS = [
  { id: 'today', label: 'Harian', icon: '🍽️' },
  { id: 'week', label: 'Mingguan', icon: '📊' },
  { id: 'favorites', label: 'Favorit', icon: '⭐' },
  { id: 'settings', label: 'Pengaturan', icon: '⚙️' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function App() {
  const [tab, setTab] = useState<TabId>('today');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(onboardingDone);
  // undefined while loading, null when no target has ever been saved (on any synced device).
  const savedSettings = useLiveQuery(async () => (await db.settings.get('main')) ?? null, []);
  const showOnboarding = onboardingOpen || (savedSettings === null && !onboardingDismissed);

  return (
    <div className="app">
      <div className="sky" aria-hidden>
        <div className="aurora" />
        <div className="snowfall" />
      </div>
      {showOnboarding && (
        <Onboarding
          onClose={() => {
            setOnboardingDismissed(true);
            setOnboardingOpen(false);
          }}
        />
      )}
      <header className="topbar">
        <h1>Kalori</h1>
        <SyncBadge onClick={() => setTab('settings')} />
      </header>

      <main className="content">
        {tab === 'today' && <TodayView />}
        {tab === 'week' && <WeekView />}
        {tab === 'favorites' && <FavoritesView />}
        {tab === 'settings' && <SettingsView onOpenOnboarding={() => setOnboardingOpen(true)} />}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
