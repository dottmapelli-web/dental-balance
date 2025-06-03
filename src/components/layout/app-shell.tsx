
"use client";

import React from 'react';
import { UserCircle, PanelLeft } from 'lucide-react'; 
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
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

const BrandLogoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 70 90" xmlns="http://www.w3.org/2000/svg" className={cn("fill-none", className)} aria-label="Studio De Vecchi & Mapelli Logo Icon" data-ai-hint="tooth dental">
   <defs>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style={{stopColor: '#E6C68A', stopOpacity: 1}} />
      <stop offset="100%" style={{stopColor: '#D4A276', stopOpacity: 1}} />
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
  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" className="border-r">
        <SidebarHeader className="p-3">
          {/* Content for expanded sidebar */}
          <div className="flex items-center justify-between group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2">
              <BrandLogoIcon className="h-8 w-8 text-sidebar-primary flex-shrink-0" />
              <div className="flex flex-col">
                <span className="font-headline text-md font-semibold text-sidebar-foreground leading-tight">
                  Dental Balance
                </span>
                <span className="text-xs text-sidebar-foreground/80 leading-tight">
                  Studio De Vecchi &amp; Mapelli
                </span>
              </div>
            </div>
            <SidebarTrigger className="md:flex" /> {/* Desktop trigger */}
          </div>

          {/* Content for collapsed sidebar (only logo, centered) */}
          <div className="hidden group-data-[collapsible=icon]:flex justify-center py-1.5"> {/* Adjusted padding for collapsed state */}
            <BrandLogoIcon className="h-9 w-9 text-sidebar-primary" />
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
        <header className="sticky top-0 z-40 flex h-14 items-center gap-x-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6 print:hidden">
          {/* Mobile Sidebar Trigger - keep on left for mobile */}
          <SidebarTrigger className="md:hidden -ml-2" />

          <div className="flex-1" /> {/* Spacer */}

          {/* User Profile */}
          <Button variant="ghost" size="icon" className="rounded-full">
            <UserCircle className="h-6 w-6" />
            <span className="sr-only">Profilo Utente</span>
          </Button>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
