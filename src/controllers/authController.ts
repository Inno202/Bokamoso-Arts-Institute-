import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import { doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import { auth, db, inSignupSession } from './lib/firebase';

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

export const authController = {
  async login(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return credential.user;
  },

  /**
   * Creates the account and its profile without signing in: the person signs in
   * with their new details afterwards.
   */
  async register(email: string, password: string, displayName: string) {
    await inSignupSession(async (session) => {
      const credential = await createUserWithEmailAndPassword(session.auth, email.trim(), password);
      const name = displayName.trim();
      if (name) await updateProfile(credential.user, { displayName: name });
      await ensureUserProfile(credential.user, name, session.db);
    });
  },

  async loginWithGoogle() {
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
