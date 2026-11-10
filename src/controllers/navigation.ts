export const ROUTES = {
  HOME: '/',
  ABOUT: '/about',
  PROGRAMS: '/programs',
  EVENTS: '/events',
  TRADITIONS: '/traditions',
  DONATE: '/donate',
  DASHBOARD: '/dashboard',
  SCANNER: '/scanner',
  LOGIN: '/login',
  REGISTER: '/register',
  CART: '/cart',
  CHECKOUT: '/checkout',
  MY_TICKETS: '/my-tickets',
  ADMIN_EVENTS: '/admin/events',
  ADMIN_CONTENT: '/admin/content',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  COOKIES: '/cookies',
};

/**
 * Where to send someone after sign-in. Only in-app paths are accepted, so a
 * crafted link can never bounce a visitor to another site.
 */
export function safeReturnPath(state: unknown): string | null {
  const from = (state as { from?: unknown } | null)?.from;
  const path = typeof from === 'string' ? from : (from as { pathname?: unknown } | null)?.pathname;
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return null;
  return Object.values(ROUTES).includes(path) ? path : null;
}
