import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'SUPER_ADMIN' | 'PRO' | 'CEO' | 'FINANCE_MANAGER' | 'TICKET_SCANNER' | 'USER';

export const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'User',
  PRO: 'PR Officer',
  TICKET_SCANNER: 'Ticket Scanner',
  FINANCE_MANAGER: 'Finance Manager',
  CEO: 'CEO',
  SUPER_ADMIN: 'Super Admin',
};

// These mirror the role groups in firestore.rules. The rules are what actually
// enforce access; the helpers below only decide what the interface offers.
const inRoles = (roles: UserRole[]) => (role: UserRole | null | undefined) => !!role && roles.includes(role);
export const isAnyAdmin = inRoles(['SUPER_ADMIN', 'PRO', 'CEO', 'FINANCE_MANAGER']);
export const isUserAdmin = inRoles(['SUPER_ADMIN', 'CEO']);
export const isEventManager = inRoles(['SUPER_ADMIN', 'PRO', 'CEO']);
export const isScanner = inRoles(['SUPER_ADMIN', 'PRO', 'TICKET_SCANNER']);
export const isFinance = inRoles(['SUPER_ADMIN', 'CEO', 'FINANCE_MANAGER']);

/** Firestore timestamps arrive as Timestamp objects; older records may hold ISO strings. */
export type DateLike = Timestamp | { seconds: number } | string | Date | null | undefined;

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  photoURL?: string;
  createdAt: DateLike;
  lastLogin?: DateLike;
}

export interface BAIEvent {
  id: string;
  name: string;
  venue: string;
  city: string;
  date: DateLike;
  price: number;
  status: string;
  capacity: number;
  ticketsSold: number;
  description: string;
  ticketImageUrl?: string;
  bannerImageUrl?: string;
  createdAt: DateLike;
  createdBy: string;
}

export type TicketStatus = 'VALID' | 'SCANNED' | 'CANCELLED';

export interface Ticket {
  id: string;
  eventId: string;
  eventName?: string;
  ticketType: string;
  buyerEmail: string;
  buyerId: string;
  status: TicketStatus;
  createdAt: DateLike;
  price: number;
  quantity: number;
  scannedAt?: DateLike;
  scannedBy?: string;
}

export interface TicketScan {
  id: string;
  ticketId: string;
  scannedAt: DateLike;
  scannedBy: string;
  eventId: string;
  buyerEmail: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  photoURL: string;
  order: number;
  isActive: boolean;
}

export interface ContentDoc {
  id: string;
  slug: string;
  title: string;
  body: string;
  updatedAt: DateLike;
  updatedBy: string;
}

export interface CartItem {
  eventId: string;
  eventName: string;
  venue: string;
  date: DateLike;
  ticketType: string;
  price: number;
  quantity: number;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  total: number;
  updatedAt: DateLike;
}
