
"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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
  const auth = getAuth(firebaseApp);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          // Potresti voler mappare altri campi qui, es. displayName
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [auth]);

  const clearError = () => setError(null);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // Lo stato utente verrà aggiornato da onAuthStateChanged
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
      // Lo stato utente verrà aggiornato da onAuthStateChanged
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
      await firebaseSignOut(auth); // Usa l'alias
      // Lo stato utente verrà aggiornato da onAuthStateChanged
    } catch (e) {
      const authError = e as AuthError;
      console.error("AuthContext signOut error:", authError.code, authError.message);
      setError(authError.message || "Errore durante il logout.");
    } finally {
      // Non impostare setLoading(false) qui, onAuthStateChanged lo farà
      // setLoading(false); // Rimosso per attendere onAuthStateChanged
    }
  };

  const value: AuthContextValue = {
    user,
    loading,
    error,
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
