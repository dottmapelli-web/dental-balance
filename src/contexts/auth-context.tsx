
"use client";

import React, { createContext, useContext, type ReactNode } from 'react';

// Interfaccia AuthContextValue estremamente semplificata
interface AuthContextValue {
  user: { email: string } | null;
  loading: boolean;
  // Funzioni di login, signup, logout rimosse per massima semplificazione
}

// Crea un contesto con un valore di default semplificato
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// AuthProvider Estremamente Semplificato
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Simula uno stato non in caricamento e senza utente
  const value: AuthContextValue = {
    user: null, // Simula utente non loggato
    loading: false, // Assumiamo che il caricamento sia terminato e non ci sia utente
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook useAuth Estremamente Semplificato
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.warn("useAuth chiamato fuori da AuthProvider - restituzione valori mock per contesto semplificato");
    return {
      user: null,
      loading: false,
    };
  }
  return context;
};
