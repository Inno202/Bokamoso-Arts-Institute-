import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, MapPin, Loader2 } from 'lucide-react';
import { eventController } from '../../controllers/eventController';
import { useAuth } from './AuthProvider';
import { BAIEvent } from '../../models/types';
import { cloudinaryService } from '../../services/cloudinaryService';
import { friendlyError, toDate } from '../../controllers/lib/utils';
import { toast } from '../../services/toast';
import { logger } from '../../services/loggerService';

/** datetime-local wants local wall-clock time, not UTC. */
const toLocalInput = (date: BAIEvent['date']) => {
  const d = toDate(date);
  if (!d) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

interface NewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  event?: BAIEvent | null;
}

export function NewEventModal({ isOpen, onClose, onCreated, event }: NewEventModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [posterDataUrl, setPosterDataUrl] = useState<string | null>(event?.bannerImageUrl || null);
  const [ticketDataUrl, setTicketDataUrl] = useState<string | null>(event?.ticketImageUrl || null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: event?.name || '',
    venue: event?.venue || '',
    city: event?.city || '',
    date: toLocalInput(event?.date),
    price: event?.price || 0,
    capacity: event?.capacity || 100,
    description: event?.description || '',
    status: event?.status || 'On Sale'
  });

  // Update form data when event changes
  useEffect(() => {
    if (event) {
      setFormData({
        name: event.name,
        venue: event.venue,
        city: event.city,
        date: toLocalInput(event.date),
        price: event.price,
        capacity: event.capacity,
        description: event.description,
        status: event.status
      });
      setPosterDataUrl(event.bannerImageUrl || null);
      setTicketDataUrl(event.ticketImageUrl || null);
    } else if (isOpen) {
      setFormData({
        name: '',
        venue: '',
        city: '',
        date: '',
        price: 0,
        capacity: 100,
        description: '',
        status: 'On Sale'
      });
      setPosterDataUrl(null);
      setTicketDataUrl(null);
      setBannerFile(null);
      setTicketFile(null);
    }
  }, [event, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'ticket') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (type === 'banner') {
          setBannerFile(file);
          setPosterDataUrl(reader.result as string);
        } else {
          setTicketFile(file);
          setTicketDataUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const date = new Date(formData.date);
    if (!formData.name.trim() || Number.isNaN(date.getTime())) {
      toast.error('Add an event name and a valid date.');
      return;
    }

    setLoading(true);
    try {
      const bannerUrl = bannerFile ? (await cloudinaryService.upload(bannerFile, 'events')).url : event?.bannerImageUrl;
      const ticketUrl = ticketFile ? (await cloudinaryService.upload(ticketFile, 'events')).url : (event?.ticketImageUrl || bannerUrl);

      const eventData = {
        name: formData.name.trim(),
        venue: formData.venue.trim(),
        city: formData.city.trim(),
        description: formData.description.trim(),
        status: formData.status,
        price: Math.max(0, Number(formData.price) || 0),
        capacity: Math.max(1, Math.floor(Number(formData.capacity) || 1)),
        date,
        createdBy: event?.createdBy || user?.uid || '',
        ...(bannerUrl ? { bannerImageUrl: bannerUrl } : {}),
        ...(ticketUrl ? { ticketImageUrl: ticketUrl } : {}),
      };

      if (event?.id) {
        if (eventData.capacity < (event.ticketsSold || 0)) {
          toast.error(`${event.ticketsSold} tickets are already issued, so capacity cannot go below that.`);
          return;
        }
        await eventController.updateEvent(event.id, eventData);
        toast.success('Event updated.');
      } else {
        await eventController.createEvent(eventData);
        toast.success('Event created. It is now on sale.');
      }
      onCreated?.();
      onClose();
    } catch (err) {
      logger.error('Saving the event failed', err);
      toast.error(friendlyError(err, 'The event could not be saved. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Escape closes the dialog.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="event-modal-title">
        <div onClick={onClose} className="absolute inset-0 bg-bai-black/70" aria-hidden="true" />

        <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-[0_32px_80px_-24px_rgb(0_0_0/0.6)] overflow-hidden flex flex-col max-h-[90dvh]">
          <div className="p-5 md:p-8 overflow-y-auto">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center text-bai-black/70 hover:text-bai-red transition-colors z-10 rounded-full"
            >
              <X size={20} aria-hidden="true" />
            </button>

            <h2 id="event-modal-title" className="font-display font-bold text-xl md:text-2xl uppercase tracking-tighter italic mb-4">
              {event ? 'Edit' : 'Create'} <span className="text-bai-red">Event</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label htmlFor="ev-name" className="block text-xs font-bold uppercase tracking-widest text-bai-black/70 mb-1">Event Name</label>
                <input id="ev-name" 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full h-11 text-sm bg-bai-bone rounded-xl px-4 outline-none focus:ring-2 focus:ring-bai-red transition-all"
                  placeholder="e.g. Summer Festival"
                />
              </div>
              
              <div>
                <label htmlFor="ev-date" className="block text-xs font-bold uppercase tracking-widest text-bai-black/70 mb-1">Date & Time</label>
                <div className="relative">
                  <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bai-black/40" />
                  <input id="ev-date" 
                    type="datetime-local" 
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full h-11 text-sm bg-bai-bone rounded-xl pl-9 pr-4 outline-none focus:ring-2 focus:ring-bai-red transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ev-venue" className="block text-xs font-bold uppercase tracking-widest text-bai-black/70 mb-1">Venue</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bai-black/40" />
                  <input id="ev-venue" 
                    type="text" 
                    required
                    value={formData.venue}
                    onChange={e => setFormData({...formData, venue: e.target.value})}
                    className="w-full h-11 text-sm bg-bai-bone rounded-xl pl-9 pr-4 outline-none focus:ring-2 focus:ring-bai-red transition-all"
                    placeholder="Venue Name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ev-city" className="block text-xs font-bold uppercase tracking-widest text-bai-black/70 mb-1">City</label>
                <input id="ev-city" 
                  type="text" 
                  required
                  value={formData.city}
                  onChange={e => setFormData({...formData, city: e.target.value})}
                  className="w-full h-11 text-sm bg-bai-bone rounded-xl px-4 outline-none focus:ring-2 focus:ring-bai-red transition-all"
                  placeholder="e.g. Pretoria"
                />
              </div>

              <div>
                <label htmlFor="ev-price" className="block text-xs font-bold uppercase tracking-widest text-bai-black/70 mb-1">Ticket Price (R)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bai-black/70 text-sm font-bold" aria-hidden="true">R</span>
                  <input id="ev-price" 
                    type="number" 
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                    className="w-full h-11 text-sm bg-bai-bone rounded-xl pl-9 pr-4 outline-none focus:ring-2 focus:ring-bai-red transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ev-capacity" className="block text-xs font-bold uppercase tracking-widest text-bai-black/70 mb-1">Capacity</label>
                <input id="ev-capacity" 
                  type="number" 
                  required
                  min="1"
                  value={formData.capacity}
                  onChange={e => setFormData({...formData, capacity: Number(e.target.value)})}
                  className="w-full h-11 text-sm bg-bai-bone rounded-xl px-4 outline-none focus:ring-2 focus:ring-bai-red transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="ev-status" className="block text-xs font-bold uppercase tracking-widest text-bai-black/70 mb-1">Status</label>
              <select id="ev-status"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="w-full h-11 text-sm bg-bai-bone rounded-xl px-4 outline-none focus:ring-2 focus:ring-bai-red transition-all"
              >
                <option value="On Sale">On sale (listed on the Events page)</option>
                <option value="Draft">Draft (hidden from visitors)</option>
                <option value="Closed">Closed (hidden, sales ended)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ev-banner" className="block text-xs font-bold uppercase tracking-widest text-bai-black/70 mb-1">Event Banner (16:9)</label>
                <div className="w-full h-10 bg-bai-bone rounded-xl px-4 flex items-center mb-3">
                  <input id="ev-banner" 
                    type="file" 
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleImageChange(e, 'banner')}
                    className="w-full text-xs outline-none"
                  />
                </div>
                {posterDataUrl && (
                  <div className="rounded-2xl overflow-hidden relative w-full border border-bai-black/10 shadow-inner bg-bai-bone p-2">
                    <img src={posterDataUrl} alt="Banner Preview" className="w-full h-auto max-h-48 object-contain mx-auto rounded-lg" />
                    <div className="absolute top-4 left-4 bg-bai-black/80 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ">Banner Preview</div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="ev-ticket" className="block text-xs font-bold uppercase tracking-widest text-bai-black/70 mb-1">Ticket Design (2:3)</label>
                <div className="w-full h-10 bg-bai-bone rounded-xl px-4 flex items-center mb-3">
                  <input id="ev-ticket" 
                    type="file" 
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleImageChange(e, 'ticket')}
                    className="w-full text-xs outline-none"
                  />
                </div>
                {ticketDataUrl && (
                  <div className="rounded-2xl overflow-hidden relative w-32 mx-auto border border-bai-black/10 shadow-inner bg-bai-bone p-2">
                    <img src={ticketDataUrl} alt="Ticket Preview" className="w-full h-auto max-h-48 object-contain mx-auto rounded-lg" />
                    <div className="absolute top-4 left-4 bg-bai-black/80 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ">Ticket</div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="ev-desc" className="block text-xs font-bold uppercase tracking-widest text-bai-black/70 mb-1">Description</label>
              <textarea id="ev-desc" 
                required
                rows={2}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full text-sm bg-bai-bone rounded-xl p-3 outline-none focus:ring-2 focus:ring-bai-red transition-all resize-none"
                placeholder="Tell us about the event..."
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-bai-black text-white rounded-xl text-sm font-display font-black uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-bai-red transition-all disabled:opacity-50 mt-6"
            >
              {loading ? <Loader2 className="animate-spin" size={16} aria-label="Saving" /> : <span>{event ? 'Update' : 'Create'} Event</span>}
            </button>
          </form>
          </div>
        </div>
      </div>
  );
}
