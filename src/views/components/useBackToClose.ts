import { useEffect, useRef } from 'react';

const MARK = '__baiOverlay';
let counter = 0;

/**
 * While something is open on top of the page (photo viewer, open ticket, confirm dialog,
 * phone menu), the phone's Back button closes it instead of leaving the page.
 *
 * Opening adds one history entry with the same address. Back removes that entry and we close.
 * Closing any other way (X, Escape, a tap outside) removes the entry ourselves, so the next
 * Back goes to the previous page as normal. If the page changed while it was open (a link was
 * followed), the entry is left alone so the new page is not undone.
 */
export function useBackToClose(open: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const id = `${Date.now()}-${++counter}`;
    let pushed = false;
    let poppedByBack = false;

    const onPop = () => {
      if (window.history.state?.[MARK] === id) return; // still on our entry (forward/back elsewhere)
      poppedByBack = true;
      closeRef.current();
    };
    // Added after a tick, so React's development double-run of effects never leaves a stray entry.
    const timer = window.setTimeout(() => {
      window.history.pushState({ ...(window.history.state || {}), [MARK]: id }, '');
      pushed = true;
      window.addEventListener('popstate', onPop);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('popstate', onPop);
      if (!pushed || poppedByBack) return;
      // Checked a moment later: if closing led straight to another page (for example "Yes" in a
      // dialog that then navigates), that page's entry is now current and must not be undone.
      window.setTimeout(() => {
        if (window.history.state?.[MARK] === id) window.history.back();
      }, 0);
    };
  }, [open]);
}
