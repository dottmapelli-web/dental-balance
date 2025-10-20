
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { initialExpenseCategories, initialIncomeCategories } from '@/config/transaction-categories';
import { Loader2 } from 'lucide-react';

export type ForecastType = 'Costi di Produzione' | 'Costi Produttivi';

export interface CategoryDefinition {
  [category: string]: {
    subcategories: string[];
    forecastType?: ForecastType;
  };
}

interface CategoryContextValue {
  expenseCategories: CategoryDefinition;
  incomeCategories: CategoryDefinition;
  loading: boolean;
  error: string | null;
  updateCategories: (type: 'uscite' | 'entrate', newCategories: CategoryDefinition) => Promise<void>;
}

const CategoryContext = createContext<CategoryContextValue | undefined>(undefined);

// Funzione per migrare la vecchia struttura (string[]) alla nuova ({ subcategories: string[] })
const migrateCategories = (oldCategories: { [key: string]: string[] }): CategoryDefinition => {
    const newCats: CategoryDefinition = {};
    for (const key in oldCategories) {
        // Assegna un tipo di previsione di default
        let forecastType: ForecastType = 'Costi Produttivi'; // Default
        if (key === 'Materiali' || key === 'Servizi esterni' || key === 'Compensi Medici') {
          forecastType = 'Costi di Produzione';
        }

        newCats[key] = {
            subcategories: oldCategories[key],
            forecastType: forecastType
        };
    }
    return newCats;
};


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
                let data = docSnap.data()?.categories || {};
                
                // Logica di migrazione per le categorie di spesa
                if (key === 'uscite' && Object.keys(data).length > 0) {
                    const firstCatKey = Object.keys(data)[0];
                    if (Array.isArray(data[firstCatKey])) { // Vecchia struttura
                        console.log("Migrating old expense category structure...");
                        data = migrateCategories(data as { [key: string]: string[] });
                        await setDoc(docRef, { categories: data }); // Salva la nuova struttura
                    }
                } else if (key === 'entrate' && Object.keys(data).length > 0) {
                    const firstCatKey = Object.keys(data)[0];
                    if (Array.isArray(data[firstCatKey])) { // Vecchia struttura per entrate
                         const migratedIncome: CategoryDefinition = {};
                         for(const catName in (data as { [key: string]: string[] })) {
                             migratedIncome[catName] = { subcategories: data[catName] };
                         }
                         data = migratedIncome;
                         await setDoc(docRef, { categories: data });
                    }
                }

                if (key === 'uscite') setExpenseCategories(data);
                else setIncomeCategories(data);

            } else {
                // Document doesn't exist, create it with initial (nuova) data
                try {
                    let initialData;
                    if (key === 'uscite') {
                        initialData = migrateCategories(initialExpenseCategories);
                    } else { // entrate
                        initialData = {};
                        for(const catName in initialIncomeCategories) {
                             (initialData as CategoryDefinition)[catName] = { subcategories: initialIncomeCategories[catName] };
                         }
                    }
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
      // The onSnapshot listener will automatically update the state,
      // maintaining a single source of truth.
    } catch (e: any) {
      console.error("Error updating categories:", e);
      setError(`Impossibile aggiornare le categorie: ${e.message}`);
      throw e; // Re-throw the error to be handled by the calling component (e.g., to show a toast)
    } finally {
      // It's important to set loading to false here to unblock the UI.
      // Although the listener will update the data, this ensures the loading state from the action is terminated.
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
