import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { subscribeConfirm, type ConfirmRequest } from '../../services/confirm';

/**
 * The one confirmation dialog for the whole site. Uses the browser's modal
 * <dialog>, which keeps keyboard focus inside it, makes the page behind it
 * inert, and closes on Escape. Focus starts on Cancel, so a stray Enter never
 * confirms by accident, and returns to where it was afterwards.
 */
export function ConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => subscribeConfirm(setRequest), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (request && !dialog.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!request && dialog.open) {
      dialog.close();
      returnFocus.current?.focus?.();
    }
  }, [request]);

  const answer = (ok: boolean) => request?.resolve(ok);
  const danger = request?.tone === 'danger';

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby="confirm-title"
      aria-describedby={request?.message ? 'confirm-message' : undefined}
      onCancel={(e) => { e.preventDefault(); answer(false); }}
      onClick={(e) => { if (e.target === e.currentTarget) answer(false); }}
    >
      {request && (
        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <span className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${danger ? 'bg-red-50 text-bai-red-deep' : 'bg-blue-50 text-bai-blue'}`} aria-hidden="true">
              {danger ? <AlertTriangle size={22} /> : <HelpCircle size={22} />}
            </span>
            <div className="min-w-0 pt-1">
              <h2 id="confirm-title" className="font-serif font-semibold text-2xl leading-tight break-words">{request.title}</h2>
              {request.message && <p id="confirm-message" className="text-bai-ink-soft leading-relaxed mt-2 break-words">{request.message}</p>}
            </div>
          </div>
          <div className="mt-7 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button ref={cancelRef} type="button" onClick={() => answer(false)} className="btn btn-outline">
              {request.cancelLabel || 'Cancel'}
            </button>
            <button type="button" onClick={() => answer(true)} className={`btn ${danger ? 'btn-danger-solid' : 'btn-primary'}`}>
              {request.confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
