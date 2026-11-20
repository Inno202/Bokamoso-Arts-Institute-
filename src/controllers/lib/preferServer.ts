import type { SnapshotMetadata } from 'firebase/firestore';

/** How long to wait for the server before falling back to the copy saved on this device. */
export const SERVER_WAIT_MS = 1500;

/**
 * Wraps a live-listener callback so a returning visitor does not see yesterday's photos
 * and wording flash up before today's.
 *
 * The database first answers from the copy saved on this device (from the last visit),
 * then from the server. While online, that saved copy is held back for a moment; the
 * server's answer normally arrives first and is shown straight away. If the server is
 * slow, or the device is offline, the saved copy is shown after all. Once the server has
 * answered, every later update is passed straight through.
 *
 * The listener must use { includeMetadataChanges: true }, so the server's answer is
 * delivered even when it matches the saved copy.
 */
export function preferServer<T extends { metadata: SnapshotMetadata }>(handle: (snap: T) => void, waitMs = SERVER_WAIT_MS) {
  let heardFromServer = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let held: T | null = null;

  return (snap: T) => {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!snap.metadata.fromCache) {
      heardFromServer = true;
      if (timer) clearTimeout(timer);
      held = null;
      handle(snap);
      return;
    }
    if (heardFromServer || offline) {
      handle(snap);
      return;
    }
    held = snap;
    if (!timer) {
      timer = setTimeout(() => {
        if (!heardFromServer && held) handle(held);
      }, waitMs);
    }
  };
}
