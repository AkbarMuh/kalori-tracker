import { useSyncState } from '../hooks';
import { Icon } from './Icon';

export function SyncBadge({ onClick }: { onClick: () => void }) {
  const s = useSyncState();
  if (s.status === 'off') return null;

  const [label, cls] =
    s.status === 'syncing' ? ['Sinkron…', 'pending'] :
    s.status === 'error' ? ['Gagal sinkron', 'error'] :
    s.status === 'offline' ? ['Offline', 'pending'] :
    ['Tersinkron', 'ok'];

  return (
    <button className={`badge ${cls}`} onClick={onClick} title={s.status === 'error' ? s.message : undefined}>
      <Icon name="cloud" size={16} />
      {label}
    </button>
  );
}
