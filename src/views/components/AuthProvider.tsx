import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../controllers/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

export type UserRole = "SUPER_ADMIN" | "CEO" | "FINANCE_MANAGER" | "PUBLIC_RELATIONS" | "TICKET_SCANNER" | "USER";

interface AuthContextType {
  user: User | null | undefined;
  role: UserRole | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, role: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, authLoading, error] = useAuthState(auth);
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
                await setDoc(userDocRef, {
                  email: user.email || '',
                  role: defaultRole
                });
             } catch (createErr) {
                console.error("Error creating user profile", createErr);
             }
          }
          
          // Set up real-time listener
          unsubscribe = onSnapshot(userDocRef, (snapshot) => {
             if (snapshot.exists()) {
                setRole(snapshot.data().role as UserRole);
             } else {
                setRole(null);
             }
             setRoleLoading(false);
          }, (err) => {
             console.error("Error in role snapshot", err);
             setRole(null);
             setRoleLoading(false);
          });
          
        } catch (err) {
          console.error("Error setting up role listener", err);
          setRole(null);
          setRoleLoading(false);
        }
      } else {
        setRole(null);
        setRoleLoading(false);
      }
    };

    if (!authLoading) {
      if (user) {
        setupUserRoleSubscription();
      } else {
        setRoleLoading(false);
      }
    }
    
    return () => unsubscribe();
  }, [user, authLoading]);

  const loading = authLoading || roleLoading;

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
