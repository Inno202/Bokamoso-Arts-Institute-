import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { toast, type Toast } from '../../services/toast';

const ICONS = {
  success: <CheckCircle2 size={18} className="text-emerald-400 shrink-0" aria-hidden="true" />,
  error: <AlertCircle size={18} className="text-bai-red-soft shrink-0" aria-hidden="true" />,
  info: <Info size={18} className="text-sky-300 shrink-0" aria-hidden="true" />,
};

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => toast.subscribe(setItems), []);

  return (
    <div
      className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-6 sm:bottom-6 z-[200] flex flex-col gap-2 sm:w-96 pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {items.map(t => (
        <div
          key={t.id}
          role={t.kind === 'error' ? 'alert' : 'status'}
          className="toast-in pointer-events-auto flex items-start gap-3 bg-bai-black text-white rounded-lg pl-4 pr-2 py-3 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.45)]"
        >
          <span className="mt-0.5">{ICONS[t.kind]}</span>
          <p className="text-sm leading-snug flex-grow py-0.5">{t.message}</p>
          <button
            onClick={() => toast.dismiss(t.id)}
            aria-label="Dismiss notification"
            className="icon-btn -my-2 text-white/75 hover:text-white"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
