
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
// import TransactionModal, { type TransactionFormData } from '@/components/transaction-modal';
// import AuthModal from '@/components/auth-modal'; // Mantenuto import semplificato, ma non usato
// import { useAuth } from '@/contexts/auth-context'; // TEMPORANEAMENTE COMMENTATO
// import FullScreenLoader from '@/components/ui/full-screen-loader'; // TEMPORANEAMENTE COMMENTATO
// import { UserCircle, PlusCircle, FileText, Moon, Sun, LogOut, LogIn, Menu } from 'lucide-react';
// import { useTheme } from "next-themes";
// import { siteConfig } from '@/config/site';
// import {
//   SidebarProvider,
//   Sidebar,
//   SidebarHeader,
//   SidebarContent,
//   SidebarFooter,
//   SidebarInset,
//   SidebarTrigger,
// } from '@/components/ui/sidebar';
// import MainSidebarNav from '@/components/layout/main-sidebar-nav';
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


// BrandLogoIcon semplificato dal passo precedente
const BrandLogoIcon = ({ className }: { className?: string }) => (
  <div className={cn("p-2 bg-muted text-muted-foreground", className)}>Logo</div>
);


interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [mounted, setMounted] = useState(false);
  // const { user, loading: authLoading, logout } = useAuth(); // TEMPORANEAMENTE COMMENTATO
  // const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // Mantenuto commentato


  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted /* || authLoading */) { // authLoading è commentato
    // return <FullScreenLoader message="Caricamento applicazione (app-shell molto semplificata)..." />;
    // Loader inline molto semplice:
    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <svg className="animate-spin h-12 w-12 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg text-muted-foreground">Caricamento applicazione (app-shell super semplificata)...</p>
        </div>
    );
  }

  // Header e logica di autenticazione semplificati al massimo
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 print:hidden">
        <BrandLogoIcon className="h-10 w-auto" />
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-foreground">Studio De Vecchi & Mapelli</h1>
          <p className="text-xs text-muted-foreground">Dental Balance</p>
        </div>
        <div className="flex-1" />
        {/* Placeholder per pulsante auth, non funzionale per ora */}
        <Button variant="outline" size="sm" onClick={() => alert("Pulsante Auth Placeholder")}>
            Accedi / Registrati (Placeholder)
        </Button>
      </header>
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        {children}
      </main>
      {/* <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} /> // Mantenuto commentato*/}
    </div>
  );
}
