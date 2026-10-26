import { useSyncExternalStore } from 'react';
import { toastStore } from '../lib/toast';
import { Icon } from './Icon';

export function ToastHost() {
  const toast = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot);
  if (!toast) return null;
  return (
    <div className="toast" key={toast.id} role="status">
      {toast.icon && <Icon name={toast.icon} size={22} className="toast-icon" />}
      <span className="toast-msg">{toast.message}</span>
      {toast.actions && (
        <span className="toast-actions">
          {toast.actions.map((a) => (
            <button key={a.label} className="toast-action" onClick={a.onClick}>
              {a.icon && <Icon name={a.icon} size={16} />}
              {a.label}
            </button>
          ))}
        </span>
      )}
    </div>
  );
}
