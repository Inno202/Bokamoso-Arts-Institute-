import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  setDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from './lib/firebase';
import { Ticket, TicketScan } from '../models/types';
import { cacheService } from '../services/cacheService';

const TICKETS_COLLECTION = 'tickets';
const SCANS_COLLECTION = 'ticket_scanned';

export const ticketController = {
  async getUserTickets(userId: string) {
    return this.getTicketsByUserId(userId);
  },

  async createTicket(ticketData: any) {
    const id = ticketData.id;
    const ticketRef = doc(db, TICKETS_COLLECTION, id);
    const finalData = {
      ...ticketData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(ticketRef, finalData);
    cacheService.clear(); // Clear cache to show new ticket
    return { id, ...finalData };
  },

  async getTicketsByUserId(userId: string) {
    const cacheKey = `${TICKETS_COLLECTION}:user:${userId}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    const q = query(
      collection(db, TICKETS_COLLECTION), 
      where('buyerId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ticket[];
    
    // Sort manually if needed, or just return as is
    const sortedTickets = tickets.sort((a: any, b: any) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });

    cacheService.set(cacheKey, sortedTickets);
    return sortedTickets;
  },

  subscribeToUserTickets(userId: string, callback: (tickets: Ticket[]) => void) {
    const q = query(
      collection(db, TICKETS_COLLECTION),
      where('buyerId', '==', userId)
    );

    return onSnapshot(q, (snapshot) => {
      const tickets = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as Ticket[];
      
      const sortedTickets = tickets.sort((a: any, b: any) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      callback(sortedTickets);
    }, (error: any) => {
      console.error("Subscription error:", error);
    });
  },

  async getTicketById(ticketId: string) {
    const docRef = doc(db, TICKETS_COLLECTION, ticketId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Ticket;
  },

  async validateTicketOnServer(ticketId: string) {
    const { doc, getDoc, setDoc, query, collection, where, orderBy, limit, getDocs, updateDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('./lib/firebase');
    const { auth } = await import('./lib/firebase');
    
    // In a real app we would use a Firestore Transaction here.
    const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
    const ticketSnap = await getDoc(ticketRef);
    if (!ticketSnap.exists()) throw new Error("Ticket not found");
    const ticket = ticketSnap.data() as Ticket;

    const scanSnap = await getDocs(query(
      collection(db, SCANS_COLLECTION),
      where('ticketId', '==', ticketId),
      orderBy('scannedAt', 'desc'),
      limit(1)
    ));

    if (!scanSnap.empty) {
      const lastScan = scanSnap.docs[0].data();
      // Throw specific error for Already Scanned
      throw new Error(`Already scanned at ${lastScan.scannedAt?.toDate()?.toLocaleString()}`);
    }

    const scannerId = auth.currentUser?.uid || 'UNKNOWN_SCANNER';

    // Log the scan
    await setDoc(doc(collection(db, SCANS_COLLECTION)), {
      ticketId,
      scannedAt: serverTimestamp(),
      scannedBy: scannerId,
      eventId: ticket.eventId,
      buyerEmail: ticket.buyerEmail,
      status: 'SUCCESS'
    });

    // Update ticket
    await updateDoc(ticketRef, { status: 'SCANNED' });

    return { success: true, message: "Valid Ticket", ticket };
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
