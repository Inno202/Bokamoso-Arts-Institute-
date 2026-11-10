import React, { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { eventController } from '../../controllers/eventController';
import { useAuth } from '../components/AuthProvider';
import { BAIEvent } from '../../models/types';
import { cloudinaryService } from '../../services/cloudinaryService';
import { friendlyError, toDate } from '../../controllers/lib/utils';
import { toast } from '../../services/toast';
import { logger } from '../../services/loggerService';
import { EVENT_LIMITS, validateEvent, type EventForm } from '../../content/eventValidation';
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
});

interface Props {
  event?: BAIEvent | null;
  onClose: () => void;
}

export function EventFormDialog({ event, onClose }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState<EventForm>(() => formFor(event));
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
    const problems = validateEvent(form, event?.ticketsSold || 0);
    setErrors(problems);
    const first = Object.keys(problems)[0];
    if (first) {
      document.getElementById(`ev-${first}`)?.focus();
      return;
    }

    setSaving(true);
    try {
      const bannerUrl = bannerFile ? (await cloudinaryService.upload(bannerFile, 'events')).url : event?.bannerImageUrl;
      const ticketUrl = ticketFile ? (await cloudinaryService.upload(ticketFile, 'events')).url : (event?.ticketImageUrl || bannerUrl);
      const data = {
        name: form.name.trim(),
        venue: form.venue.trim(),
        city: form.city.trim(),
        description: form.description.trim(),
        status: form.status,
        price: Number(form.price),
        capacity: Number(form.capacity),
        date: new Date(form.date),
        createdBy: event?.createdBy || user?.uid || '',
        ...(bannerUrl ? { bannerImageUrl: bannerUrl } : {}),
        ...(ticketUrl ? { ticketImageUrl: ticketUrl } : {}),
      };
      if (event?.id) {
        await eventController.updateEvent(event.id, data);
        toast.success('Event updated.');
      } else {
        await eventController.createEvent(data);
        toast.success(form.status === 'On Sale' ? 'Event created. It is now on sale.' : 'Event saved.');
      }
      onClose();
    } catch (err) {
      logger.error('Saving the event failed', err);
      toast.error(friendlyError(err, 'The event could not be saved. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const input = (key: keyof EventForm, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, ref?: React.Ref<HTMLInputElement>) => (
    <div>
      <label htmlFor={`ev-${key}`} className="field-label">{label}</label>
      <input ref={ref} id={`ev-${key}`} value={form[key]} onChange={set(key)} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `ev-${key}-error` : undefined} className="field" {...props} />
      {errors[key] && <p id={`ev-${key}-error`} className="field-error">{errors[key]}</p>}
    </div>
  );

  const fileInput = (id: string, label: string, onPick: (file: File | null) => void, current?: string) => (
    <div>
      <label htmlFor={id} className="field-label">{label} <span className="font-normal text-bai-black/70">(optional)</span></label>
      <input id={id} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onPick(e.target.files?.[0] || null)} className="field py-2 text-sm file:mr-3 file:font-semibold" />
      {current && <p className="field-help">A photo is already set. Choose a file only to replace it.</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="event-dialog-title">
      <div onClick={onClose} className="absolute inset-0 bg-bai-black/70" aria-hidden="true" />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-[0_32px_80px_-24px_rgb(0_0_0/0.6)] max-h-[92dvh] overflow-y-auto">
        <form onSubmit={handleSubmit} noValidate className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <h2 id="event-dialog-title" className="display text-2xl md:text-3xl">{event ? 'Edit event' : 'New event'}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="icon-btn hover:bg-bai-black/10 -mt-2 -mr-2">
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {input('name', 'Event name', { maxLength: EVENT_LIMITS.name }, firstField)}
            {input('date', 'Date and time', { type: 'datetime-local' })}
            {input('venue', 'Venue', { maxLength: EVENT_LIMITS.venue })}
            {input('city', 'City', { maxLength: EVENT_LIMITS.city })}
            {input('price', 'Ticket price in rand', { type: 'number', inputMode: 'decimal', min: 0, step: '0.01', placeholder: 'For example 200' })}
            {input('capacity', 'Seats available', { type: 'number', inputMode: 'numeric', min: 1, step: 1 })}
            <div className="sm:col-span-2">
              <label htmlFor="ev-status" className="field-label">Status</label>
              <select id="ev-status" value={form.status} onChange={set('status')} className="field">
                <option value="On Sale">On sale (listed on the Events page)</option>
                <option value="Draft">Draft (hidden from visitors)</option>
                <option value="Closed">Closed (hidden, sales ended)</option>
              </select>
            </div>
            {fileInput('ev-banner', 'Banner photo', setBannerFile, event?.bannerImageUrl)}
            {fileInput('ev-ticket', 'Ticket artwork', setTicketFile, event?.ticketImageUrl)}
            <div className="sm:col-span-2">
              <label htmlFor="ev-description" className="field-label">Description <span className="font-normal text-bai-black/70">(optional)</span></label>
              <textarea id="ev-description" rows={3} value={form.description} onChange={set('description')} aria-invalid={!!errors.description} className="field leading-relaxed" />
              {errors.description && <p className="field-error">{errors.description}</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-8">
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
