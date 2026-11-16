import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pause, Play } from 'lucide-react';
import { contentImage } from '../../content/image';

const SLIDE_MS = 6000;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Full-height photo hero that cross-fades between the choir's photographs, with
 * progress bars you can click. It pauses on hover and focus, has a pause button,
 * and does not move at all for people who ask for reduced motion.
 */
export function HeroSlideshow({ images, children }: { images: string[]; children: ReactNode }) {
  const photos = images.length > 0 ? images : ['assets/photos/choir-stage.jpg'];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [autoplay, setAutoplay] = useState(false);

  // Decided after mount, so the server-rendered page and the first browser render match.
  useEffect(() => { setAutoplay(!prefersReducedMotion() && photos.length > 1); }, [photos.length]);

  const running = autoplay && !paused && !hovering;
  const next = useCallback(() => setIndex(i => (i + 1) % photos.length), [photos.length]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(next, SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [running, index, next]);

  return (
    <section
      className="px-3 sm:px-4 pt-3"
      aria-roledescription="carousel"
      aria-label="Photographs of the choir"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
    >
      <div className="relative overflow-hidden rounded-[2rem] bg-bai-black text-white min-h-[calc(100svh-6.5rem)] md:min-h-[max(38rem,calc(100svh-6.5rem))] flex items-end">
        {photos.map((photo, i) => (
          <div key={photo + i} className="slide absolute inset-0" data-active={i === index} aria-hidden={i !== index}>
            <img
              src={contentImage(photo, 2000)}
              alt=""
              loading={i === 0 ? 'eager' : 'lazy'}
              {...(i === 0 ? { fetchPriority: 'high' as const } : {})}
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/45" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/10 to-transparent" aria-hidden="true" />

        <div className="relative w-full max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pb-24 md:pb-28 pt-28">
          {children}
        </div>

        {photos.length > 1 && (
          <div className="absolute bottom-6 inset-x-0">
            <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 flex items-center gap-3">
              <ol className="flex-grow flex gap-2" aria-label="Choose a photo">
                {photos.map((_, i) => (
                  <li key={i} className="flex-1">
                    <button
                      type="button"
                      onClick={() => setIndex(i)}
                      aria-label={`Show photo ${i + 1} of ${photos.length}`}
                      aria-current={i === index}
                      className="group w-full py-5 -my-5"
                    >
                      <span className="block h-[3px] rounded-full bg-white/30 overflow-hidden transition-[height] duration-200 group-hover:h-[5px]">
                        <span
                          key={i === index ? `run-${index}` : 'idle'}
                          className="progress-fill block h-full bg-white"
                          style={{ ['--slide-ms' as string]: `${SLIDE_MS}ms` }}
                          data-state={i < index ? 'done' : i > index ? 'idle' : !autoplay ? 'done' : running ? 'running' : 'paused'}
                        />
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              {autoplay !== false && photos.length > 1 && (
                <button
                  type="button"
                  onClick={() => setPaused(p => !p)}
                  aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
                  className="icon-btn text-white/90 hover:bg-white/15 -mr-2"
                >
                  {paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
