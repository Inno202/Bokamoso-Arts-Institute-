import React, { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { eventController } from '../../controllers/eventController';
import { useAuth } from '../components/AuthProvider';
import { BAIEvent } from '../../models/types';
import { cloudinaryService } from '../../services/cloudinaryService';
import { formatCurrency, friendlyError, toDate } from '../../controllers/lib/utils';
import { FALLBACK_EVENT_IMAGE } from '../../config';
import { toast } from '../../services/toast';
import { logger } from '../../services/loggerService';
import { EVENT_LIMITS, validateEvent, type EventForm } from '../../content/eventValidation';
import { CURRENCIES, currencyOf } from '../../models/currency';
import { LEGACY_TYPE_NAME, MAX_TYPES, TYPE_IDS, TYPE_NAME_LIMIT, hasTicketTypes, ticketTypesOf } from '../../models/ticketTypes';
import { useActivity } from '../components/useActivity';
import type { Errors } from '../../content/fields';

/** datetime-local wants local wall-clock time, not UTC. */
const toLocalInput = (date: BAIEvent['date']) => {
  const d = toDate(date);
  if (!d) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const formFor = (event?: BAIEvent | null): EventForm => ({
  name: event?.name ?? '',
  venue: event?.venue ?? '',
  city: event?.city ?? '',
  date: toLocalInput(event?.date),
  // A new event starts with an empty price: staff must decide it, it is never assumed.
  price: event ? String(event.price) : '',
  capacity: event ? String(event.capacity) : '100',
  description: event?.description ?? '',
  status: event?.status ?? 'On Sale',
  currency: currencyOf(event?.currency),
  ticketUrl: event?.ticketUrl ?? '',
  ticketProvider: event?.ticketProvider ?? '',
  // Older events (no ticket types) become one "General Admission" row, keeping what was sold.
  types: event
    ? ticketTypesOf(event).map((t, i) => ({ id: hasTicketTypes(event) ? t.id : TYPE_IDS[i], name: t.name, price: String(t.price), capacity: String(t.capacity), sold: t.sold }))
    : [{ id: 't1', name: LEGACY_TYPE_NAME, price: '', capacity: '100', sold: 0 }],
});

interface Props {
  event?: BAIEvent | null;
  /** Start a new event as a copy of this one (for the next stop on a tour). */
  copyFrom?: BAIEvent | null;
  onClose: () => void;
}

/** A copy keeps the venue, ticket types, prices and pictures; it gets a new date, starts as a Draft, and nothing is sold. */
const copyFormFor = (source: BAIEvent): EventForm => {
  const f = formFor(source);
  return { ...f, name: `${source.name} (copy)`.slice(0, EVENT_LIMITS.name), date: '', status: 'Draft', types: (f.types || []).map(t => ({ ...t, sold: 0 })) };
};

export function EventFormDialog({ event, copyFrom, onClose }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState<EventForm>(() => (copyFrom && !event ? copyFormFor(copyFrom) : formFor(event)));
  // Pictures already chosen: the event's own, or the copied event's.
  const existingBanner = event?.bannerImageUrl || copyFrom?.bannerImageUrl;
  const existingTicket = event?.ticketImageUrl || copyFrom?.ticketImageUrl;
  const record = useActivity();
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    firstField.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const set = (key: keyof EventForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(current => ({ ...current, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problems: Errors = { ...validateEvent(form, event?.ticketsSold || 0) };
    // Both pictures are required: the banner shows on the event card, the artwork on tickets.
    if (!bannerFile && !existingBanner) problems.banner = 'Add a banner photo for the event card.';
    if (!ticketFile && !existingTicket) problems.ticket = 'Add the ticket artwork.';
    setErrors(problems);
    const first = Object.keys(problems)[0];
    if (first) {
      document.getElementById(`ev-${first}`)?.focus();
      return;
    }

    setSaving(true);
    try {
      const bannerUrl = bannerFile ? (await cloudinaryService.upload(bannerFile, 'events')).url : existingBanner;
      const ticketArtUrl = ticketFile ? (await cloudinaryService.upload(ticketFile, 'events')).url : (existingTicket || bannerUrl);
      const rows = form.types || [];
      const data = {
        name: form.name.trim(),
        venue: form.venue.trim(),
        city: form.city.trim(),
        description: form.description.trim(),
        status: form.status,
        // The event's own price is the lowest ticket price (for "From ..."), its capacity the total.
        price: Math.min(...rows.map(t => Number(t.price))),
        capacity: rows.reduce((sum, t) => sum + Number(t.capacity), 0),
        ticketTypes: Object.fromEntries(rows.map(t => [t.id, { name: t.name.trim(), price: Number(t.price), capacity: Number(t.capacity) }])),
        // Sales counts are only set on a new event, or when an older event first gets ticket
        // types. Ordinary edits never write them, so a sale during editing is never undone.
        ...(!event || !hasTicketTypes(event) ? { typeSold: Object.fromEntries(rows.map(t => [t.id, t.sold])) } : {}),
        date: new Date(form.date),
        currency: form.currency,
        // Empty when tickets are sold on this site; cleared values are saved as empty.
        ticketUrl: form.ticketUrl.trim(),
        ticketProvider: form.ticketUrl.trim() ? form.ticketProvider.trim() : '',
        createdBy: event?.createdBy || user?.uid || '',
        ...(bannerUrl ? { bannerImageUrl: bannerUrl } : {}),
        ...(ticketArtUrl ? { ticketImageUrl: ticketArtUrl } : {}),
      };
      if (event?.id) {
        await eventController.updateEvent(event.id, data);
        toast.success('Event updated.');
        void record('event.updated', `Edited the event "${data.name}" (${form.status}).`, event.id);
      } else {
        const id = await eventController.createEvent(data);
        toast.success(form.status === 'On Sale' ? 'Event created. It is now on sale.' : 'Event saved.');
        void record('event.created', `Created the event "${data.name}" for ${data.date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} (${form.status}).`, typeof id === 'string' ? id : '');
      }
      onClose();
    } catch (err) {
      logger.error('Saving the event failed', err);
      toast.error(friendlyError(err, 'The event could not be saved. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const setType = (i: number, field: 'name' | 'price' | 'capacity', value: string) =>
    setForm(current => ({ ...current, types: (current.types || []).map((t, n) => (n === i ? { ...t, [field]: value } : t)) }));
  const addType = () => setForm(current => {
    const used = new Set((current.types || []).map(t => t.id));
    const id = TYPE_IDS.find(x => !used.has(x));
    return id ? { ...current, types: [...(current.types || []), { id, name: '', price: '', capacity: '50', sold: 0 }] } : current;
  });
  const removeType = (i: number) => setForm(current => ({ ...current, types: (current.types || []).filter((_, n) => n !== i) }));
  const typeInput = (i: number, field: 'name' | 'price' | 'capacity', label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => {
    const key = `type-${i}-${field}`;
    const t = (form.types || [])[i];
    return (
      <div>
        <label htmlFor={`ev-${key}`} className="field-label">{label}</label>
        <input id={`ev-${key}`} value={t[field]} onChange={e => setType(i, field, e.target.value)} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `ev-${key}-error` : undefined} className="field" {...props} />
        {errors[key] && <p id={`ev-${key}-error`} className="field-error">{errors[key]}</p>}
      </div>
    );
  };

  const input = (key: Exclude<keyof EventForm, 'types'>, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, ref?: React.Ref<HTMLInputElement>) => (
    <div>
      <label htmlFor={`ev-${key}`} className="field-label">{label}</label>
      <input ref={ref} id={`ev-${key}`} value={form[key]} onChange={set(key)} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `ev-${key}-error` : undefined} className="field" {...props} />
      {errors[key] && <p id={`ev-${key}-error`} className="field-error">{errors[key]}</p>}
    </div>
  );

  const fileInput = (key: 'banner' | 'ticket', label: string, onPick: (file: File | null) => void, current: string | undefined, sizeHint: string) => {
    const id = `ev-${key}`;
    const error = errors[key];
    return (
      <div>
        <label htmlFor={id} className="field-label">{label}</label>
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-required="true"
          aria-invalid={!!error}
          aria-describedby={[error && `${id}-error`, `${id}-size`].filter(Boolean).join(' ')}
          onChange={(e) => {
            onPick(e.target.files?.[0] || null);
            if (e.target.files?.[0]) setErrors(({ [key]: _done, ...rest }) => rest);
          }}
          className="field py-2 text-sm file:mr-3 file:font-semibold"
        />
        {error && <p id={`${id}-error`} className="field-error">{error}</p>}
        <p id={`${id}-size`} className="field-help">{sizeHint}</p>
        {current && <p className="field-help">A photo is already set. Choose a file only to replace it.</p>}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="event-dialog-title">
      <div onClick={onClose} className="absolute inset-0 bg-bai-black/70" aria-hidden="true" />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-[0_32px_80px_-24px_rgb(0_0_0/0.6)] max-h-[92dvh] overflow-y-auto">
        <form onSubmit={handleSubmit} noValidate className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <h2 id="event-dialog-title" className="display text-2xl md:text-3xl">{event ? 'Edit event' : copyFrom ? 'Duplicate event' : 'New event'}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="icon-btn hover:bg-bai-black/10 -mt-2 -mr-2">
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {input('name', 'Event name', { maxLength: EVENT_LIMITS.name }, firstField)}
            {input('date', 'Date and time', { type: 'datetime-local' })}
            {input('venue', 'Venue', { maxLength: EVENT_LIMITS.venue })}
            {input('city', 'City', { maxLength: EVENT_LIMITS.city })}
            <div>
              <label htmlFor="ev-currency" className="field-label">Currency</label>
              <select id="ev-currency" value={form.currency} onChange={set('currency')} aria-invalid={!!errors.currency} className="field">
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.symbol})</option>)}
              </select>
              {errors.currency && <p className="field-error">{errors.currency}</p>}
            </div>
            <fieldset className="sm:col-span-2 border-t border-bai-black/10 pt-5">
              <legend className="font-semibold pr-3">Ticket types</legend>
              <p className="field-help mb-4">Prices in {form.currency === 'EUR' ? 'euros' : CURRENCIES.find(c => c.code === form.currency)?.name || 'rand'}. Add types such as VIP or Early bird, each with its own price and seats.</p>
              {errors.types && <p className="field-error mb-3">{errors.types}</p>}
              <ul className="space-y-4">
                {(form.types || []).map((t, i) => (
                  <li key={t.id} className="rounded-2xl border border-bai-black/10 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem_7rem] gap-3">
                      {typeInput(i, 'name', 'Name', { maxLength: TYPE_NAME_LIMIT, placeholder: 'For example VIP' })}
                      {typeInput(i, 'price', 'Price', { type: 'number', inputMode: 'decimal', min: 0, step: '0.01', placeholder: '200' })}
                      {typeInput(i, 'capacity', 'Seats', { type: 'number', inputMode: 'numeric', min: 1, step: 1 })}
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-2">
                      <p className="text-sm text-bai-black/70">{t.sold > 0 ? `${t.sold} already issued` : ''}</p>
                      {(form.types || []).length > 1 && (
                        t.sold > 0
                          ? <p className="text-sm text-bai-black/70">Cannot be removed: tickets are issued.</p>
                          : <button type="button" onClick={() => removeType(i)} className="text-sm font-semibold text-bai-red-deep underline min-h-[44px]">Remove {t.name.trim() || 'this type'}</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {(form.types || []).length < MAX_TYPES && (
                <button type="button" onClick={addType} className="btn btn-outline mt-4">
                  Add a ticket type
                </button>
              )}
            </fieldset>
            <div className="sm:col-span-2">
              <label htmlFor="ev-status" className="field-label">Status</label>
              <select id="ev-status" value={form.status} onChange={set('status')} className="field">
                <option value="On Sale">On sale (listed on the Events page)</option>
                <option value="Draft">Draft (hidden from visitors)</option>
                <option value="Closed">Closed (hidden, sales ended)</option>
                <option value="Cancelled">Cancelled (tickets not accepted at the door)</option>
              </select>
            </div>
            <fieldset className="sm:col-span-2 border-t border-bai-black/15 pt-5">
              <legend className="font-semibold pr-3">Sold somewhere else? <span className="font-normal text-bai-black/70">(optional)</span></legend>
              <p className="field-help mb-4">For a show where the venue or a ticket seller, such as MojaTicket, sells the tickets. Visitors get a button to buy there instead of adding the ticket to their bag here.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {input('ticketProvider', 'Who sells the tickets', { maxLength: EVENT_LIMITS.ticketProvider, placeholder: 'For example MojaTicket' })}
                {input('ticketUrl', 'Link to their ticket page', { type: 'url', inputMode: 'url', maxLength: EVENT_LIMITS.ticketUrl, placeholder: 'https://', spellCheck: false, autoComplete: 'off' })}
              </div>
            </fieldset>
            {fileInput('banner', 'Banner photo', setBannerFile, existingBanner, 'Best size: 1600 × 1200, landscape (4:3). Square posters work too; keep text away from the top and bottom edges.')}
            {fileInput('ticket', 'Ticket artwork', setTicketFile, existingTicket, 'Best size: 1200 × 1200, square.')}
            <div className="sm:col-span-2">
              <label htmlFor="ev-description" className="field-label">Description <span className="font-normal text-bai-black/70">(optional)</span></label>
              <textarea id="ev-description" rows={3} value={form.description} onChange={set('description')} aria-invalid={!!errors.description} className="field leading-relaxed" />
              {errors.description && <p className="field-error">{errors.description}</p>}
            </div>
          </div>

          <EventPreview form={form} bannerFile={bannerFile} ticketFile={ticketFile} existingBanner={existingBanner} existingTicket={existingTicket} />

          <div className="even-row mt-8">
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving && <Loader2 className="animate-spin" size={16} aria-hidden="true" />}
              <span>{saving ? 'Saving' : event ? 'Save event' : 'Create event'}</span>
            </button>
            <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** A local preview address for a chosen file, released when it changes. */
function useFileUrl(file: File | null) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file) { setUrl(''); return; }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

/**
 * How the event will look before it is saved: its card on the Events page (the banner
 * cropped to 4:3) and the top of an opened ticket (the artwork cropped to a wide strip).
 */
function EventPreview({ form, bannerFile, ticketFile, existingBanner, existingTicket }: {
  form: EventForm; bannerFile: File | null; ticketFile: File | null; existingBanner?: string; existingTicket?: string;
}) {
  const bannerLocal = useFileUrl(bannerFile);
  const ticketLocal = useFileUrl(ticketFile);
  const banner = bannerLocal || cloudinaryService.getOptimizedUrl(existingBanner, 800) || FALLBACK_EVENT_IMAGE;
  const ticketArt = ticketLocal || cloudinaryService.getOptimizedUrl(existingTicket, 800) || banner;
  const prices = (form.types || []).map(t => Number(t.price)).filter(n => Number.isFinite(n));
  const min = prices.length ? Math.min(...prices) : NaN;
  const max = prices.length ? Math.max(...prices) : NaN;
  const money = (n: number) => (n > 0 ? formatCurrency(n, form.currency) : 'Free');
  const badge = !prices.length ? '' : min === max ? money(max) : `From ${money(min)}`;
  const date = form.date ? new Date(form.date) : null;
  const when = date && !Number.isNaN(date.getTime()) ? date.toLocaleString('en-ZA', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(',', ' ·') : 'Date not set';
  return (
    <section className="mt-8 border-t border-bai-black/10 pt-6" aria-labelledby="ev-preview-heading">
      <h3 id="ev-preview-heading" className="font-semibold mb-1">Preview</h3>
      <p className="field-help mb-4">How visitors will see it{form.status !== 'On Sale' ? ` once it is on sale (it is ${form.status.toLowerCase()} now)` : ''}. Pictures you choose show here before saving.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
        <div>
          <p className="text-sm text-bai-black/70 mb-2">Event card</p>
          <div className="panel overflow-hidden">
            <div className="relative aspect-[4/3] bg-bai-sand">
              <img src={banner} alt="" className="w-full h-full object-cover" />
              {badge && <span className="num absolute top-3 right-3 bg-white px-3 py-1 rounded-full font-semibold text-sm">{badge}</span>}
            </div>
            <div className="p-4">
              <p className="num text-sm text-bai-red-deep font-semibold">{when}</p>
              <p className="font-serif font-semibold text-2xl leading-tight mt-1 line-clamp-2 break-words">{form.name.trim() || 'Event name'}</p>
              <p className="text-sm text-bai-ink-soft mt-1 truncate">{[form.venue.trim(), form.city.trim()].filter(Boolean).join(', ') || 'Venue, city'}</p>
            </div>
          </div>
        </div>
        <div>
          <p className="text-sm text-bai-black/70 mb-2">Top of an opened ticket</p>
          <div className="relative h-24 rounded-2xl overflow-hidden bg-bai-black">
            <img src={ticketArt} alt="" className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/10" aria-hidden="true" />
            <p className="absolute bottom-2 left-4 right-4 font-serif font-semibold text-xl text-white truncate">{form.name.trim() || 'Event name'}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
