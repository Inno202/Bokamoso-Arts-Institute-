import {
  collection,
  doc,
  getDocs,
  getCountFromServer,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { db, inSignupSession } from './lib/firebase';
import { UserProfile, UserRole } from '../models/types';

const USERS = 'users';
export const USERS_PAGE_SIZE = 50;

export const userController = {
  async countUsers() {
    const snap = await getCountFromServer(collection(db, USERS));
    return snap.data().count;
  },

  /** One page of users, ordered by email. Pass the previous page's cursor for the next. */
  async listUsers(cursor?: QueryDocumentSnapshot) {
    const constraints = cursor
      ? [orderBy('email'), startAfter(cursor), limit(USERS_PAGE_SIZE)]
      : [orderBy('email'), limit(USERS_PAGE_SIZE)];
    const snap = await getDocs(query(collection(db, USERS), ...constraints));
    return {
      users: snap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[],
      cursor: snap.docs.length === USERS_PAGE_SIZE ? snap.docs[snap.docs.length - 1] : undefined,
    };
  },

  /** Everyone who agreed to receive news about upcoming events (active accounts only). */
  async eventNewsList() {
    const snap = await getDocs(query(collection(db, USERS), where('marketingOptIn', '==', true)));
    return snap.docs
      .map(d => ({ uid: d.id, ...d.data() }) as UserProfile)
      .filter(u => u.isActive !== false && u.email);
  },

  async setRole(uid: string, role: UserRole) {
    await updateDoc(doc(db, USERS, uid), { role });
  },

  async setActive(uid: string, isActive: boolean) {
    await updateDoc(doc(db, USERS, uid), { isActive });
  },

  /**
   * Creates a staff account without signing the admin out, by using a
   * short-lived second Firebase app for the new user's sign-up.
   */
  async createUser(input: { email: string; password: string; displayName: string; role: UserRole }) {
    await inSignupSession(async (session) => {
      const credential = await createUserWithEmailAndPassword(session.auth, input.email.trim(), input.password);
      await updateProfile(credential.user, { displayName: input.displayName.trim() });
      await setDoc(doc(db, USERS, credential.user.uid), {
        email: input.email.trim(),
        displayName: input.displayName.trim().slice(0, 100),
        role: input.role,
        isActive: true,
        createdAt: serverTimestamp(),
      });
    });
  },
};
