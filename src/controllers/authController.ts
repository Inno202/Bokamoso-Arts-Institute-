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
    // We login with Firebase Auth first, then the browser set a session cookie via server middleware (auto-handled if we call an API)
    // Actually the user wants a custom session logic.
    // So we'll login locally, then call /api/auth/session to set the HttpOnly cookie.
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    
    if (!res.ok) throw new Error('Session creation failed');
    return userCredential.user;
  },

  async register(email: string, password: string, displayName: string) {
    // Registration via server to ensure role is USER and password is saved correctly (if we decide to use custom DB auth too)
    // User requested: "Public users self-register with email + password (USER role only)"
    // and "Password hashed via POST /api/auth/register"
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName })
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Registration failed');
    }
    
    // After registration on server, we can login
    return this.login(email, password);
  },

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const idToken = await userCredential.user.getIdToken();
    
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    
    return userCredential.user;
  },

  async logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    await signOut(auth);
  },

  async forgotPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }
};
