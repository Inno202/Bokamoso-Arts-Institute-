import { cloudinaryService } from '../services/cloudinaryService';

/** Smaller copies made of each built-in photo (public/assets/photos/name-640.jpg, name-1024.jpg). */
const LOCAL_WIDTHS = [640, 1024];
const isLocalPhoto = (value: string) => /^assets\/photos\/[\w-]+\.jpg$/.test(value) && !/-(640|1024)\.jpg$/.test(value);
const localAt = (value: string, width: number) => {
  const fit = LOCAL_WIDTHS.find(w => width <= w);
  return `${import.meta.env.BASE_URL}${fit ? value.replace(/\.jpg$/, `-${fit}.jpg`) : value}`;
};

/** Turns a stored image value into something an <img> can load, at a sensible size. */
export function contentImage(value: string | undefined | null, width = 800): string {
  if (!value) return '';
  if (isLocalPhoto(value)) return localAt(value, width);
  if (value.startsWith('assets/')) return `${import.meta.env.BASE_URL}${value}`;
  return cloudinaryService.getOptimizedUrl(value, width);
}

/**
 * For photos that fill the width of the screen: the same photo at several sizes, so a phone
 * downloads a phone-sized file and a large screen a large one. `sizes` says how wide the
 * photo is shown. Images that cannot be resized get the plain `src` only.
 */
export function responsiveImage(value: string | undefined | null, sizes = '100vw', largest = 2000) {
  const src = contentImage(value, largest);
  if (!value) return { src };
  let srcSet: string | undefined;
  if (isLocalPhoto(value)) {
    srcSet = [...LOCAL_WIDTHS.map(w => `${localAt(value, w)} ${w}w`), `${import.meta.env.BASE_URL}${value} ${largest}w`].join(', ');
  } else if (/^https:\/\/res\.cloudinary\.com\//.test(src) && src !== value) {
    srcSet = [640, 1024, 1600, largest].map(w => `${cloudinaryService.getOptimizedUrl(value, w)} ${w}w`).join(', ');
  }
  return srcSet ? { src, srcSet, sizes } : { src };
}
