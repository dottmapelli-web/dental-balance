
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

// Logo SVG completo per la vista espansa
const FullLogo = () => (
  <svg viewBox="0 0 220 70" xmlns="http://www.w3.org/2000/svg" className="h-10 w-auto" aria-label="Studio De Vecchi & Mapelli Logo">
    {/* Tooth Icon */}
    <g transform="translate(-5, -12) scale(0.45)">
      <path d="M35.2,63.5 C31.5,63.5 28.5,60.7 28.5,57.3 C28.5,53.9 31.5,51.1 35.2,51.1 C38.9,51.1 41.9,53.9 41.9,57.3 C41.9,60.7 38.9,63.5 35.2,63.5 M35.2,45 C26.3,45 19.2,51.6 19.2,59.7 C19.2,69.5 28.8,79.5 30.1,81.2 C30.9,82.3 32.9,85 35.2,85 C37.5,85 39.5,82.3 40.3,81.2 C41.6,79.5 51.2,69.5 51.2,59.7 C51.2,51.6 44.1,45 35.2,45"
          strokeWidth="6" stroke="white" fill="none" />
      <path d="M19.2,59.7 C19.2,51.6 26.3,45 35.2,45" strokeWidth="6" stroke="#D4A276" fill="none" />
      <path d="M28.5,57.3 C28.5,60.7 31.5,63.5 35.2,63.5 M41.9,57.3 C41.9,60.7 38.9,63.5 35.2,63.5" strokeWidth="5" stroke="white" fill="none" />
    </g>
    {/* Vertical Separator */}
    <line x1="50" y1="8" x2="50" y2="62" stroke="white" strokeWidth="1" />
    {/* Text: De Vecchi & Mapelli */}
    <text x="65" y="22" fontFamily="Verdana, Geneva, sans-serif" fontSize="13" fontWeight="bold" fontStyle="italic" fill="white">De Vecchi</text>
    <text x="65" y="40" fontFamily="Verdana, Geneva, sans-serif" fontSize="11" fill="#D4A276" fontWeight="bold" fontStyle="italic">&</text>
    <text x="65" y="58" fontFamily="Verdana, Geneva, sans-serif" fontSize="13" fontWeight="bold" fontStyle="italic" fill="white">Mapelli</text>
    {/* Horizontal Line (under text, above tagline if it existed) */}
    <line x1="5" y1="68" x2="215" y2="68" stroke="#D4A276" strokeWidth="1" />
    {/* Tagline could be added here if space allows and desired */}
    {/* <text x="110" y="78" fontFamily="Verdana, Geneva, sans-serif" fontSize="7" fill="white" textAnchor="middle">Odontoiatria, Estetica e Innovazione</text> */}
  </svg>
);

// Icona del dente semplificata per la vista compressa
const ToothIcon = () => (
 <svg viewBox="0 0 70 90" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" aria-label="Studio De Vecchi & Mapelli Logo Icon" data-ai-hint="tooth dental">
  <g>
    <path d="M35.2,63.5 C31.5,63.5 28.5,60.7 28.5,57.3 C28.5,53.9 31.5,51.1 35.2,51.1 C38.9,51.1 41.9,53.9 41.9,57.3 C41.9,60.7 38.9,63.5 35.2,63.5 M35.2,45 C26.3,45 19.2,51.6 19.2,59.7 C19.2,69.5 28.8,79.5 30.1,81.2 C30.9,82.3 32.9,85 35.2,85 C37.5,85 39.5,82.3 40.3,81.2 C41.6,79.5 51.2,69.5 51.2,59.7 C51.2,51.6 44.1,45 35.2,45"
        strokeWidth="6" stroke="currentColor" fill="none" />
    {/* This part is the orange stroke on the left side of the tooth in the original logo */}
    <path d="M19.2,59.7 C19.2,51.6 26.3,45 35.2,45" strokeWidth="6" stroke="#D4A276" fill="none" /> 
     {/* The "smile" part of the tooth */}
    <path d="M28.5,57.3 C28.5,60.7 31.5,63.5 35.2,63.5 M41.9,57.3 C41.9,60.7 38.9,63.5 35.2,63.5" strokeWidth="5" stroke="currentColor" fill="none" />
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
        <SidebarHeader className="p-4 flex items-center justify-center h-[70px]"> {/* Fixed height and centered content */}
          {/* Expanded View: Full Logo */}
          <div className="group-data-[collapsible=icon]:hidden">
            <FullLogo />
          </div>
          
          {/* Collapsed View: Tooth Icon */}
          <div className="hidden group-data-[collapsible=icon]:block">
            <ToothIcon />
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
