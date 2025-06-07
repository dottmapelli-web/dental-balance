
"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import AuthModal from '@/components/auth-modal';
import { useAuth } from '@/contexts/auth-context';
import FullScreenLoader from '@/components/ui/full-screen-loader';
import { LogIn, LogOut as LogOutIcon, Menu, Moon, Sun, Settings, LayoutDashboard } from 'lucide-react';
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
} from '@/components/ui/sidebar';
import MainSidebarNav from '@/components/layout/main-sidebar-nav';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // Rimossa AvatarImage se non usata

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
        /* Dark theme adjustments */
        .dark .logo-text { fill: #ecf0f1; } /* Testo chiaro per tema scuro */
        .dark .logo-text-italic { fill: #bdc3c7; } /* Testo grigio chiaro per tema scuro */
        .dark .tooth-icon { fill: #5dade2; stroke: #3498db; } /* Icona dente per tema scuro */
        /* Commentato per non sovrascrivere lo sfondo di default del SVG se non necessario per il tema */
        /* .dark rect { fill: #2c3e50; stroke: #34495e; } */
      ` }} />
    </defs>
    <rect width="170" height="70" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1" rx="5" ry="5" />
    <path className="tooth-icon" d="M20 15 Q25 10 30 15 L30 30 Q25 40 20 30 Z M30 15 Q35 10 40 15 L40 30 Q35 40 30 30 Z M25 38 Q32.5 55 40 38 Z" transform="translate(5, 5) scale(0.9)" />
    <text x="60" y="30" className="logo-text">Studio De Vecchi</text>
    <text x="60" y="50" className="logo-text">& Mapelli</text>
  </svg>
);


interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [mounted, setMounted] = useState(false);
  const { user, loading: authLoading, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { setTheme, theme } = useTheme();

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

  return (
    <SidebarProvider defaultOpen>
      <Sidebar side="left" variant="sidebar" collapsible="icon" className=""> 
        <SidebarHeader className="items-center">
          <BrandLogoIcon className="h-10 w-auto group-data-[collapsible=icon]:hidden" />
          <LayoutDashboard className="h-8 w-8 text-primary group-data-[collapsible=icon]:block hidden" />
        </SidebarHeader>
        <SidebarContent>
          <MainSidebarNav items={siteConfig.navItems} />
        </SidebarContent>
        <SidebarFooter>
          {subHeaderNavItems && subHeaderNavItems.length > 0 && <MainSidebarNav items={subHeaderNavItems} />}
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className=""> 
        <header className="sticky top-0 z-30 flex h-16 items-center gap-x-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 print-hidden"> 
          <SidebarTrigger className="md:hidden" />
          
          <div className="flex flex-col sm:hidden">
            <h1 className="text-lg font-bold text-foreground truncate max-w-[150px]">{siteConfig.name}</h1>
          </div>
          
          <div className="flex-1" /> 
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    {/* <AvatarImage src={user.photoURL || ""} alt="User avatar" /> */}
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
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6"> 
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
    </SidebarProvider>
  );
}
