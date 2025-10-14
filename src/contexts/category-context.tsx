
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { initialExpenseCategories, initialIncomeCategories } from '@/config/transaction-categories';
import { Loader2 } from 'lucide-react';

export interface CategoryDefinition {
  [category: string]: string[]; // { "Spese Fisse": ["Affitto", "Luce", ...], ... }
}

interface CategoryContextValue {
  expenseCategories: CategoryDefinition;
  incomeCategories: CategoryDefinition;
  loading: boolean;
  error: string | null;
  updateCategories: (type: 'uscite' | 'entrate', newCategories: CategoryDefinition) => Promise<void>;
}

const CategoryContext = createContext<CategoryContextValue | undefined>(undefined);

export const CategoryProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [expenseCategories, setExpenseCategories] = useState<CategoryDefinition>({});
  const [incomeCategories, setIncomeCategories] = useState<CategoryDefinition>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeAndSubscribe = useCallback(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const docRefs = {
        uscite: doc(db, 'transactionCategories', 'uscite'),
        entrate: doc(db, 'transactionCategories', 'entrate'),
    };

    const unsubscribes = Object.entries(docRefs).map(([key, docRef]) => {
        return onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data()?.categories || {};
                if (key === 'uscite') setExpenseCategories(data);
                else setIncomeCategories(data);
            } else {
                // Document doesn't exist, create it with initial data
                try {
                    const initialData = key === 'uscite' ? initialExpenseCategories : initialIncomeCategories;
                    await setDoc(docRef, { categories: initialData });
                    if (key === 'uscite') setExpenseCategories(initialData);
                    else setIncomeCategories(initialData);
                    console.log(`Document transactionCategories/${key} created with initial data.`);
                } catch (e: any) {
                    console.error(`Error creating initial document for ${key}:`, e);
                    setError(`Impossibile inizializzare le categorie per ${key}.`);
                }
            }
        }, (err: any) => {
            console.error(`Error in snapshot listener for ${key}:`, err);
            setError(`Errore nel caricamento delle categorie per ${key}: ${err.message}`);
            setLoading(false);
        });
    });

    setLoading(false); // Set loading to false after setting up listeners

    return () => unsubscribes.forEach(unsub => unsub());

  }, [user]);

  useEffect(() => {
    const unsubscribe = initializeAndSubscribe();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [initializeAndSubscribe]);

  const updateCategories = async (type: 'uscite' | 'entrate', newCategories: CategoryDefinition) => {
    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, 'transactionCategories', type);
      await setDoc(docRef, { categories: newCategories });
      if (type === 'uscite') {
        setExpenseCategories(newCategories);
      } else {
        setIncomeCategories(newCategories);
      }
    } catch (e: any) {
      console.error("Error updating categories:", e);
      setError(`Impossibile aggiornare le categorie: ${e.message}`);
      throw e;
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && Object.keys(expenseCategories).length === 0 && Object.keys(incomeCategories).length === 0) {
    return (
       <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-2">Caricamento categorie...</p>
        </div>
    );
  }

  const value = {
    expenseCategories,
    incomeCategories,
    loading,
    error,
    updateCategories,
  };

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
};

export const useCategories = (): CategoryContextValue => {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
};
