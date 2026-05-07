import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar as CalendarIcon, MapPin, Loader2, DollarSign } from 'lucide-react';
import { eventController } from '../../controllers/eventController';
import { useAuth } from './AuthProvider';
import { BAIEvent } from '../../models/types';

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
    date: event?.date ? (typeof event.date === 'string' ? event.date : new Date(event.date.seconds * 1000).toISOString().slice(0, 16)) : '',
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
        date: event.date ? (typeof event.date === 'string' ? event.date : new Date(event.date.seconds * 1000).toISOString().slice(0, 16)) : '',
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
    if (!formData.name || !formData.date) {
      alert('Please fill in at least the event name and date.');
      return;
    }
    
    setLoading(true);
    try {
      const { cloudinaryService } = await import('../../services/cloudinaryService');
      let bannerUrl = undefined;
      let ticketUrl = undefined;
      
      if (bannerFile) {
        const res = await cloudinaryService.upload(bannerFile, 'events');
        bannerUrl = res.url || res.publicId;
      }

      if (ticketFile) {
        const res = await cloudinaryService.upload(ticketFile, 'events');
        ticketUrl = res.url || res.publicId;
      }

      const eventData = {
        ...formData,
        date: new Date(formData.date),
        createdBy: event?.createdBy || user?.uid || 'admin',
        bannerImageUrl: bannerUrl || event?.bannerImageUrl || undefined,
        ticketImageUrl: ticketUrl || event?.ticketImageUrl || bannerUrl || event?.bannerImageUrl || undefined
      };

      if (event?.id) {
        console.log('Updating event:', event.id, eventData);
        await eventController.updateEvent(event.id, eventData);
        alert('Event updated successfully!');
      } else {
        console.log('Creating event:', eventData);
        await eventController.createEvent(eventData);
        alert('Event created successfully!');
      }
      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      console.error('Event creation error:', err);
      alert('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-bai-black/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-5 md:p-8 overflow-y-auto">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-bai-black/40 hover:text-bai-red transition-colors z-10"
            >
              <X size={20} />
            </button>

            <h2 className="font-display font-black text-xl md:text-2xl uppercase tracking-tighter italic mb-4">
              {event ? 'Edit' : 'Create'} <span className="text-bai-red">Event</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-[8px] md:text-[10px] font-black uppercase tracking-widest text-bai-black/40 mb-1">Event Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full h-10 text-sm bg-bai-bone rounded-xl px-4 outline-none focus:ring-2 focus:ring-bai-red transition-all"
                  placeholder="e.g. Summer Festival"
                />
              </div>
              
              <div>
                <label className="block text-[8px] md:text-[10px] font-black uppercase tracking-widest text-bai-black/40 mb-1">Date & Time</label>
                <div className="relative">
                  <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bai-black/40" />
                  <input 
                    type="datetime-local" 
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full h-10 text-sm bg-bai-bone rounded-xl pl-9 pr-4 outline-none focus:ring-2 focus:ring-bai-red transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8px] md:text-[10px] font-black uppercase tracking-widest text-bai-black/40 mb-1">Venue</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bai-black/40" />
                  <input 
                    type="text" 
                    required
                    value={formData.venue}
                    onChange={e => setFormData({...formData, venue: e.target.value})}
                    className="w-full h-10 text-sm bg-bai-bone rounded-xl pl-9 pr-4 outline-none focus:ring-2 focus:ring-bai-red transition-all"
                    placeholder="Venue Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8px] md:text-[10px] font-black uppercase tracking-widest text-bai-black/40 mb-1">City</label>
                <input 
                  type="text" 
                  required
                  value={formData.city}
                  onChange={e => setFormData({...formData, city: e.target.value})}
                  className="w-full h-10 text-sm bg-bai-bone rounded-xl px-4 outline-none focus:ring-2 focus:ring-bai-red transition-all"
                  placeholder="e.g. Pretoria"
                />
              </div>

              <div>
                <label className="block text-[8px] md:text-[10px] font-black uppercase tracking-widest text-bai-black/40 mb-1">Ticket Price (R)</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bai-black/40" />
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                    className="w-full h-10 text-sm bg-bai-bone rounded-xl pl-9 pr-4 outline-none focus:ring-2 focus:ring-bai-red transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8px] md:text-[10px] font-black uppercase tracking-widest text-bai-black/40 mb-1">Capacity</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  value={formData.capacity}
                  onChange={e => setFormData({...formData, capacity: Number(e.target.value)})}
                  className="w-full h-10 text-sm bg-bai-bone rounded-xl px-4 outline-none focus:ring-2 focus:ring-bai-red transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-bai-black/40 mb-1">Event Banner (16:9)</label>
                <div className="w-full h-10 bg-bai-bone rounded-xl px-4 flex items-center mb-3">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'banner')}
                    className="w-full text-xs outline-none"
                  />
                </div>
                {posterDataUrl && (
                  <div className="rounded-2xl overflow-hidden relative w-full border border-bai-black/10 shadow-inner bg-bai-bone p-2">
                    <img src={posterDataUrl} alt="Banner Preview" className="w-full h-auto max-h-48 object-contain mx-auto rounded-lg" />
                    <div className="absolute top-4 left-4 bg-bai-black/60 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded backdrop-blur-sm">Banner Preview</div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-bai-black/40 mb-1">Ticket Design (2:3)</label>
                <div className="w-full h-10 bg-bai-bone rounded-xl px-4 flex items-center mb-3">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'ticket')}
                    className="w-full text-xs outline-none"
                  />
                </div>
                {ticketDataUrl && (
                  <div className="rounded-2xl overflow-hidden relative w-32 mx-auto border border-bai-black/10 shadow-inner bg-bai-bone p-2">
                    <img src={ticketDataUrl} alt="Ticket Preview" className="w-full h-auto max-h-48 object-contain mx-auto rounded-lg" />
                    <div className="absolute top-4 left-4 bg-bai-black/60 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded backdrop-blur-sm">Ticket</div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-bai-black/40 mb-1">Description</label>
              <textarea 
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
              {loading ? <Loader2 className="animate-spin" size={16} /> : <span>{event ? 'Update' : 'Create'} Event</span>}
            </button>
          </form>
          </div>
        </motion.div>
      </div>

      {/* No cropper used */}
    </AnimatePresence>
  );
}
