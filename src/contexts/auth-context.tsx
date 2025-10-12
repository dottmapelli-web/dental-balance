
"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, // Alias per evitare conflitti di nome se necessario
  type User as FirebaseUser,
  type AuthError
} from 'firebase/auth';
import { app as firebaseApp } from '@/lib/firebase'; // Assicurati che firebaseApp sia esportato da firebase.ts

// Interfaccia per i dati dell'utente (può essere estesa)
interface User {
  uid: string;
  email: string | null;
  // displayName?: string | null;
  // photoURL?: string | null;
}

// Interfaccia per il valore del AuthContext
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  transactionsVersion: number;
  incrementTransactionsVersion: () => void;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionsVersion, setTransactionsVersion] = useState(0);
  const auth = getAuth(firebaseApp);

  const incrementTransactionsVersion = useCallback(() => {
    setTransactionsVersion(v => v + 1);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const clearError = () => setError(null);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
      const authError = e as AuthError;
      console.error("AuthContext signIn error:", authError.code, authError.message);
      setError(authError.message || "Errore durante il login.");
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (e) {
      const authError = e as AuthError;
      console.error("AuthContext signUp error:", authError.code, authError.message);
      setError(authError.message || "Errore durante la registrazione.");
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      const authError = e as AuthError;
      console.error("AuthContext signOut error:", authError.code, authError.message);
      setError(authError.message || "Errore durante il logout.");
    }
  };

  const value: AuthContextValue = {
    user,
    loading,
    error,
    transactionsVersion,
    incrementTransactionsVersion,
    signIn,
    signUp,
    signOut,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve essere usato all\'interno di un AuthProvider');
  }
  return context;
};
