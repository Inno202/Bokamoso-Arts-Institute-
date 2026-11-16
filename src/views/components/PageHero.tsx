import type { ReactNode } from 'react';
import { contentImage } from '../../content/image';

interface PageHeroProps {
  /** The page title. */
  title: string;
  /** Optional last word(s), set in the brand red. */
  accent?: string;
  /** Photograph behind the title. Without one the header is a plain, light band. */
  image?: string;
  children?: ReactNode;
}

/**
 * The header of every inner page: a rounded photograph inset from the page edges,
 * with the title set in the logo's serif at its foot. Title only, no subtitles.
 */
export function PageHero({ title, accent, image, children }: PageHeroProps) {
  const heading = (
    <h1 className="display text-5xl sm:text-6xl md:text-7xl">
      {title}{accent && <> <span className={image ? 'text-bai-red-soft' : 'text-bai-red-deep'}>{accent}</span></>}
    </h1>
  );

  if (!image) {
    return (
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 md:pt-20 pb-4">
        <div className="hero-rise">{heading}{children}</div>
      </header>
    );
  }

  return (
    <header className="px-3 sm:px-4 pt-3">
      <div className="relative overflow-hidden rounded-[2rem] bg-bai-black text-white min-h-[17rem] md:min-h-[24rem] flex items-end">
        <img
          src={contentImage(image, 1800)}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/5" aria-hidden="true" />
        <div className="relative w-full max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pb-8 md:pb-12 pt-24 hero-rise">
          {heading}
          {children}
        </div>
      </div>
    </header>
  );
}
