import React from 'react';
import { cn } from '../../controllers/lib/utils';
import { cloudinaryService } from '../../services/cloudinaryService';

interface ManagedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  publicId?: string;
  fallbackUrl?: string;
  isGrayscale?: boolean;
  /** Set for images visible on first paint, so the browser fetches them straight away. */
  priority?: boolean;
}

export const ManagedImage: React.FC<ManagedImageProps> = ({
  publicId,
  fallbackUrl,
  isGrayscale = false,
  priority = false,
  className,
  ...props
}) => {
  const raw = publicId || fallbackUrl || props.src || '';
  // Site-relative files are served as-is; everything else goes through the optimiser.
  const src = raw.startsWith('/') && !raw.startsWith('//') ? raw : cloudinaryService.getOptimizedUrl(raw);

  const effectClasses = isGrayscale
    ? 'grayscale brightness-75 hover:grayscale-0 transition-all duration-700'
    : '';

  return (
    <img
      {...props}
      src={src}
      className={cn('w-full h-full object-cover', effectClasses, className)}
      referrerPolicy="no-referrer"
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      {...(priority ? { fetchPriority: 'high' as const } : {})}
    />
  );
};
