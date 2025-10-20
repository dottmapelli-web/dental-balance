
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { initialExpenseCategories, initialIncomeCategories } from '@/config/transaction-categories';
import { Loader2 } from 'lucide-react';

export type ForecastType = 'Costi di Produzione' | 'Costi Produttivi';

export interface Subcategory {
  name: string;
  showInForecast?: boolean;
}

export interface CategoryDefinition {
  [category: string]: {
    subcategories: Subcategory[];
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

// Funzione per migrare la vecchia struttura (string[] o {subcategories: string[]}) alla nuova ({subcategories: Subcategory[]})
const migrateCategories = (oldCategories: { [key: string]: any }): CategoryDefinition => {
    const newCats: CategoryDefinition = {};
    for (const key in oldCategories) {
        let subcategories: Subcategory[] = [];
        let forecastType: ForecastType;

        const categoryData = oldCategories[key];

        if (Array.isArray(categoryData)) { // Struttura più vecchia: { "Cat": ["Sub1", "Sub2"] }
            subcategories = categoryData.map(sub => ({ name: sub, showInForecast: false }));
        } else if (typeof categoryData === 'object' && Array.isArray(categoryData.subcategories)) { // Struttura intermedia: { "Cat": { subcategories: ["Sub1", "Sub2"], ... } }
            subcategories = categoryData.subcategories.map((sub: any) => {
                if (typeof sub === 'string') {
                    return { name: sub, showInForecast: false };
                }
                return sub; // Già nel nuovo formato
            });
        }
        
        // Assegna il forecastType corretto in base alla categoria
        if (key === 'Materiali' || key === 'Servizi esterni' || key === 'Compensi Medici') {
            forecastType = 'Costi di Produzione';
        } else {
            forecastType = 'Costi Produttivi';
        }

        newCats[key] = { subcategories, forecastType };
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
                
                if (Object.keys(data).length > 0) {
                    const firstCatKey = Object.keys(data)[0];
                    const firstCatData = data[firstCatKey];
                    // Check if migration is needed
                    if (Array.isArray(firstCatData) || (typeof firstCatData === 'object' && firstCatData !== null && Array.isArray(firstCatData.subcategories) && firstCatData.subcategories.length > 0 && typeof firstCatData.subcategories[0] === 'string')) {
                        console.log(`Migrating old category structure for ${key}...`);
                        data = migrateCategories(data);
                        await setDoc(docRef, { categories: data });
                    }
                }

                if (key === 'uscite') setExpenseCategories(data);
                else setIncomeCategories(data);

            } else {
                // Document doesn't exist, create it with initial (nuova) data
                try {
                    let initialData: CategoryDefinition;
                    if (key === 'uscite') {
                        initialData = migrateCategories(initialExpenseCategories);
                    } else { // entrate
                        initialData = migrateCategories(initialIncomeCategories);
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

    setLoading(false);

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
