import { 
  signInWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from './lib/firebase';

export const authController = {
  async login(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  async register(email: string, password: string, displayName: string) {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('./lib/firebase');

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email,
      displayName: displayName || email.split('@')[0],
      role: 'USER',
      isActive: true,
      createdAt: serverTimestamp()
    });

    return user;
  },

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;
    
    // Check if user exists in Firestore, if not create it
    const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('./lib/firebase');
    const userDocRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userDocRef);
    
    if (!snap.exists()) {
      await setDoc(userDocRef, {
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        role: 'USER',
        isActive: true,
        createdAt: serverTimestamp()
      });
    }
    
    return user;
  },

  async logout() {
    await signOut(auth);
  },

  async forgotPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }
};
