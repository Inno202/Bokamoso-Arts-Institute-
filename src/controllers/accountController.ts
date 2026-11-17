/**
 * The signed-in person's own account: name, password, and deleting the account.
 * Sensitive changes ask Firebase to confirm who they are first (current password,
 * or Google for Google sign-ins), as Firebase requires for recent-login actions.
 */
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { AppError } from './lib/utils';

export const MIN_PASSWORD = 8;

/** True when the person signs in with an email and password (not only with Google). */
export const usesPassword = (user: User) => user.providerData.some(p => p.providerId === 'password');

async function confirmIdentity(user: User, currentPassword?: string) {
  if (usesPassword(user)) {
    if (!currentPassword) throw new AppError('Enter your current password.');
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email || '', currentPassword));
  } else {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
  }
}

export const accountController = {
  async rename(user: User, name: string) {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (clean.length < 1 || clean.length > 100) throw new AppError('Use a name between 1 and 100 characters.');
    await updateDoc(doc(db, 'users', user.uid), { displayName: clean });
    await updateProfile(user, { displayName: clean });
    return clean;
  },

  async changePassword(user: User, currentPassword: string, newPassword: string) {
    if (newPassword.length < MIN_PASSWORD) throw new AppError(`Use at least ${MIN_PASSWORD} characters for the new password.`);
    if (newPassword === currentPassword) throw new AppError('The new password must be different from the current one.');
    await confirmIdentity(user, currentPassword);
    await updatePassword(user, newPassword);
  },

  /**
   * Deletes the profile, the saved bag and the sign-in itself. Past ticket and order
   * records stay as the institute's booking and attendance records (see Privacy Policy).
   */
  async deleteAccount(user: User, currentPassword?: string) {
    await confirmIdentity(user, currentPassword);
    await deleteDoc(doc(db, 'cart', user.uid)).catch(() => undefined);
    await deleteDoc(doc(db, 'users', user.uid));
    await deleteUser(user);
  },
};
