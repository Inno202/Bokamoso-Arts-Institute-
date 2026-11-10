import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../controllers/lib/firebase';
import { ensureUserProfile } from '../../controllers/authController';
import { UserProfile, UserRole } from '../../models/types';
import { logger } from '../../services/loggerService';
import { toast } from '../../services/toast';

interface AuthContextType {
  user: User | null;
  userData: Omit<UserProfile, 'uid'> | null;
  role: UserRole | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, userData: null, role: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userData, setUserData] = useState<AuthContextType['userData']>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (next) => {
    setUser(next);
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

  const value: AuthContextType = {
    user,
    userData,
    role: userData?.role ?? null,
    loading: authLoading || profileLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
