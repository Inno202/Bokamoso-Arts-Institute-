export type UserRole = 'SUPER_ADMIN' | 'CEO' | 'FINANCE_MANAGER' | 'PUBLIC_RELATIONS' | 'TICKET_SCANNER' | 'USER';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  photoURL?: string;
  createdAt: any;
  lastLogin?: any;
}

export interface BAIEvent {
  id: string;
  name: string;
  venue: string;
  city: string;
  date: any;
  price: number;
  status: string;
  capacity: number;
  ticketsSold: number;
  description: string;
  ticketImageUrl?: string;
  bannerImageUrl?: string;
  createdAt: any;
  createdBy: string;
}

export interface TicketStatus {
  status: 'VALID' | 'SCANNED' | 'CANCELLED';
}

export interface Ticket {
  id: string;
  eventId: string;
  ticketType: string;
  buyerEmail: string;
  buyerId: string;
  status: 'VALID' | 'SCANNED' | 'CANCELLED';
  createdAt: any;
  qrCode: string;
  downloadUrl?: string;
  price: number;
  seatInfo?: string;
  quantity: number;
  ticketImageUrl?: string;
}

export interface TicketScan {
  id: string;
  ticketId: string;
  scannedAt: any;
  scannedBy: string;
  eventId: string;
  buyerEmail: string;
  deviceInfo?: string;
  location?: string;
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
  updatedAt: any;
  updatedBy: string;
}

export interface CartItem {
  eventId: string;
  eventName: string;
  venue: string;
  date: any;
  ticketType: string;
  price: number;
  quantity: number;
  ticketImageUrl?: string;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  total: number;
  updatedAt: any;
}
