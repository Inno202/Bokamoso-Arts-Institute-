
/**
 * Navigation Controller
 * Maps readable route keys to "hashed" or obfuscated paths.
 */

export const ROUTES = {
  HOME: '/',
  ABOUT: '/73a1x',
  PROGRAMS: '/8b2m2k',
  TOUR: '/5v7p9z',
  TRADITIONS: '/4b8n1s',
  DONATE: '/9d9q2w',
  SCANNER: '/scanner',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
} as const;

export type RouteKey = keyof typeof ROUTES;

/**
 * Utility to get a path by key
 */
export function getPath(key: RouteKey): string {
  return ROUTES[key];
}

/**
 * Reverse mapping for internal checks if needed
 */
export const PATH_TO_KEY = Object.fromEntries(
  Object.entries(ROUTES).map(([key, path]) => [path, key])
);
