
"use client";

import React, { useState, useEffect } from 'react';
import { UserCircle, PlusCircle, FileText, Moon, Sun } from 'lucide-react'; 
import { useTheme } from "next-themes";
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
  <svg viewBox="0 0 170 70" xmlns="http://www.w3.org/2000/svg" className={cn(className)} aria-label="Studio De Vecchi & Mapelli Logo with tooth icon" data-ai-hint="clinic logo tooth vertical">
    <defs>
      <style>
        {`
          .logo-text { font-family: 'Literata', 'Georgia', serif; }
          .logo-text-main { fill: hsl(var(--sidebar-foreground)); }
          .logo-text-amp { fill: hsl(var(--sidebar-primary)); }
          .divider-line { stroke: hsl(var(--sidebar-foreground)); stroke-width:1.5; }
          .tooth-icon { fill: hsl(var(--sidebar-primary)); }
        `}
      </style>
    </defs>

    {/* Stylized Tooth Icon */}
    <g transform="translate(10, 22.5)" className="tooth-icon">
      <path d="M3,2 C6,2 7,0 10,0 C13,0 14,2 17,2 C20,2 20,6 20,6 L20,15 C20,18 18,20 15,20 L13,20 L13,23 L11,25 L9,25 L7,23 L7,20 L5,20 C2,20 0,18 0,15 L0,6 C0,6 0,2 3,2 Z" />
    </g>

    <line className="divider-line" x1="45" y1="8" x2="45" y2="62" />

    <text x="60" y="26" fontSize="17" fontWeight="500" className="logo-text logo-text-main">De Vecchi</text>
    <text x="60" y="44" fontSize="15" fontWeight="700" className="logo-text logo-text-amp">&</text>
    <text x="60" y="61" fontSize="17" fontWeight="500" className="logo-text logo-text-main">Mapelli</text>
  </svg>
);


interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionTypeForModal, setTransactionTypeForModal] = useState<'Entrata' | 'Uscita'>('Uscita');
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNewTransaction = (type: 'Entrata' | 'Uscita') => {
    setTransactionTypeForModal(type);
    setTransactionModalOpen(true);
  };

  const handleTransactionSubmit = (data: TransactionFormData) => {
    console.log("AppShell transaction submitted (simulated):", data);
    toast({
      title: "Transazione Aggiunta (Simulato)",
      description: `Aggiunta ${data.type}: ${data.description || 'N/A'} - €${data.amount.toFixed(2)}`,
    });
  };

  const handleGenerateReport = () => {
    toast({
        title: "Funzionalità Report",
        description: "La generazione di report PDF/stampa è in fase di sviluppo.",
        variant: "default",
    });
    console.log("Genera Report");
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  if (!mounted) {
    return null; 
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" className="border-r border-sidebar-border">
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
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
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

