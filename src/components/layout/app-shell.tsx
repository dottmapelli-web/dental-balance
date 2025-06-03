
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserCircle, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';

// Specific tooth icon for the brand
const BrandLogoIcon = ({ className }: { className?: string }) => (
 <svg viewBox="0 0 70 90" xmlns="http://www.w3.org/2000/svg" className={cn("fill-none", className)} aria-label="Studio De Vecchi & Mapelli Logo Icon" data-ai-hint="tooth dental">
  <g>
    <path d="M35.2,63.5 C31.5,63.5 28.5,60.7 28.5,57.3 C28.5,53.9 31.5,51.1 35.2,51.1 C38.9,51.1 41.9,53.9 41.9,57.3 C41.9,60.7 38.9,63.5 35.2,63.5 M35.2,45 C26.3,45 19.2,51.6 19.2,59.7 C19.2,69.5 28.8,79.5 30.1,81.2 C30.9,82.3 32.9,85 35.2,85 C37.5,85 39.5,82.3 40.3,81.2 C41.6,79.5 51.2,69.5 51.2,59.7 C51.2,51.6 44.1,45 35.2,45"
        strokeWidth="6" stroke="currentColor" />
    <path d="M19.2,59.7 C19.2,51.6 26.3,45 35.2,45" strokeWidth="6" stroke="hsl(var(--primary))" /> 
    <path d="M28.5,57.3 C28.5,60.7 31.5,63.5 35.2,63.5 M41.9,57.3 C41.9,60.7 38.9,63.5 35.2,63.5" strokeWidth="5" stroke="currentColor" />
  </g>
</svg>
);

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 w-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-primary-foreground shadow-md print:hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Left: Logo and Brand Name */}
          <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileMenuOpen(false)}>
            <BrandLogoIcon className="h-10 w-10 text-white flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-lg font-headline font-semibold leading-tight">Dental Balance</span>
              <span className="text-xs opacity-80 leading-tight">Studio De Vecchi & Mapelli</span>
            </div>
          </Link>

          {/* Center: Navigation (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {siteConfig.navItems.map((item) => {
              const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors",
                    isActive ? "bg-white/20" : "hover:bg-white/10",
                    item.disabled && "opacity-50 cursor-not-allowed"
                  )}
                  aria-disabled={item.disabled}
                  onClick={item.disabled ? (e) => e.preventDefault() : undefined}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          {/* Right: Actions and Mobile Menu Trigger */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/10">
              <UserCircle className="h-6 w-6" />
              <span className="sr-only">Profilo Utente</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white hover:bg-white/10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              <span className="sr-only">Apri menu</span>
            </Button>
          </div>
        </div>
        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-primary/90 backdrop-blur-sm">
            <nav className="flex flex-col px-2 pt-2 pb-4 space-y-1">
              {siteConfig.navItems.map((item) => {
                 const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2",
                      isActive ? "bg-white/20" : "hover:bg-white/10",
                      item.disabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => {
                      if (item.disabled) return;
                      setMobileMenuOpen(false);
                    }}
                    aria-disabled={item.disabled}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
