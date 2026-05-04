
import React from 'react';
import { cn } from '../lib/utils'; // Assuming shadcn-style utils exists, if not I'll use standard className
import { ImageManagement } from '../config/imageSettings';

interface ManagedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  sectionKey: keyof typeof ImageManagement.sections;
  grayscaleOverride?: boolean;
}

export const ManagedImage: React.FC<ManagedImageProps> = ({ 
  sectionKey, 
  grayscaleOverride, 
  className, 
  ...props 
}) => {
  const settings = ImageManagement.sections[sectionKey];
  const isGrayscale = grayscaleOverride !== undefined ? grayscaleOverride : settings.isGrayscale;
  
  const effectClasses = isGrayscale 
    ? `grayscale brightness-75 hover:grayscale-0 transition-all ${ImageManagement.global.transitionDuration}`
    : `grayscale-0 brightness-100 transition-all ${ImageManagement.global.transitionDuration}`;

  return (
    <img 
      {...props} 
      className={cn("w-full h-full object-cover", effectClasses, className)}
      referrerPolicy="no-referrer"
    />
  );
};

// Simple utility function if you just want the class string
export const getGreyOutClasses = (grey: boolean) => {
  return grey 
    ? `grayscale brightness-75 hover:grayscale-0 transition-all ${ImageManagement.global.transitionDuration}`
    : `grayscale-0 brightness-100 transition-all ${ImageManagement.global.transitionDuration}`;
};
