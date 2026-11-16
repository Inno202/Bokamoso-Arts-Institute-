/** Opens the full-screen photo viewer with a set of photos, starting at one of them. */
export interface ViewerPhoto { src: string; alt: string }
export interface ViewerState { photos: ViewerPhoto[]; index: number }

type Listener = (state: ViewerState | null) => void;
let state: ViewerState | null = null;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach(l => l(state));

export const lightbox = {
  open(photos: ViewerPhoto[], index = 0) {
    const usable = photos.filter(p => p.src);
    if (!usable.length) return;
    state = { photos: usable, index: Math.min(Math.max(index, 0), usable.length - 1) };
    emit();
  },
  close() { state = null; emit(); },
  subscribe(listener: Listener) {
    listeners.add(listener);
    listener(state);
    return () => { listeners.delete(listener); };
  },
};
