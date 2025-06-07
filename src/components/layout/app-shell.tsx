
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
// import TransactionModal, { type TransactionFormData } from '@/components/transaction-modal';
import AuthModal from '@/components/auth-modal'; // Keep simplified import for now
// import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import FullScreenLoader from '@/components/ui/full-screen-loader';
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

// Simplified BrandLogoIcon from previous step
const BrandLogoIcon = ({ className }: { className?: string }) => (
  <div className={cn("p-2 bg-muted text-muted-foreground", className)}>Logo</div>
);

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [mounted, setMounted] = useState(false);
  const { user, loading: authLoading, logout, login, signup } = useAuth();
  // const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // Keep this commented

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || authLoading) {
    return <FullScreenLoader message="Caricamento applicazione..." />;
  }

  // For now, we are not showing the "Accesso Richiesto" screen or automatically opening the modal.
  // We'll just display a basic header and the children.

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 print:hidden">
        <BrandLogoIcon className="h-10 w-auto" />
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-foreground">Studio De Vecchi & Mapelli</h1>
          <p className="text-xs text-muted-foreground">Dental Balance</p>
        </div>
        <div className="flex-1" />
        {user ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => alert("AuthModal would open here") /* setIsAuthModalOpen(true) */}>
            Accedi / Registrati (Test)
          </Button>
        )}
      </header>
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        {children}
      </main>
      {/* <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} /> */}
    </div>
  );
}
