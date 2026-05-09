"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/config/site";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function TopNavbar() {
  const pathname = usePathname();
  const items = siteConfig.navItems;

  if (!items?.length) {
    return null;
  }

  return (
    <nav className="relative flex items-center bg-white/5 dark:bg-black/20 rounded-full p-1.5 backdrop-blur-sm border border-white/10 shadow-inner">
      <TooltipProvider delayDuration={200}>
        {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);

          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Link
                  href={item.disabled ? "#" : item.href}
                  onClick={item.disabled ? (e: React.MouseEvent) => e.preventDefault() : undefined}
                  className={cn(
                    "relative flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] transition-all duration-500 ease-out whitespace-nowrap overflow-hidden group",
                    isActive ? "text-[hsl(var(--gold-900))] dark:text-[hsl(var(--gold-50))] font-black tracking-wide" : "text-muted-foreground hover:text-[hsl(var(--gold-600))] font-medium",
                    item.disabled && "cursor-not-allowed opacity-40 pointer-events-none"
                  )}
                >
                  {/* Animated Pill Background */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--gold-100))] to-[hsl(var(--gold-300))] dark:from-[hsl(var(--gold-800))] dark:to-[hsl(var(--gold-900))] shadow-[0_4px_15px_-3px_rgba(var(--gold-glow),0.3)] z-0"
                      transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
                    />
                  )}
                  
                  {/* Hover effect indicator */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-[hsl(var(--gold-400)/0.05)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
                  )}

                  <div className="relative z-10 flex items-center gap-2">
                    {Icon && (
                      <Icon className={cn(
                        "h-4 w-4 shrink-0 transition-all duration-500",
                        isActive ? "text-[hsl(var(--gold-700))] dark:text-[hsl(var(--gold-200))] scale-110 drop-shadow-[0_0_8px_rgba(var(--gold-glow),0.5)]" : "group-hover:scale-110"
                      )} />
                    )}
                    <span className="hidden md:inline-block tracking-tight">{item.title}</span>
                  </div>
                  
                  {/* Active bottom glow line */}
                  {isActive && (
                    <motion.div 
                      layoutId="nav-glow"
                      className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-[hsl(var(--gold-400))] shadow-[0_0_12px_hsl(var(--gold-400))]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.8 }}
                    />
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent className="md:hidden glass-premium border-[hsl(var(--gold-400)/0.3)]" sideOffset={10}>
                {item.title}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </nav>
  );
}
