
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
import { PanelLeft, Settings, UserCircle } from 'lucide-react';

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
        <SidebarHeader className="p-4 items-center">
          <h1 className="text-2xl font-headline font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            {siteConfig.name}
          </h1>
          <h2 className="text-sm text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden">
            Studio De Vecchi & Mapelli
          </h2>
           {/* Icon visible when collapsed */}
           <svg role="img" aria-label="Dental Balance Logo" className="h-8 w-8 hidden group-data-[collapsible=icon]:block text-primary" viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" data-ai-hint="logo abstract">
            <path d="M50 10C27.9086 10 10 27.9086 10 50C10 72.0914 27.9086 90 50 90C72.0914 90 90 72.0914 90 50C90 27.9086 72.0914 10 50 10ZM50 82C32.3269 82 18 67.6731 18 50C18 32.3269 32.3269 18 50 18C67.6731 18 82 32.3269 82 50C82 67.6731 67.6731 82 50 82Z"/>
            <path d="M50 25C48.3431 25 47 26.3431 47 28V47H28C26.3431 47 25 48.3431 25 50C25 51.6569 26.3431 53 28 53H47V72C47 73.6569 48.3431 75 50 75C51.6569 75 53 73.6569 53 72V53H72C73.6569 53 75 51.6569 75 50C75 48.3431 73.6569 47 72 47H53V28C53 26.3431 51.6569 25 50 25Z" />
          </svg>
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

    