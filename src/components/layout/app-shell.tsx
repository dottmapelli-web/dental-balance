
"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
// import TransactionModal, { type TransactionFormData } from '@/components/transaction-modal';
// import AuthModal from '@/components/auth-modal'; // AuthModal ancora commentato
import { useAuth } from '@/contexts/auth-context'; // Reintrodotto useAuth
import FullScreenLoader from '@/components/ui/full-screen-loader'; // Reintrodotto FullScreenLoader
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
import { Button } from '@/components/ui/button';

// BrandLogoIcon super-semplificato
const BrandLogoIcon = ({ className }: { className?: string }) => (
  <div className={cn("p-2 bg-primary text-primary-foreground text-xs font-bold", className)}>LOGO</div>
);

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [mounted, setMounted] = useState(false);
  const { user, loading: authLoading } = useAuth(); // logout non è ancora usato
  // const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // AuthModal non usato

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || authLoading) {
    return <FullScreenLoader message="Caricamento App (Auth)..." />;
  }

  // Header e logica di autenticazione semplificati al massimo
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 print:hidden">
        <BrandLogoIcon className="h-8 w-auto" />
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-foreground">Studio De Vecchi & Mapelli</h1>
          <p className="text-xs text-muted-foreground">Dental Balance (Versione Semplificata)</p>
        </div>
        <div className="flex-1" />
        {user ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="outline" size="sm" onClick={() => alert("Logout Placeholder")}>
              Logout
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => alert("Auth Placeholder: Apri Modale Login/Signup")}>
              Accedi / Registrati (Placeholder)
          </Button>
        )}
      </header>
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        {children}
      </main>
      {/* AuthModal e TransactionModal non vengono renderizzati attivamente qui per ora */}
      {/* <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} /> */}
    </div>
  );
}
