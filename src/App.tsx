import { useState } from 'react';
import { SyncBadge } from './components/SyncBadge';
import { FavoritesView } from './features/FavoritesView';
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

  return (
    <div className="app">
      <header className="topbar">
        <h1>Kalori</h1>
        <SyncBadge onClick={() => setTab('settings')} />
      </header>

      <main className="content">
        {tab === 'today' && <TodayView />}
        {tab === 'week' && <WeekView />}
        {tab === 'favorites' && <FavoritesView />}
        {tab === 'settings' && <SettingsView />}
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
