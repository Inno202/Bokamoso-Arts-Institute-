import { cloudinaryService } from '../services/cloudinaryService';

/** Turns a stored image value into something an <img> can load, at a sensible size. */
export function contentImage(value: string | undefined | null, width = 800): string {
  if (!value) return '';
  if (value.startsWith('assets/')) return `${import.meta.env.BASE_URL}${value}`;
  return cloudinaryService.getOptimizedUrl(value, width);
}
