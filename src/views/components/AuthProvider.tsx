import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../controllers/lib/firebase';
import { ensureUserProfile } from '../../controllers/authController';
import { UserProfile, UserRole } from '../../models/types';
import { STAFF_IDLE_MINUTES } from '../../config';
import { rememberChoice } from '../../controllers/lib/firebase';
import { logger } from '../../services/loggerService';
import { toast } from '../../services/toast';

interface AuthContextType {
  user: User | null;
  userData: Omit<UserProfile, 'uid'> | null;
  role: UserRole | null;
  loading: boolean;
  /** True once the person has confirmed their email (Google sign-ins always have). */
  emailVerified: boolean;
  /** Re-checks with Firebase after they click the link in their inbox. */
  refreshEmailVerified: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({ user: null, userData: null, role: null, loading: true, emailVerified: false, refreshEmailVerified: async () => false });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userData, setUserData] = useState<AuthContextType['userData']>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [emailVerified, setEmailVerified] = useState(false);
  const refreshEmailVerified = async () => {
    const current = auth.currentUser;
    if (!current) return false;
    await current.reload();
    // A fresh token carries the confirmed status to the database rules.
    if (current.emailVerified) await current.getIdToken(true);
    setEmailVerified(current.emailVerified);
    return current.emailVerified;
  };

  useEffect(() => onAuthStateChanged(auth, (next) => {
    setUser(next);
    setEmailVerified(!!next?.emailVerified);
    setProfileLoading(!!next);
    if (!next) setUserData(null);
    setAuthLoading(false);
  }), []);

  useEffect(() => {
    if (!user) return;
    let creating = false;

    return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (!snapshot.exists()) {
        // First sign-in: create the profile once, then this listener fires again.
        if (!creating) {
          creating = true;
          ensureUserProfile(user).catch((err) => {
            logger.error('Could not create the user profile', err);
            setProfileLoading(false);
          });
        }
        return;
      }

      const data = snapshot.data() as Omit<UserProfile, 'uid'>;
      if (data.isActive === false) {
        toast.error('This account has been deactivated. Contact the institute for help.');
        void signOut(auth);
        return;
      }
      setUserData(data);
      setProfileLoading(false);
    }, (err) => {
      logger.error('Could not load the user profile', err);
      setUserData(null);
      setProfileLoading(false);
    });
  }, [user]);

  // Without "Remember me" (a shared laptop or door phone), staff sessions end after a stretch
  // of inactivity, so a device left open cannot be picked up and used with staff powers.
  // With it ticked, the person chose to stay signed in on their own device.
  const isStaffSession = !!userData && userData.role !== 'USER';
  useEffect(() => {
    if (!isStaffSession || rememberChoice()) return;
    const limit = STAFF_IDLE_MINUTES * 60_000;
    // Activity is shared by every tab (and the installed app) on this device, so a tab left
    // open in the background never signs out the one being used.
    const KEY = 'bai-last-active';
    let lastActive = Date.now();
    let lastWrite = 0;
    const shared = () => { try { return Number(localStorage.getItem(KEY) || 0); } catch { return 0; } };
    const touch = () => {
      lastActive = Date.now();
      if (lastActive - lastWrite > 10_000) {
        lastWrite = lastActive;
        try { localStorage.setItem(KEY, String(lastActive)); } catch { /* storage unavailable */ }
      }
    };
    touch();
    const check = () => {
      if (Date.now() - Math.max(lastActive, shared()) < limit) return;
      toast.info(`You were signed out after ${STAFF_IDLE_MINUTES} minutes without activity.`);
      void signOut(auth);
    };
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach(name => window.addEventListener(name, touch, { passive: true }));
    // Checked on a timer and whenever the tab is looked at again (timers pause in background tabs).
    const timer = window.setInterval(check, 30_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      events.forEach(name => window.removeEventListener(name, touch));
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, [isStaffSession]);

  const value: AuthContextType = {
    user,
    userData,
    role: userData?.role ?? null,
    loading: authLoading || profileLoading,
    emailVerified,
    refreshEmailVerified,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
