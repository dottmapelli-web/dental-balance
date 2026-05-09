"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  User,
  LayoutDashboard,
  ArrowRightLeft,
  CalendarDays,
  BarChart3,
  Goal,
  Settings,
  GanttChart,
  PlusCircle,
  MinusCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenTransaction: (type: 'Entrata' | 'Uscita') => void;
}

export default function Sidebar({ isCollapsed, setIsCollapsed, onOpenTransaction }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const items = siteConfig.navItems;

  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-full z-40 bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))] transition-all duration-300 flex flex-col shadow-lg",
        isCollapsed ? "w-[80px]" : "w-[280px]"
      )}
    >
      {/* Sidebar Header - Branding */}
      <div className="h-20 flex items-center px-6 border-b border-[hsl(var(--sidebar-border))] shrink-0 bg-white/50 dark:bg-black/20">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center shrink-0 shadow-sm border border-[hsl(var(--navy-accent)/0.1)]">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-[hsl(var(--navy-accent))]">
               <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor" opacity="0.3"/>
               <path d="M12 6C9.79 6 8 7.79 8 10V14C8 16.21 9.79 18 12 18C14.21 18 16 16.21 16 14V10C16 7.79 14.21 6 12 6ZM14 14C14 15.1 13.1 16 12 16C10.9 16 10 15.1 10 14V10C10 8.9 10.9 8 12 8C13.1 8 14 8.9 14 10V14Z" fill="currentColor"/>
            </svg>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-serif font-bold text-base text-[hsl(var(--navy-accent))] leading-tight">
                Studio De Vecchi
              </span>
              <span className="font-serif font-medium text-xs text-[hsl(var(--navy-accent)/0.7)]">
                & Mapelli
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-8 px-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800">
        {!isCollapsed && (
          <div className="px-3 mb-4 text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 dark:text-slate-500">
            Menu Principale
          </div>
        )}
        
        {items.map((item, index) => {
          const isActive = item.href === "/" 
            ? pathname === "/" 
            : pathname.startsWith(item.href);
          
          return (
            <Link
              key={index}
              href={item.disabled ? "#" : item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative",
                isActive 
                  ? "bg-white dark:bg-zinc-900 text-[hsl(var(--navy-accent))] shadow-sm border border-[hsl(var(--sidebar-border))]" 
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white/80 dark:hover:bg-zinc-900/50",
                item.disabled && "opacity-40 pointer-events-none"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 shrink-0 transition-transform duration-300",
                isActive ? "text-[hsl(var(--navy-accent))]" : "text-slate-400 group-hover:scale-110"
              )} />
              {!isCollapsed && (
                <span className={cn(
                  "text-sm font-semibold truncate tracking-tight",
                  isActive ? "text-[hsl(var(--navy-accent))]" : ""
                )}>
                  {item.title}
                </span>
              )}
              {isActive && (
                <motion.div 
                  layoutId="active-indicator"
                  className="absolute left-0 w-1 h-6 bg-[hsl(var(--navy-accent))] rounded-r-full"
                />
              )}
            </Link>
          );
        })}

        {/* Quick Actions */}
        {user && !isCollapsed && (
          <div className="mt-10 px-3 space-y-4">
            <div className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 dark:text-slate-500 mb-2">
              Azioni Rapide
            </div>
            <Button 
              onClick={() => onOpenTransaction('Entrata')}
              className="w-full justify-start gap-3 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border-none rounded-xl h-11 px-4 transition-all shadow-none"
            >
              <PlusCircle className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Entrata</span>
            </Button>
            <Button 
              onClick={() => onOpenTransaction('Uscita')}
              className="w-full justify-start gap-3 bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white border-none rounded-xl h-11 px-4 transition-all shadow-none"
            >
              <MinusCircle className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Uscita</span>
            </Button>
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-6 border-t border-[hsl(var(--sidebar-border))] bg-white/30 dark:bg-black/10">
        {user ? (
          <div className={cn(
            "flex items-center gap-3",
            isCollapsed ? "justify-center" : "px-1"
          )}>
            <Avatar className="w-10 h-10 border-2 border-white dark:border-zinc-800 shadow-md shrink-0">
              <AvatarFallback className="bg-[hsl(var(--primary))] text-[hsl(var(--navy-accent))] text-xs font-bold">
                {getInitials(user.email)}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate uppercase tracking-tighter">
                  Profilo Studio
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-medium">
                  {user.email}
                </p>
              </div>
            )}
            {!isCollapsed && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0"
                onClick={() => signOut()}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        ) : (
          <Button 
            variant="ghost" 
            className={cn(
              "w-full text-slate-600 hover:bg-slate-100 rounded-xl gap-2",
              isCollapsed ? "justify-center px-0" : "justify-start px-3"
            )}
          >
            <User className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="text-sm font-bold">Accedi</span>}
          </Button>
        )}
      </div>

      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-24 w-7 h-7 bg-white dark:bg-zinc-800 border border-[hsl(var(--sidebar-border))] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all z-50 group"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[hsl(var(--navy-accent))]" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-[hsl(var(--navy-accent))]" />
        )}
      </button>
    </aside>
  );
}
