
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
  <svg viewBox="0 0 70 90" xmlns="http://www.w3.org/2000/svg" className={cn("fill-none", className)} aria-label="Studio De Vecchi & Mapelli Logo Icon" data-ai-hint="tooth dental">
   <defs>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style={{stopColor: 'hsl(var(--sidebar-primary-foreground))', stopOpacity: 0.7}} />
      <stop offset="100%" style={{stopColor: 'hsl(var(--sidebar-primary))', stopOpacity: 1}} />
    </linearGradient>
  </defs>
  <g>
    <path d="M35.2,63.5 C31.5,63.5 28.5,60.7 28.5,57.3 C28.5,53.9 31.5,51.1 35.2,51.1 C38.9,51.1 41.9,53.9 41.9,57.3 C41.9,60.7 38.9,63.5 35.2,63.5 M35.2,45 C26.3,45 19.2,51.6 19.2,59.7 C19.2,69.5 28.8,79.5 30.1,81.2 C30.9,82.3 32.9,85 35.2,85 C37.5,85 39.5,82.3 40.3,81.2 C41.6,79.5 51.2,69.5 51.2,59.7 C51.2,51.6 44.1,45 35.2,45"
        strokeWidth="5" stroke="currentColor" fill="hsl(var(--sidebar-background))" />
    <path d="M19.2,59.7 C19.2,51.6 26.3,45 35.2,45" strokeWidth="5" stroke="url(#goldGradient)" />
    <path d="M28.5,57.3 C28.5,60.7 31.5,63.5 35.2,63.5 M41.9,57.3 C41.9,60.7 38.9,63.5 35.2,63.5" strokeWidth="4" stroke="currentColor" />
  </g>
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
              <BrandLogoIcon className="h-8 w-8 text-sidebar-primary flex-shrink-0" />
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

    