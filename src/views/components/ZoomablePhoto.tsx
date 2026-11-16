import { Maximize2 } from 'lucide-react';
import { lightbox, type ViewerPhoto } from '../../services/lightbox';

/**
 * A photo that opens much larger when tapped or clicked. Pass the whole set
 * (`group`) to let people step through the other photos in that section.
 */
export function ZoomablePhoto({
  src,
  largeSrc,
  alt,
  className = 'w-full h-full object-cover',
  group,
  index = 0,
  iconCorner = 'top-right',
  imgProps,
}: {
  src: string;
  largeSrc: string;
  alt: string;
  className?: string;
  group?: ViewerPhoto[];
  index?: number;
  iconCorner?: 'top-right' | 'bottom-right';
  imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;
}) {
  if (!src) return null;
  const label = alt ? `View larger: ${alt}` : 'View photo larger';
  return (
    <button
      type="button"
      onClick={() => lightbox.open(group ?? [{ src: largeSrc, alt }], group ? index : 0)}
      aria-label={label}
      aria-haspopup="dialog"
      className="zoomable group/zoom relative block w-full h-full cursor-zoom-in"
    >
      <img src={src} alt="" loading="lazy" decoding="async" className={className} {...imgProps} />
      <span
        className={`zoom-hint absolute ${iconCorner === 'top-right' ? 'top-3 right-3' : 'bottom-3 right-3'} w-9 h-9 rounded-full bg-white/90 text-bai-black flex items-center justify-center shadow-sm`}
        aria-hidden="true"
      >
        <Maximize2 size={16} />
      </span>
    </button>
  );
}
