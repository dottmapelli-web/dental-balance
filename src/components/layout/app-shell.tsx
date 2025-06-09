
"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import AuthModal from '@/components/auth-modal';
import { useAuth } from '@/contexts/auth-context';
import FullScreenLoader from '@/components/ui/full-screen-loader';
import { LogIn, LogOut as LogOutIcon, Menu, Moon, Sun, Settings, LayoutDashboard, PlusCircle, MinusCircle, PanelLeftOpen, PanelLeftClose } from 'lucide-react'; // Added PanelLeftOpen/Close
import { useTheme } from "next-themes";
import { siteConfig } from '@/config/site';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  useSidebar, // Import useSidebar
} from '@/components/ui/sidebar';
import MainSidebarNav from '@/components/layout/main-sidebar-nav';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import TransactionModal, { type TransactionFormData } from '@/components/transaction-modal';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, doc, runTransaction, Timestamp, writeBatch, getDoc } from 'firebase/firestore'; // Rimossa query e where non usate qui
import type { RecurrenceFrequency, TransactionStatus } from '@/config/transaction-categories';
import { addMonths, format } from 'date-fns';


const NewBrandLogoIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 280 100" 
    xmlns="http://www.w3.org/2000/svg" 
    className={cn("transition-all duration-300 ease-in-out", className)} 
    aria-label="Studio De Vecchi & Mapelli Logo"
    data-ai-hint="dental clinic logo tooth horizontal"
  >
    <defs>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&display=swap');
        .logo-main-text {
          font-family: 'Kalam', cursive;
          font-size: 20px;
          font-weight: 700;
          fill: hsl(var(--foreground));
        }
        .logo-sub-text {
          font-family: 'Kalam', cursive;
          font-size: 10px;
          font-weight: 400;
          fill: hsl(var(--foreground));
        }
        .tooth-icon-white {
          fill: hsl(var(--card)); 
          stroke: hsl(var(--foreground)); 
          stroke-width: 1.5px;
        }
        .tooth-icon-brown {
          fill: #A0522D; /* Sienna brown */
          stroke: #8B4513; /* Darker sienna */
          stroke-width: 1.5px;
        }
        .line-separator {
          stroke: hsl(var(--foreground));
          stroke-width: 1.5px;
        }
        .bottom-line {
          stroke: #A0522D; /* Sienna brown */
          stroke-width: 1.5px;
        }
        .dark .tooth-icon-white {
           fill: hsl(var(--popover)); 
           stroke: hsl(var(--popover-foreground));
        }
        .dark .logo-main-text, .dark .logo-sub-text {
            fill: hsl(var(--popover-foreground));
        }
        .dark .line-separator {
            stroke: hsl(var(--popover-foreground));
        }
      ` }} />
    </defs>
    
    {/* Tooth Icon */}
    <path className="tooth-icon-brown" d="M35 25 C32 15, 48 15, 45 25 L45 52 Q40 65, 35 52 Z" />
    <path className="tooth-icon-white" d="M20 25 C23 15, 37 15, 40 25 L40 52 Q35 65, 30 52 Z M40 25 C43 15, 57 15, 60 25 L60 52 Q55 65, 50 52 Z M35 60 Q42.5 80, 50 60 Z" />

    {/* Vertical Line */}
    <line className="line-separator" x1="75" y1="20" x2="75" y2="80" />

    {/* Text De Vecchi & Mapelli */}
    <text x="90" y="38" className="logo-main-text">De Vecchi</text>
    <text x="90" y="63" className="logo-main-text">& Mapelli</text>

    {/* Horizontal Line */}
    <line className="bottom-line" x1="90" y1="73" x2="265" y2="73" />
    
    {/* Sub Text */}
    <text x="90" y="88" className="logo-sub-text">Odontoiatria, Estetica e Innovazione</text>
  </svg>
);

// Component to conditionally render PanelLeftOpen or PanelLeftClose
const SidebarToggleIcon = () => {
  const { open, isMobile } = useSidebar(); // Get sidebar state
  if (isMobile) return <PanelLeftOpen />; // Always show open for mobile trigger
  return open ? <PanelLeftClose /> : <PanelLeftOpen />;
};


interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [mounted, setMounted] = useState(false);
  const { user, loading: authLoading, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { setTheme, theme } = useTheme();
  const { toast } = useToast();

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionTypeForModal, setTransactionTypeForModal] = useState<'Entrata' | 'Uscita'>('Uscita');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || authLoading) {
    return <FullScreenLoader message="Caricamento App..." />;
  }

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };
  
  const subHeaderNavItems = [
    {
      title: "Impostazioni",
      href: "/settings",
      icon: Settings,
      disabled: true, 
    }
  ];

  const handleOpenTransactionModal = (type: 'Entrata' | 'Uscita') => {
    setTransactionTypeForModal(type);
    setIsTransactionModalOpen(true);
  };

  const handleTransactionSubmit = async (data: TransactionFormData, id?: string) => {
    setIsTransactionModalOpen(false); // Chiudi il modale subito
    console.log("AppShell: handleTransactionSubmit called with data:", JSON.stringify(data, null, 2), "and ID:", id);

    const transactionDataForFirestore = {
      date: Timestamp.fromDate(data.date),
      description: data.description || "",
      category: data.category,
      subcategory: data.subcategory || "",
      type: data.type,
      amount: data.type === 'Uscita' ? -Math.abs(data.amount) : Math.abs(data.amount),
      status: data.status as TransactionStatus,
      isRecurring: data.type === 'Uscita' ? data.isRecurring : false, // La ricorrenza è solo per le uscite nel modale
      recurrenceDetails: data.type === 'Uscita' && data.isRecurring && data.recurrenceFrequency ? {
        frequency: data.recurrenceFrequency as RecurrenceFrequency,
        startDate: Timestamp.fromDate(data.date), // Usa la data della transazione come startDate per la ricorrenza
        endDate: data.recurrenceEndDate ? Timestamp.fromDate(data.recurrenceEndDate) : null,
      } : null,
      originalRecurringId: null, // Le transazioni aggiunte da AppShell sono sempre nuove definizioni
    };
  
    console.log("AppShell: transactionDataForFirestore prepared:", JSON.stringify(transactionDataForFirestore, null, 2));

    try {
      const newTransactionRef = doc(collection(db, "transactions")); // Genera ID per la nuova transazione
      const bankBalanceDocRef = doc(db, "studioInfo/mainBalance");
      const batch = writeBatch(db);

      console.log("AppShell: Adding main transaction to batch. New ID will be:", newTransactionRef.id);
      batch.set(newTransactionRef, transactionDataForFirestore);

      if (data.status === 'Completato') {
        console.log("AppShell: Transaction is 'Completato'. Preparing to update bank balance.");
        // È meglio usare una transazione Firestore per leggere e aggiornare il saldo atomicamente
        // Ma per ora, per coerenza con il comportamento precedente e per semplicità di questo fix:
        const balanceDocSnap = await getDoc(bankBalanceDocRef);
        let currentBalance = 0;
        if (balanceDocSnap.exists()) {
          currentBalance = balanceDocSnap.data()?.balance || 0;
        }
        const newBalance = currentBalance + transactionDataForFirestore.amount; // amount è già negativo per le uscite
        console.log(`AppShell: Current bank balance: ${currentBalance}, Amount: ${transactionDataForFirestore.amount}, New bank balance: ${newBalance}`);
        batch.set(bankBalanceDocRef, { balance: newBalance }, { merge: true });
      } else {
        console.log("AppShell: Transaction status is not 'Completato'. Bank balance will not be updated by this operation.");
      }

      // Gestione istanze ricorrenti SE la nuova transazione è una DEFINIZIONE ricorrente
      if (transactionDataForFirestore.isRecurring && transactionDataForFirestore.recurrenceDetails && !transactionDataForFirestore.originalRecurringId) {
        console.log(`AppShell: Transaction is a recurring definition (ID: ${newTransactionRef.id}). Preparing instances.`);
        const definitionDate = data.date; // Data della prima occorrenza (la definizione stessa)
        const recurrenceEndDate = data.recurrenceEndDate; 
        let instancesCreatedCount = 0;
        const MAX_RECURRING_INSTANCES = 120; // Es: 10 anni di istanze mensili

        for (let i = 0; i < MAX_RECURRING_INSTANCES; i++) { 
          let nextInstanceDate: Date;
          // Calcola la data dell'istanza (i+1)-esima *dopo* la definizione
          switch(transactionDataForFirestore.recurrenceDetails.frequency) {
              case 'Mensile': nextInstanceDate = addMonths(definitionDate, i + 1); break;
              case 'Bimestrale': nextInstanceDate = addMonths(definitionDate, (i + 1) * 2); break;
              case 'Trimestrale': nextInstanceDate = addMonths(definitionDate, (i + 1) * 3); break;
              case 'Semestrale': nextInstanceDate = addMonths(definitionDate, (i + 1) * 6); break;
              case 'Annuale': nextInstanceDate = addMonths(definitionDate, (i + 1) * 12); break;
              default: 
                console.warn(`AppShell: Unknown recurrence frequency: ${transactionDataForFirestore.recurrenceDetails.frequency}. Defaulting to Mensile.`);
                nextInstanceDate = addMonths(definitionDate, i + 1); break;
          }

          if (recurrenceEndDate && nextInstanceDate > recurrenceEndDate) {
            console.log(`AppShell: Instance date ${format(nextInstanceDate, "yyyy-MM-dd")} is after end date ${format(recurrenceEndDate, "yyyy-MM-dd")}. Stopping instance generation.`);
            break; 
          }
          
          const instanceData = {
            ...transactionDataForFirestore, // Copia i dati della definizione
            date: Timestamp.fromDate(nextInstanceDate), 
            isRecurring: false, // Le istanze non sono esse stesse definizioni
            recurrenceDetails: null, 
            originalRecurringId: newTransactionRef.id, // Link alla definizione originale
            status: 'Pianificato' as TransactionStatus, // Le istanze future sono 'Pianificato'
          };
          const newInstanceRef = doc(collection(db, "transactions")); // Crea un nuovo ID per l'istanza
          batch.set(newInstanceRef, instanceData);
          console.log(`AppShell: Added instance ${instancesCreatedCount + 1} to batch for date ${format(nextInstanceDate, "yyyy-MM-dd")}. Instance ID will be: ${newInstanceRef.id}`);
          instancesCreatedCount++;
        }
        if (instancesCreatedCount > 0) {
          console.log(`AppShell: ${instancesCreatedCount} recurring instances prepared for batch.`);
        } else {
          console.log("AppShell: No recurring instances generated for this definition.");
        }
      }
      
      console.log("AppShell: Attempting to commit batch to Firestore...");
      await batch.commit();
      console.log("AppShell: Batch commit successful. Main transaction ID:", newTransactionRef.id);

      // Toast di successo SOLO se il commit è andato a buon fine
      toast({
        title: `Transazione Aggiunta${data.status === 'Completato' ? ' e Saldo Aggiornato' : ''}`,
        description: `${data.description || data.category} - €${Math.abs(data.amount).toFixed(2)}. ${data.status === 'Completato' ? 'Il saldo bancario è stato aggiornato.' : 'Il saldo bancario non è stato modificato.'}`,
      });
  
    } catch (error: any) {
      console.error("!!! AppShell: ERRORE durante l'aggiunta della transazione, l'aggiornamento del saldo o il commit del batch:", error);
      let errorMessage = "Impossibile completare l'operazione.";
      if (error.message) errorMessage += ` Dettaglio: ${error.message}`;
      if (error.code) errorMessage += ` (Codice Firestore: ${error.code})`;
      
      toast({
        title: "Errore Operazione Fallita",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };


  return (
    <SidebarProvider defaultOpen>
      <Sidebar side="left" variant="sidebar" collapsible="icon" className="print-hidden"> 
        <SidebarHeader className="flex items-center justify-between p-2 pr-1">
          {/* Logo a sinistra */}
          <div className="group-data-[collapsible=icon]:hidden flex-shrink-0">
            <NewBrandLogoIcon className="h-14 w-auto" />
          </div>
          <LayoutDashboard className="h-8 w-8 text-primary group-data-[collapsible=icon]:block hidden" />
          
          {/* SidebarTrigger a destra (quando la sidebar è espansa) o unico elemento (quando collassata) */}
          <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:mx-auto">
            <SidebarToggleIcon />
          </SidebarTrigger>
        </SidebarHeader>
        <SidebarContent>
          <MainSidebarNav items={siteConfig.navItems} />
        </SidebarContent>
        <SidebarFooter>
          {subHeaderNavItems && subHeaderNavItems.length > 0 && <MainSidebarNav items={subHeaderNavItems} />}
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="print-hidden"> 
      <header className="sticky top-0 z-30 flex h-16 items-center gap-x-2 sm:gap-x-4 border-b bg-background/95 px-4 backdrop-blur-sm print-hidden">
          <SidebarTrigger className="md:hidden" >
             <PanelLeftOpen />
          </SidebarTrigger>
          
          <div className="flex flex-col items-start">
            <span className="text-base font-bold text-foreground leading-tight md:text-xl">Studio De Vecchi & Mapelli</span>
            <span className="text-xs font-medium text-muted-foreground -mt-1 leading-tight md:text-sm">{siteConfig.name}</span>
          </div>
          
          <div className="flex-1" /> 

          {user && (
            <>
              <Button
                variant="default"
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white hidden md:flex"
                onClick={() => handleOpenTransactionModal('Entrata')}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Nuova Entrata
              </Button>
              <Button
                variant="default"
                size="sm"
                className="bg-red-500 hover:bg-red-600 text-white ml-2 hidden md:flex"
                onClick={() => handleOpenTransactionModal('Uscita')}
              >
                <MinusCircle className="mr-2 h-4 w-4" /> Nuova Uscita
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="bg-green-500 hover:bg-green-600 text-white rounded-full md:hidden h-8 w-8 sm:h-9 sm:w-9"
                onClick={() => handleOpenTransactionModal('Entrata')}
                aria-label="Nuova Entrata"
              >
                <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="bg-red-500 hover:bg-red-600 text-white rounded-full ml-1 md:hidden h-8 w-8 sm:h-9 sm:w-9"
                onClick={() => handleOpenTransactionModal('Uscita')}
                aria-label="Nuova Uscita"
              >
                <MinusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label="Toggle theme"
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <Sun className="h-4 w-4 sm:h-5 sm:w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 sm:h-5 sm:w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Utente</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsAuthModalOpen(true)}>
              <LogIn className="mr-2 h-4 w-4" />
              Accedi / Registrati
            </Button>
          )}
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:p-0 print:m-0"> 
          {user ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Accesso Richiesto</CardTitle>
                  <CardDescription>
                    Per continuare e accedere alle funzionalità dell'applicazione, per favore effettua il login o crea un nuovo account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <LogIn className="h-16 w-16 text-primary mb-6" />
                  <Button className="w-full" onClick={() => setIsAuthModalOpen(true)} size="lg">
                    Accedi o Registrati
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </SidebarInset>
      <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
      {user && (
        <TransactionModal
            isOpen={isTransactionModalOpen}
            onOpenChange={setIsTransactionModalOpen}
            transactionTypeInitial={transactionTypeForModal}
            onSubmitSuccess={handleTransactionSubmit} // Passa la funzione di AppShell
        />
      )}
    </SidebarProvider>
  );
}

