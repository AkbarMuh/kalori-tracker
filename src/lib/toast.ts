import type { IconName } from '../components/Icon';

export interface ToastAction {
  label: string;
  icon?: IconName;
  onClick: () => void;
}

export interface Toast {
  id: number;
  message: string;
  icon?: IconName;
  actions?: ToastAction[];
}

let current: Toast | null = null;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function showToast(toast: Omit<Toast, 'id'>, durationMs = 5000) {
  current = { ...toast, id: ++seq };
  emit();
  clearTimeout(timer);
  timer = setTimeout(hideToast, durationMs);
}

export function hideToast() {
  clearTimeout(timer);
  current = null;
  emit();
}

export const toastStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getSnapshot: () => current,
};
