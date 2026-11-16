import { deleteApp, initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { connectAuthEmulator, getAuth, signOut, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, type Firestore, memoryLocalCache, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

// The values in firebase-applet-config.json are public identifiers, not secrets:
// access is controlled by firestore.rules, never by hiding this config.
export const app = initializeApp(firebaseConfig);

// App Check proves to Firebase that a request comes from this website in a real
// browser, not from a script. Once it is ENFORCED in the Firebase console, anything
// without that proof is refused before it can read, write or sign up, which is
// the main defence against scripted floods and scraping. See README, "Security".
export const APP_CHECK_ENABLED = Boolean(import.meta.env.VITE_RECAPTCHA_SITE_KEY) && import.meta.env.VITE_USE_EMULATORS !== 'true';
const startAppCheck = (target: typeof app) => {
  if (APP_CHECK_ENABLED && typeof window !== 'undefined') {
    initializeAppCheck(target, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY as string),
      isTokenAutoRefreshEnabled: true,
    });
  }
};
startAppCheck(app);
export const db = initializeFirestore(app, {
  // The offline copy needs a browser; pre-rendering at build time uses memory only.
  localCache: typeof window === 'undefined' ? memoryLocalCache() : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Local testing only: `VITE_USE_EMULATORS=true npm run dev` with the Firebase emulators
// running points the app at them instead of the live project. Never active in a build.
const USE_EMULATORS = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true' && typeof window !== 'undefined';
if (USE_EMULATORS) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}

/**
 * Runs account creation in a separate, short-lived Firebase session, so creating
 * an account never signs anyone in (or out) on this page: a visitor signs in
 * themselves afterwards, and an admin adding staff stays signed in as the admin.
 * The session gets the same App Check and emulator setup as the main one.
 */
export async function inSignupSession<T>(work: (session: { auth: Auth; db: Firestore }) => Promise<T>): Promise<T> {
  const secondary = initializeApp(firebaseConfig, `signup-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  startAppCheck(secondary);
  const session = {
    auth: getAuth(secondary),
    db: initializeFirestore(secondary, { localCache: memoryLocalCache(), ignoreUndefinedProperties: true }, firebaseConfig.firestoreDatabaseId),
  };
  if (USE_EMULATORS) {
    connectFirestoreEmulator(session.db, '127.0.0.1', 8080);
    connectAuthEmulator(session.auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  try {
    return await work(session);
  } finally {
    await signOut(session.auth).catch(() => undefined);
    await deleteApp(secondary);
  }
}
