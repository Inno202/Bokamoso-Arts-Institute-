import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { lightbox, type ViewerState } from '../../services/lightbox';

/**
 * Full-screen photo viewer for the whole site. A modal <dialog> keeps focus
 * inside and the page behind inert. Close with Escape, the X, or a tap on
 * the dark area; step through with the arrows, the arrow keys, or a swipe.
 */
export function PhotoViewer() {
  const [view, setView] = useState<ViewerState | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const justSwiped = useRef(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => lightbox.subscribe(setView), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (view && !dialog.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      closeRef.current?.focus();
    } else if (!view && dialog.open) {
      dialog.close();
      returnFocus.current?.focus?.();
    }
  }, [view]);

  const count = view?.photos.length ?? 0;
  const go = useCallback((step: number) => {
    setView(v => (v && v.photos.length > 1 ? { ...v, index: (v.index + step + v.photos.length) % v.photos.length } : v));
  }, []);

  const photo = view?.photos[view.index];
  useEffect(() => { setLoaded(false); }, [photo?.src]);

  // Load the neighbours ahead of time so stepping through feels instant.
  useEffect(() => {
    if (!view || count < 2) return;
    [1, -1].forEach(step => { const img = new Image(); img.src = view.photos[(view.index + step + count) % count].src; });
  }, [view, count]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  };

  const onPointerDown = (e: React.PointerEvent) => { swipeStart.current = { x: e.clientX, y: e.clientY }; };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || count < 2) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      justSwiped.current = true; // the click that follows a swipe must not close the viewer
      go(dx < 0 ? 1 : -1);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="photo-viewer"
      aria-label={photo ? `${photo.alt || 'Photo'}${count > 1 ? `, ${view!.index + 1} of ${count}` : ''}` : 'Photo'}
      onCancel={(e) => { e.preventDefault(); lightbox.close(); }}
      onKeyDown={onKeyDown}
    >
      {view && photo && (
        <div
          className="relative w-full h-full flex items-center justify-center"
          onClick={(e) => {
            if (justSwiped.current) { justSwiped.current = false; return; }
            if (e.target === e.currentTarget) lightbox.close();
          }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          {!loaded && <span className="absolute w-10 h-10 border-4 border-white/70 border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading photo" />}
          <img
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            onLoad={() => setLoaded(true)}
            draggable={false}
            className={`photo-viewer-img max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-9rem)] max-h-[calc(100dvh-8rem)] object-contain rounded-lg select-none ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />

          <button ref={closeRef} type="button" onClick={() => lightbox.close()} aria-label="Close photo" className="viewer-btn absolute top-3 right-3 sm:top-5 sm:right-5">
            <X size={24} aria-hidden="true" />
          </button>

          {count > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="viewer-btn absolute left-2 sm:left-5 top-1/2 -translate-y-1/2">
                <ChevronLeft size={28} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Next photo" className="viewer-btn absolute right-2 sm:right-5 top-1/2 -translate-y-1/2">
                <ChevronRight size={28} aria-hidden="true" />
              </button>
              <p className="num absolute bottom-4 left-1/2 -translate-x-1/2 text-white/85 text-sm font-semibold bg-black/40 rounded-full px-3 py-1" aria-live="polite">
                {view.index + 1} / {count}
              </p>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}
