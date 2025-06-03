
"use client";

import React from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import MainSidebarNav from './main-sidebar-nav';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/button';
import { PanelLeft, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils'; // Added missing import

// Icona del dente specifica per il brand
const BrandLogoIcon = ({ className }: { className?: string }) => (
 <svg viewBox="0 0 70 90" xmlns="http://www.w3.org/2000/svg" className={cn("fill-none", className)} aria-label="Studio De Vecchi & Mapelli Logo Icon" data-ai-hint="tooth dental">
  <g>
    <path d="M35.2,63.5 C31.5,63.5 28.5,60.7 28.5,57.3 C28.5,53.9 31.5,51.1 35.2,51.1 C38.9,51.1 41.9,53.9 41.9,57.3 C41.9,60.7 38.9,63.5 35.2,63.5 M35.2,45 C26.3,45 19.2,51.6 19.2,59.7 C19.2,69.5 28.8,79.5 30.1,81.2 C30.9,82.3 32.9,85 35.2,85 C37.5,85 39.5,82.3 40.3,81.2 C41.6,79.5 51.2,69.5 51.2,59.7 C51.2,51.6 44.1,45 35.2,45"
        strokeWidth="6" stroke="currentColor" />
    <path d="M19.2,59.7 C19.2,51.6 26.3,45 35.2,45" strokeWidth="6" stroke="#D4A276" /> 
    <path d="M28.5,57.3 C28.5,60.7 31.5,63.5 35.2,63.5 M41.9,57.3 C41.9,60.7 38.9,63.5 35.2,63.5" strokeWidth="5" stroke="currentColor" />
  </g>
</svg>
);


interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar
        variant="sidebar" 
        collapsible="icon"
        className="border-r"
      >
        <SidebarHeader className="p-3 flex items-center h-[70px] justify-center group-data-[collapsible=icon]:justify-center">
          {/* Expanded View: Icon + Text */}
          <div className="group-data-[collapsible=icon]:hidden flex items-center space-x-2.5 overflow-hidden">
            <BrandLogoIcon className="h-10 w-10 text-sidebar-primary-foreground flex-shrink-0" />
            <div className="flex flex-col justify-center overflow-hidden">
              <h1 className="text-md font-headline font-semibold text-sidebar-primary-foreground truncate">Dental Balance</h1>
              <p className="text-xs text-sidebar-foreground/80 truncate">Studio De Vecchi & Mapelli</p>
            </div>
          </div>
          
          {/* Collapsed View: Icon Only */}
          <div className="hidden group-data-[collapsible=icon]:block">
            <BrandLogoIcon className="h-8 w-8 text-sidebar-accent" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <MainSidebarNav items={siteConfig.navItems} />
        </SidebarContent>
        <SidebarFooter className="p-2">
           {/* Placeholder for user profile / settings link */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:h-16 sm:px-6">
          <SidebarTrigger className="md:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </SidebarTrigger>
          <div className="flex-1">
            {/* Could add breadcrumbs or dynamic page title here */}
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
            <UserCircle className="h-6 w-6" />
            <span className="sr-only">Profilo Utente</span>
          </Button>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
