"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { Settings, Bell, User, Menu, X, PlusCircle, MinusCircle, Camera, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";

interface ModernNavbarProps {
  onOpenTransaction: (type: 'Entrata' | 'Uscita') => void;
  onOpenScanner?: () => void;
}

export default function ModernNavbar({ onOpenTransaction, onOpenScanner }: ModernNavbarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const items = siteConfig.navItems;

  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 w-full px-6 py-4">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between glass-nav rounded-[2rem] px-6 py-3 shadow-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-[#1D1D1D] dark:bg-white flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white dark:text-black">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" opacity="0.9"/>
            </svg>
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">Dental Balance</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center bg-[#F4F4F4]/50 dark:bg-white/5 rounded-full p-1.5 gap-1">
          {items.map((item) => {
            const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300",
                  isActive 
                    ? "bg-[#1D1D1D] text-white shadow-md dark:bg-white dark:text-black" 
                    : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Action Buttons (Hidden on small mobile) */}
          <div className="hidden md:flex items-center gap-2 mr-2 border-r border-border pr-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-full gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              onClick={() => onOpenTransaction('Entrata')}
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden xl:inline">Entrata</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                >
                  <MinusCircle className="w-4 h-4" />
                  <span className="hidden xl:inline">Uscita</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl p-1.5 w-52 mt-1 shadow-xl">
                <DropdownMenuItem
                  className="rounded-xl cursor-pointer py-2.5 px-3 gap-2"
                  onClick={() => onOpenTransaction('Uscita')}
                >
                  <Edit2 className="h-4 w-4 text-rose-500" />
                  <span className="text-sm font-medium">Inserisci manualmente</span>
                </DropdownMenuItem>
                {onOpenScanner && (
                  <DropdownMenuItem
                    className="rounded-xl cursor-pointer py-2.5 px-3 gap-2"
                    onClick={onOpenScanner}
                  >
                    <Camera className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">Importa fattura (AI)</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5 dark:hover:bg-white/5">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </Button>
          
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5 dark:hover:bg-white/5 relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-950"></span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="rounded-full h-10 w-10 p-0 ml-1 overflow-hidden ring-offset-background transition-all hover:ring-2 hover:ring-primary/20">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-[#1D1D1D] text-white dark:bg-white dark:text-black font-bold">
                    {getInitials(user?.email)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 mt-2 shadow-xl border-white/20 backdrop-blur-xl">
              <DropdownMenuLabel className="px-3 py-2">
                <div className="flex flex-col">
                  <span className="text-sm font-bold">Amministratore</span>
                  <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 opacity-50" />
              <DropdownMenuItem className="rounded-xl cursor-pointer py-2 px-3">
                <User className="mr-2 h-4 w-4" />
                <span>Profilo</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl cursor-pointer py-2 px-3">
                <Settings className="mr-2 h-4 w-4" />
                <span>Impostazioni</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 opacity-50" />
              <DropdownMenuItem 
                className="rounded-xl cursor-pointer py-2 px-3 text-rose-500 focus:text-rose-500 focus:bg-rose-50 dark:focus:bg-rose-950/30"
                onClick={() => signOut()}
              >
                <span>Esci</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden rounded-full ml-1"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden absolute top-full left-6 right-6 mt-4 p-4 glass-card rounded-[2rem] shadow-2xl z-50"
          >
            <nav className="flex flex-col gap-2">
              {items.map((item) => {
                const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "px-6 py-3 rounded-2xl text-base font-semibold transition-all",
                      isActive 
                        ? "bg-[#1D1D1D] text-white dark:bg-white dark:text-black" 
                        : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    {item.title}
                  </Link>
                );
              })}
              <div className="h-[1px] bg-border my-2 mx-4" />
              <div className="grid grid-cols-2 gap-3 px-2">
                <Button 
                  className="rounded-2xl gap-2 bg-emerald-500 hover:bg-emerald-600 text-white border-none"
                  onClick={() => { onOpenTransaction('Entrata'); setIsMobileMenuOpen(false); }}
                >
                  <PlusCircle className="w-4 h-4" />
                  Entrata
                </Button>
                <Button 
                  className="rounded-2xl gap-2 bg-rose-500 hover:bg-rose-600 text-white border-none"
                  onClick={() => { onOpenTransaction('Uscita'); setIsMobileMenuOpen(false); }}
                >
                  <MinusCircle className="w-4 h-4" />
                  Uscita
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
