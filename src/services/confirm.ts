/**
 * Asks the person to confirm an action in the site's own dialog, in place of the
 * browser's plain "site says" pop-up. Resolves true only if they choose the
 * confirm button; Cancel, Escape or clicking outside resolve false.
 */
export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** "danger" is for actions that remove or take something away. */
  tone?: 'default' | 'danger';
}

export interface ConfirmRequest extends ConfirmOptions {
  id: number;
  resolve: (ok: boolean) => void;
}

type Listener = (request: ConfirmRequest | null) => void;

let current: ConfirmRequest | null = null;
let nextId = 1;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach(l => l(current));

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  // Only one question at a time: a new one cancels any that is still open.
  current?.resolve(false);
  return new Promise(resolve => {
    const id = nextId++;
    current = {
      ...options,
      id,
      resolve: (ok) => {
        if (current?.id === id) { current = null; emit(); }
        resolve(ok);
      },
    };
    emit();
  });
}

export function subscribeConfirm(listener: Listener) {
  listeners.add(listener);
  listener(current);
  return () => { listeners.delete(listener); };
}
