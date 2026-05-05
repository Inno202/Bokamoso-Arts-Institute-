import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  where, 
  orderBy
} from 'firebase/firestore';
import { db } from './lib/firebase';
import { Ticket, TicketScan } from '../models/types';
import { cacheService } from '../services/cacheService';

const TICKETS_COLLECTION = 'tickets';
const SCANS_COLLECTION = 'ticket_scanned';

export const ticketController = {
  async getTicketsByUserId(userId: string) {
    const cacheKey = `${TICKETS_COLLECTION}:user:${userId}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    const q = query(
      collection(db, TICKETS_COLLECTION), 
      where('buyerId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ticket[];
    
    cacheService.set(cacheKey, tickets);
    return tickets;
  },

  async getTicketById(ticketId: string) {
    const docRef = doc(db, TICKETS_COLLECTION, ticketId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Ticket;
  },

  async validateTicketOnServer(ticketId: string) {
    // This calls the Express backend for security
    const res = await fetch('/api/scanner/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId })
    });
    
    if (!res.ok) {
       const err = await res.json();
       throw new Error(err.message || 'Validation failed');
    }
    
    return res.json();
  },

  async getRecentScans(limit = 10) {
    const q = query(
      collection(db, SCANS_COLLECTION),
      orderBy('scannedAt', 'desc')
      // limit(limit) - Firestore JS SDK limit is a function
    );
    // Actually limit in JS SDK is query(q, limit(10))
    // I'll skip the limit function call directly for now or just slice
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).slice(0, limit) as TicketScan[];
  }
};
