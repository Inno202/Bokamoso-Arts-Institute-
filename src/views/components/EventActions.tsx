import { useEffect, useRef, useState } from 'react';
import { CalendarPlus, Share2 } from 'lucide-react';
import { downloadIcs, googleCalendarUrl, type CalendarEvent } from '../../services/calendar';
import { toast } from '../../services/toast';

/** The public address of an event's own page. */
export const eventPageUrl = (id: string) =>
  typeof window === 'undefined' ? '' : `${window.location.origin}${import.meta.env.BASE_URL}events/${encodeURIComponent(id)}`;

/**
 * "Add to calendar": a small menu with Google Calendar and the phone's own calendar (.ics).
 * `round` makes it a 44px icon button (used beside the ticket's Download button).
 */
export function AddToCalendar({ event, round = false }: { event: CalendarEvent; round?: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  const google = googleCalendarUrl(event);
  if (!google) return null;
  return (
    <div ref={box} className={`relative ${round ? 'shrink-0' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={round ? 'Add to calendar' : undefined}
        title={round ? 'Add to calendar' : undefined}
        className={round ? 'btn btn-outline w-[48px] px-0' : 'btn btn-outline btn-block'}
      >
        {round ? <CalendarPlus size={18} aria-hidden="true" /> : 'Add to calendar'}
      </button>
      {open && (
        <div role="menu" className={`absolute z-30 bottom-full mb-2 ${round ? 'right-0 w-[15rem]' : 'left-0 w-full min-w-[13rem]'} bg-white rounded-2xl shadow-[0_16px_40px_-12px_rgb(0_0_0/0.35)] border border-bai-black/10 p-1.5`}>
          <a role="menuitem" href={google} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="flex items-center min-h-[44px] px-4 rounded-xl hover:bg-bai-sand font-medium">
            Google Calendar
          </a>
          <button role="menuitem" type="button" onClick={() => { downloadIcs(event); setOpen(false); }} className="w-full text-left flex items-center min-h-[44px] px-4 rounded-xl hover:bg-bai-sand font-medium">
            Phone or Outlook calendar
          </button>
        </div>
      )}
    </div>
  );
}

/** Shares the event's page (the phone's share sheet, or copies the link). */
export function ShareEvent({ id, name, round = false }: { id: string; name: string; round?: boolean }) {
  const share = async () => {
    const url = eventPageUrl(id);
    const data = { title: name, text: `${name}: Bokamoso Arts Institute`, url };
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success('Link copied. Paste it into WhatsApp, a message or an email.');
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return; // closed the share sheet
      toast.info(`Copy this link to share: ${url}`);
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      aria-label={round ? `Share ${name}` : undefined}
      title={round ? 'Share' : undefined}
      className={round ? 'btn btn-outline shrink-0 w-[48px] px-0' : 'btn btn-outline btn-block'}
    >
      {round ? <Share2 size={18} aria-hidden="true" /> : 'Share'}
    </button>
  );
}
