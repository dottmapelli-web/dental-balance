
"use client";

import React, { useState } from 'react';
import { UserCircle, PlusCircle, FileText } from 'lucide-react'; 
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/button';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import MainSidebarNav from '@/components/layout/main-sidebar-nav';
import { cn } from '@/lib/utils';
import TransactionModal, { type TransactionFormData } from '@/components/transaction-modal';
import { useToast } from '@/hooks/use-toast';

const BrandLogoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 70" xmlns="http://www.w3.org/2000/svg" className={cn(className)} aria-label="Studio De Vecchi & Mapelli Logo" data-ai-hint="dental clinic logo">
    <defs>
      <style>
        {`
          .logo-text { font-family: 'Literata', 'Georgia', serif; }
          .logo-text-main { fill: hsl(var(--sidebar-foreground)); }
          .logo-text-amp { fill: hsl(var(--sidebar-primary)); }
          .tooth-shape { fill: hsl(var(--sidebar-foreground)); }
          .tooth-accent-line { stroke: hsl(var(--sidebar-primary)); stroke-width:3.5; fill:none; }
          .divider-line { stroke: hsl(var(--sidebar-border)); stroke-width:1.5; }
        `}
      </style>
    </defs>

    {/* Dente stilizzato */}
    <g transform="translate(0,2) scale(0.85)">
      <path className="tooth-accent-line" d="M28 10 C18 10, 12 18, 18 30 C12 40, 15 55, 28 58" />
      <path className="tooth-shape" d="M28 10 C40 5, 55 7, 62 15 C72 25, 70 45, 62 58 C50 63, 38 63, 28 58 C15 55, 12 40, 18 30 C12 18, 18 10, 28 10 Z" />
      <path className="tooth-shape" d="M38 26 Q46 22 54 27" strokeWidth="2.5" />
      <path className="tooth-shape" d="M35 38 Q46 46 57 37" strokeWidth="2.5" />
    </g>
    
    {/* Linea verticale */}
    <line className="divider-line" x1="78" y1="8" x2="78" y2="62" />

    {/* Testo */}
    <text x="90" y="26" fontSize="17" fontWeight="medium" className="logo-text logo-text-main">De Vecchi</text>
    <text x="90" y="44" fontSize="15" fontWeight="bold" className="logo-text logo-text-amp">&</text>
    <text x="90" y="61" fontSize="17" fontWeight="medium" className="logo-text logo-text-main">Mapelli</text>
  </svg>
);


interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionTypeForModal, setTransactionTypeForModal] = useState<'Entrata' | 'Uscita'>('Uscita');
  const { toast } = useToast();

  const handleNewTransaction = (type: 'Entrata' | 'Uscita') => {
    setTransactionTypeForModal(type);
    setTransactionModalOpen(true);
  };

  const handleTransactionSubmit = (data: TransactionFormData) => {
    // In AppShell, this will likely just show a toast.
    // The actual data handling will be done via Firestore or a global state later.
    console.log("AppShell transaction submitted (simulated):", data);
    toast({
      title: "Transazione Aggiunta (Simulato)",
      description: `Aggiunta ${data.type}: ${data.description || 'N/A'} - €${data.amount.toFixed(2)}`,
    });
    // setTransactionModalOpen(false); // Modal handles its own closing via onOpenChange
  };

  const handleGenerateReport = () => {
    toast({
        title: "Funzionalità Report",
        description: "La generazione di report PDF/stampa è in fase di sviluppo.",
        variant: "default",
    });
    console.log("Genera Report");
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" className="border-r">
        <SidebarHeader className="p-3 group-data-[collapsible=icon]:p-2">
          <div className="flex items-center justify-between group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2">
              <BrandLogoIcon className="h-10 w-auto flex-shrink-0" />
            </div>
            <SidebarTrigger className="md:flex" />
          </div>
          <div className="hidden group-data-[collapsible=icon]:flex justify-center items-center h-full">
             <SidebarTrigger className="md:flex" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <MainSidebarNav items={siteConfig.navItems} />
        </SidebarContent>
        {siteConfig.subHeaderNavItems && siteConfig.subHeaderNavItems.length > 0 && (
          <SidebarFooter className="p-2">
            <MainSidebarNav items={siteConfig.subHeaderNavItems} />
          </SidebarFooter>
        )}
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 print:hidden">
          <SidebarTrigger className="md:hidden -ml-2" /> {/* Mobile Sidebar Trigger */}
          
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-foreground">Studio De Vecchi & Mapelli</h1>
            <p className="text-xs text-muted-foreground">Dental Balance</p>
          </div>

          <div className="flex-1" /> {/* Spacer */}

          <div className="flex items-center gap-2">
            <Button 
              onClick={() => handleNewTransaction('Entrata')}
              variant="outline"
              size="sm"
              className="px-3 bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 dark:bg-green-800/30 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-800/50"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuova Entrata
            </Button>
            <Button 
              onClick={() => handleNewTransaction('Uscita')}
              variant="outline"
              size="sm"
              className="px-3 bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 dark:bg-red-800/30 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-800/50"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuova Uscita
            </Button>
            <Button onClick={handleGenerateReport} variant="outline" size="sm" className="text-primary">
              <FileText className="mr-2 h-4 w-4" />
              Report
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <UserCircle className="h-6 w-6" />
              <span className="sr-only">Profilo Utente</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>
      
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onOpenChange={setTransactionModalOpen}
        transactionTypeInitial={transactionTypeForModal}
        onSubmitSuccess={handleTransactionSubmit}
      />
    </SidebarProvider>
  );
}
