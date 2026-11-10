import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

// The values in firebase-applet-config.json are public identifiers, not secrets:
// access is controlled by firestore.rules, never by hiding this config.
export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
