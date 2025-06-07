
"use client";

import React, { createContext, useContext, type ReactNode } from 'react';

// Estremamente semplificato AuthContextValue
interface AuthContextValue {
  user: { email: string } | null;
  loading: boolean;
  // Rimosse login, signup, logout per massima semplificazione
}

// Crea un contesto con un valore di default semplificato
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// AuthProvider Estremamente Semplificato
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Simula uno stato non in caricamento e senza utente
  const value: AuthContextValue = {
    user: null,
    loading: false, // Assumiamo che il caricamento sia terminato
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook useAuth Estremamente Semplificato
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Restituisce un mock di default se usato fuori dal provider
    // Questo non dovrebbe accadere se AppShell non lo usa ancora
    console.warn("useAuth chiamato fuori da AuthProvider - restituzione valori mock per contesto semplificato");
    return {
      user: null,
      loading: false,
    };
  }
  return context;
};
