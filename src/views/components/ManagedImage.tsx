import React from 'react';
import { cn } from '../../controllers/lib/utils';
import { cloudinaryService } from '../../services/cloudinaryService';

interface ManagedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  publicId?: string;
  fallbackUrl?: string;
  isGrayscale?: boolean;
  sectionKey?: string;
}

export const ManagedImage: React.FC<ManagedImageProps> = ({ 
  publicId, 
  fallbackUrl, 
  isGrayscale = false, 
  sectionKey, // although unused for now, it fixes the type error
  className, 
  ...props 
}) => {
  const src = publicId 
    ? cloudinaryService.getOptimizedUrl(publicId) 
    : (fallbackUrl || props.src);

  const effectClasses = isGrayscale 
    ? "grayscale brightness-75 hover:grayscale-0 transition-all duration-700"
    : "grayscale-0 brightness-100 transition-all duration-700";

  return (
    <img 
      {...props} 
      src={src}
      className={cn("w-full h-full object-cover", effectClasses, className)}
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  );
};
