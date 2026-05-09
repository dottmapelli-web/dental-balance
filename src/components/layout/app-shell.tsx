"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import AuthModal from '@/components/auth-modal';
import { useAuth } from '@/contexts/auth-context';
import FullScreenLoader from '@/components/ui/full-screen-loader';
import { LogIn, LogOut as LogOutIcon, Moon, Sun, PlusCircle, MinusCircle, Bell, Settings } from 'lucide-react';
import { useTheme } from "next-themes";
import { siteConfig } from '@/config/site';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import TransactionModal, { type TransactionFormData } from '@/components/transaction-modal';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, doc, runTransaction, Timestamp, writeBatch } from 'firebase/firestore';
import type { RecurrenceFrequency, TransactionStatus } from '@/config/transaction-categories';
import { addMonths, format } from 'date-fns';
import ModernNavbar from '@/components/layout/modern-navbar';
import InvoiceScannerModal from '@/components/invoice-scanner-modal';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [mounted, setMounted] = useState(false);
  const { user, loading: authLoading, signOut, incrementTransactionsVersion } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { setTheme, theme } = useTheme();
  const { toast } = useToast();

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionTypeForModal, setTransactionTypeForModal] = useState<'Entrata' | 'Uscita'>('Uscita');
  const [isNavScannerOpen, setIsNavScannerOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || authLoading) {
    return <FullScreenLoader message="Caricamento App..." />;
  }

  // ... (handleSignOut and other helper functions remain same)

  const handleNavScannerItemsAccepted = async (items: any[]) => {
    try {
      const batch = writeBatch(db);
      for (const data of items) {
        const newDocRef = doc(collection(db, "transactions"));
        batch.set(newDocRef, {
          date: Timestamp.fromDate(data.date),
          description: data.description || "",
          category: data.category,
          subcategory: data.subcategory || "",
          type: data.type,
          amount: data.type === "Uscita" ? -Math.abs(data.amount) : Math.abs(data.amount),
          status: data.status,
          isRecurring: false,
          originalRecurringId: null,
          recurrenceDetails: null,
        });
      }
      await batch.commit();
      toast({ title: "Importazione Completata", description: `${items.length} voci salvate con successo.` });
      incrementTransactionsVersion();
    } catch (error: any) {
      toast({ title: "Errore Importazione", description: error.message, variant: "destructive" });
    }
  };

  const handleOpenTransactionModal = (type: 'Entrata' | 'Uscita') => {
    setTransactionTypeForModal(type);
    setIsTransactionModalOpen(true);
  };

  const handleTransactionSubmit = async (data: TransactionFormData, id?: string) => {
    // ... (rest of the handleTransactionSubmit implementation remains same)
    setIsTransactionModalOpen(false);
    console.log("AppShell: handleTransactionSubmit called with data:", JSON.stringify(data, null, 2), "and ID:", id);

    const transactionDataForFirestore = {
      date: Timestamp.fromDate(data.date),
      description: data.description || "",
      category: data.category,
      subcategory: data.subcategory || "",
      type: data.type,
      amount: data.type === 'Uscita' ? -Math.abs(data.amount) : Math.abs(data.amount),
      status: data.status as TransactionStatus,
      isRecurring: data.type === 'Uscita' ? data.isRecurring : false,
      recurrenceDetails: data.type === 'Uscita' && data.isRecurring && data.recurrenceFrequency ? {
        frequency: data.recurrenceFrequency as RecurrenceFrequency,
        startDate: Timestamp.fromDate(data.date),
        endDate: data.recurrenceEndDate ? Timestamp.fromDate(data.recurrenceEndDate) : null,
      } : null,
      originalRecurringId: null,
    };
  
    try {
      const newTransactionRef = doc(collection(db, "transactions"));
      const bankBalanceDocRef = doc(db, "studioInfo/mainBalance");
      const batch = writeBatch(db);

      batch.set(newTransactionRef, transactionDataForFirestore);

      if (data.status === 'Completato') {
        await runTransaction(db, async (firestoreTransaction) => {
            const balanceDocSnap = await firestoreTransaction.get(bankBalanceDocRef);
            let currentBalance = 0;
            if (balanceDocSnap.exists()) {
                currentBalance = balanceDocSnap.data()?.balance || 0;
            }
            const newBalance = currentBalance + transactionDataForFirestore.amount;
            firestoreTransaction.set(bankBalanceDocRef, { balance: newBalance }, { merge: true });
        });
      }

      if (transactionDataForFirestore.isRecurring && transactionDataForFirestore.recurrenceDetails) {
        const definitionDate = data.date;
        const recurrenceEndDate = data.recurrenceEndDate;
        const MAX_RECURRING_INSTANCES = 120;

        for (let i = 0; i < MAX_RECURRING_INSTANCES; i++) {
          let nextInstanceDate: Date;
          switch(transactionDataForFirestore.recurrenceDetails.frequency) {
              case 'Mensile': nextInstanceDate = addMonths(definitionDate, i + 1); break;
              case 'Bimestrale': nextInstanceDate = addMonths(definitionDate, (i + 1) * 2); break;
              case 'Trimestrale': nextInstanceDate = addMonths(definitionDate, (i + 1) * 3); break;
              case 'Semestrale': nextInstanceDate = addMonths(definitionDate, (i + 1) * 6); break;
              case 'Annuale': nextInstanceDate = addMonths(definitionDate, (i + 1) * 12); break;
              default: nextInstanceDate = addMonths(definitionDate, i + 1); break;
          }

          if (recurrenceEndDate && nextInstanceDate > recurrenceEndDate) break;
          
          const instanceData = { ...transactionDataForFirestore, date: Timestamp.fromDate(nextInstanceDate), isRecurring: false, recurrenceDetails: null, originalRecurringId: newTransactionRef.id, status: 'Pianificato' as TransactionStatus };
          const newInstanceRef = doc(collection(db, "transactions"));
          batch.set(newInstanceRef, instanceData);
        }
      }
      
      await batch.commit();

      toast({
        title: `Transazione Aggiunta`,
        description: `${data.description || data.category} - €${Math.abs(data.amount).toFixed(2)}.`,
      });
      
      incrementTransactionsVersion();

    } catch (error: any) {
      console.error("AppShell Error:", error);
      toast({
        title: "Errore Operazione Fallita",
        description: error.message || "Impossibile completare l'operazione.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden relative">
      {user && (
        <ModernNavbar
          onOpenTransaction={handleOpenTransactionModal}
          onOpenScanner={() => setIsNavScannerOpen(true)}
        />
      )}

      <main className="flex-1 overflow-y-auto relative">
        {user ? (
          <div className="px-6 py-6 max-w-[1400px] mx-auto animate-slide-up">
            {children}
          </div>
        ) : (
          <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-none shadow-2xl rounded-[3rem] overflow-hidden glass-card animate-scale-in">
              <CardContent className="p-12 text-center flex flex-col items-center">
                <div className="h-20 w-20 rounded-[2rem] bg-[#1D1D1D] dark:bg-white flex items-center justify-center mb-8 shadow-xl">
                  <LogIn className="h-10 w-10 text-white dark:text-black" />
                </div>
                
                <h1 className="text-3xl font-extrabold tracking-tight mb-4 text-gray-900 dark:text-white">
                  Dental Balance
                </h1>
                <p className="text-base text-gray-500 dark:text-gray-400 leading-relaxed mb-10 max-w-sm">
                  Gestione finanziaria evoluta per il tuo studio dentistico. Accedi per iniziare.
                </p>
                
                <Button 
                  className="w-full h-14 text-lg font-bold rounded-2xl bg-[#1D1D1D] hover:bg-black dark:bg-white dark:text-black text-white shadow-xl transition-all active:scale-95" 
                  onClick={() => setIsAuthModalOpen(true)} 
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  Accedi
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
      {user && (
        <InvoiceScannerModal
          isOpen={isNavScannerOpen}
          onOpenChange={setIsNavScannerOpen}
          onItemsAccepted={handleNavScannerItemsAccepted}
        />
      )}
      {user && (
        <TransactionModal
            isOpen={isTransactionModalOpen}
            onOpenChange={setIsTransactionModalOpen}
            transactionTypeInitial={transactionTypeForModal}
            onSubmitSuccess={handleTransactionSubmit}
        />
      )}
    </div>
  );
}
