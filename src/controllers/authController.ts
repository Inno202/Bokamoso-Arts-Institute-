import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  setPersistence,
  indexedDBLocalPersistence,
  browserSessionPersistence,
  type User,
} from 'firebase/auth';
import { doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import { auth, db, inSignupSession, REMEMBER_KEY, rememberChoice } from './lib/firebase';
import { setEventNews } from './accountController';

/**
 * Creates the Firestore profile for a signed-in user if it does not exist yet.
 * Runs in a transaction so sign-up and the auth listener can both call it safely.
 * New profiles are always plain, active USERs; firestore.rules rejects anything else.
 */
export async function ensureUserProfile(user: User, displayName?: string, database: Firestore = db) {
  const ref = doc(database, 'users', user.uid);
  await runTransaction(database, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) return;
    const email = user.email || '';
    const name = (displayName || user.displayName || email.split('@')[0] || 'Member').trim().slice(0, 100);
    tx.set(ref, {
      email,
      displayName: name || 'Member',
      role: 'USER',
      isActive: true,
      createdAt: serverTimestamp(),
    });
  });
}

/** After confirming, the link brings people back to sign in. */
const verificationLink = () =>
  typeof window === 'undefined' ? undefined : { url: `${window.location.origin}${import.meta.env.BASE_URL}login` };

export const authController = {
  /**
   * "Remember me": stay signed in on this browser (the default), or only until the browser closes.
   * Unticked, staff are also signed out after 30 idle minutes (see AuthProvider).
   */
  async remember(stay: boolean) {
    // Only when the choice changes: switching storage while other tabs are open signs them out.
    if (stay === rememberChoice()) return;
    try { localStorage.setItem(REMEMBER_KEY, stay ? '1' : '0'); } catch { /* storage unavailable */ }
    await setPersistence(auth, stay ? indexedDBLocalPersistence : browserSessionPersistence);
  },

  async login(email: string, password: string, stay = true) {
    await this.remember(stay);
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return credential.user;
  },

  /**
   * Creates the account and its profile without signing in: the person signs in
   * with their new details afterwards.
   */
  async register(email: string, password: string, displayName: string, eventNews = false) {
    await inSignupSession(async (session) => {
      const credential = await createUserWithEmailAndPassword(session.auth, email.trim(), password);
      const name = displayName.trim();
      if (name) await updateProfile(credential.user, { displayName: name });
      await ensureUserProfile(credential.user, name, session.db);
      // Saved on its own, so a problem here never stops the account being created; it can be
      // changed later in the account page.
      if (eventNews) await setEventNews(credential.user.uid, true, session.db).catch(() => undefined);
      // The confirmation link is still sent, ready for when booking needs a confirmed email again
      // (REQUIRE_EMAIL_VERIFICATION in src/config.ts). If the email
      // cannot be sent now, the person can ask for it again when they first book.
      await sendEmailVerification(credential.user, verificationLink()).catch(() => undefined);
    });
  },

  /** Sends the confirmation link again to the signed-in person. */
  async resendVerification() {
    if (!auth.currentUser) throw new Error('Not signed in');
    await sendEmailVerification(auth.currentUser, verificationLink());
  },

  async loginWithGoogle(stay = true) {
    await this.remember(stay);
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    await ensureUserProfile(credential.user);
    return credential.user;
  },

  async logout() {
    await signOut(auth);
  },

  async forgotPassword(email: string) {
    await sendPasswordResetEmail(auth, email.trim());
  },
};
