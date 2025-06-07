
"use client";

import React, { useState, useEffect } from 'react';
// import { UserCircle, PlusCircle, FileText, Moon, Sun, LogOut, LogIn } from 'lucide-react';
// import { useTheme } from "next-themes";
// import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
// import TransactionModal, { type TransactionFormData } from '@/components/transaction-modal';
// import AuthModal from '@/components/auth-modal'; // Ripristinato alias, ma temporaneamente non usato
// import { useToast } from '@/hooks/use-toast';
// import { useAuth } from '@/contexts/auth-context';
// import FullScreenLoader from '@/components/ui/full-screen-loader';
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Versione super semplificata per debug
const BrandLogoIcon = ({ className }: { className?: string }) => (
  <div className={cn("p-2 bg-muted text-muted-foreground", className)}>Logo</div>
);

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  // const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);
  // const [transactionTypeForModal, setTransactionTypeForModal] = useState<'Entrata' | 'Uscita'>('Uscita');
  // const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  // const { toast } = useToast();
  // const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // const { user, loading: authLoading, logout, login, signup } = useAuth(); // Temporaneamente rimosso useAuth

  useEffect(() => {
    setMounted(true);
  }, []);

  // if (!mounted || authLoading) { // Temporaneamente rimosso authLoading
  if (!mounted) {
    // return <FullScreenLoader message="Caricamento AppShell..." />; // Temporaneamente rimosso FullScreenLoader
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
        <p className="text-lg text-muted-foreground">Caricamento AppShell...</p>
      </div>
    );
  }

  // Temporaneamente rimossa tutta la logica di autenticazione e la UI complessa
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 print:hidden">
        <BrandLogoIcon className="h-10 w-auto" />
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-foreground">Studio De Vecchi & Mapelli (Debug)</h1>
          <p className="text-xs text-muted-foreground">Dental Balance</p>
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm">Debug Button</Button>
      </header>
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        {children}
      </main>
      {/* <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} /> */}
    </div>
  );
}
