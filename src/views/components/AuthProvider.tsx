import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../controllers/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { UserRole } from '../../models/types';

interface AuthContextType {
  user: User | null | undefined;
  userData: any | null;
  role: UserRole | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, userData: null, role: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, authLoading, _error] = useAuthState(auth);
  const [userData, setUserData] = useState<any | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};

    const setupUserRoleSubscription = async () => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          
          // First try to get it immediately (from cache if available)
          const docSnap = await getDoc(userDocRef);
          
          if (!docSnap.exists()) {
             const defaultRole = 'USER';
             try {
                const initialData = {
                  email: user.email || '',
                  displayName: user.displayName || user.email?.split('@')[0] || 'User',
                  role: defaultRole,
                  createdAt: new Date().toISOString()
                };
                await setDoc(userDocRef, initialData);
                setUserData(initialData);
                setRole(defaultRole as UserRole);
             } catch (createErr) {
                console.error("Error creating user profile", createErr);
             }
          } else {
             setUserData(docSnap.data());
             setRole(docSnap.data().role as UserRole);
          }
          
          // Set up real-time listener
          unsubscribe = onSnapshot(userDocRef, (snapshot) => {
             if (snapshot.exists()) {
                const data = snapshot.data();
                setUserData(data);
                setRole(data.role as UserRole);
             } else {
                setUserData(null);
                setRole(null);
             }
             setRoleLoading(false);
          }, (err) => {
             console.error("Error in role snapshot", err);
             setUserData(null);
             setRole(null);
             setRoleLoading(false);
          });
          
        } catch (err) {
          console.error("Error setting up role listener", err);
          setUserData(null);
          setRole(null);
          setRoleLoading(false);
        }
      } else {
        setUserData(null);
        setRole(null);
        setRoleLoading(false);
      }
    };

    if (!authLoading) {
      if (user) {
        setupUserRoleSubscription();
      } else {
        setUserData(null);
        setRole(null);
        setRoleLoading(false);
      }
    }
    
    return () => unsubscribe();
  }, [user, authLoading]);

  const loading = authLoading || roleLoading;

  return (
    <AuthContext.Provider value={{ user, userData, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
