
"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import AuthModal from '@/components/auth-modal';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut as LogOutIcon } from 'lucide-react'; // Renamed LogOut to LogOutIcon

// Ripristinato il BrandLogoIcon originale con la correzione per lo style tag
const BrandLogoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 170 70" xmlns="http://www.w3.org/2000/svg" className={cn(className)} aria-label="Studio De Vecchi & Mapelli Logo with tooth icon" data-ai-hint="clinic logo tooth vertical">
    <defs>
      <style dangerouslySetInnerHTML={{ __html: `
        .logo-text {
          font-family: 'Arial', sans-serif;
          font-size: 20px;
          font-weight: bold;
          fill: #2c3e50; /* Blu scuro */
        }
        .logo-text-italic {
          font-family: 'Arial', sans-serif;
          font-style: italic;
          font-size: 14px;
          fill: #34495e; /* Blu-grigio */
        }
        .tooth-icon {
          fill: #3498db; /* Blu brillante */
          stroke: #2980b9; /* Blu più scuro per il bordo */
          stroke-width: 0.5px;
        }
      ` }} />
    </defs>
    <rect width="170" height="70" fill="#ffffff" stroke="#e0e0e0" strokeWidth="1" rx="5" ry="5" />
    
    {/* Icona Dente (semplificata) */}
    <path className="tooth-icon" d="M20 15 Q25 10 30 15 L30 30 Q25 40 20 30 Z M30 15 Q35 10 40 15 L40 30 Q35 40 30 30 Z M25 38 Q32.5 55 40 38 Z" transform="translate(5, 5) scale(0.9)" />

    {/* Testo */}
    <text x="60" y="30" className="logo-text">Studio De Vecchi</text>
    <text x="60" y="50" className="logo-text">& Mapelli</text>
    {/* <text x="60" y="65" className="logo-text-italic">Dental Balance</text> */}
  </svg>
);


interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [mounted, setMounted] = useState(false);
  const { user, loading: authLoading, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || authLoading) {
    return <FullScreenLoader message="Caricamento App (Auth)..." />;
  }

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 print-hidden">
        <BrandLogoIcon className="h-10 w-auto" /> {/* Utilizzo del logo SVG */}
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-foreground">Studio De Vecchi & Mapelli</h1>
          <p className="text-xs text-muted-foreground">Dental Balance</p>
        </div>
        <div className="flex-1" />
        {user ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOutIcon className="mr-2 h-4 w-4" /> {/* Assicurati che LogOutIcon sia importato */}
              Logout
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setIsAuthModalOpen(true)}>
            <LogIn className="mr-2 h-4 w-4" />
            Accedi / Registrati
          </Button>
        )}
      </header>

      {user ? (
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
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
      
      <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
    </div>
  );
}
