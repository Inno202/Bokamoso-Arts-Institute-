export type ToastKind = 'success' | 'error' | 'info';
export interface Toast { id: number; kind: ToastKind; message: string }

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach(l => l(toasts));

function push(kind: ToastKind, message: string) {
  const id = nextId++;
  toasts = [...toasts.slice(-2), { id, kind, message }];
  emit();
  setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000);
}

function dismiss(id: number) {
  toasts = toasts.filter(t => t.id !== id);
  emit();
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
  info: (message: string) => push('info', message),
  dismiss,
  subscribe(listener: Listener) {
    listeners.add(listener);
    listener(toasts);
    return () => { listeners.delete(listener); };
  },
};
