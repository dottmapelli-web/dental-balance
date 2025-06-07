
"use client";

import React, { createContext, useContext, useState, type ReactNode } from 'react';

// Simplified AuthContextValue
interface AuthContextValue {
  user: { email: string } | null;
  loading: boolean;
  login: (email?: string, password?: string) => Promise<void>;
  signup: (email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Create a context with a default simplified value
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Simplified AuthProvider
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock login
  const login = async (email?: string, password?: string) => {
    console.log("Mock login called with:", email, password);
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    setUser({ email: email || "test@example.com" });
    setLoading(false);
  };

  // Mock signup
  const signup = async (email?: string, password?: string) => {
    console.log("Mock signup called with:", email, password);
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser({ email: email || "newuser@example.com" });
    setLoading(false);
  };

  // Mock logout
  const logout = async () => {
    console.log("Mock logout called");
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(null);
    setLoading(false);
  };
  
  // Simulate initial auth check
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setUser(null); // Start as logged out for this test
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);


  const value = {
    user,
    loading,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Simplified useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // This default will be used if the hook is called outside AuthProvider
    // For testing the module resolution, this is fine.
    // In a real scenario, you'd throw an error.
    console.warn("useAuth must be used within an AuthProvider, returning mock values for now.");
    return { 
      user: null, 
      loading: true, 
      login: async () => console.log("Mock login (from outside provider)"),
      signup: async () => console.log("Mock signup (from outside provider)"),
      logout: async () => console.log("Mock logout (from outside provider)"),
    };
  }
  return context;
};
