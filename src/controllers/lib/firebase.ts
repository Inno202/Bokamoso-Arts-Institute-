import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

// The values in firebase-applet-config.json are public identifiers, not secrets:
// access is controlled by firestore.rules, never by hiding this config.
export const app = initializeApp(firebaseConfig);

// App Check proves to Firebase that a request comes from this website in a real
// browser, not from a script. Once it is ENFORCED in the Firebase console, anything
// without that proof is refused before it can read, write or sign up, which is
// the main defence against scripted floods and scraping. See README, "Security".
export const APP_CHECK_ENABLED = Boolean(import.meta.env.VITE_RECAPTCHA_SITE_KEY) && import.meta.env.VITE_USE_EMULATORS !== 'true';
if (APP_CHECK_ENABLED) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY as string),
    isTokenAutoRefreshEnabled: true,
  });
}
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Local testing only: `VITE_USE_EMULATORS=true npm run dev` with the Firebase emulators
// running points the app at them instead of the live project. Never active in a build.
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}
