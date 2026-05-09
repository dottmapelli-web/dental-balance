"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function TopNavbar() {
  const pathname = usePathname();
  const items = siteConfig.navItems;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!navRef.current) return;
      const rect = navRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  if (!items?.length) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div 
        ref={navRef}
        className="rounded-full group/nav-container relative"
      >
        <nav className="glass-premium glass-refractive p-1.5 flex items-center relative overflow-hidden rounded-full border border-[hsl(var(--gold-400)/0.4)] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)]">
          {/* Subtle moving spotlight background */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-0 group-hover/nav-container:opacity-100 transition-opacity duration-1000"
            style={{
              background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(var(--gold-glow-rgb), 0.2), transparent 70%)`
            }}
          />
          
          {/* Luxury Beam Sweep - Slower and more elegant */}
          <div className="beam-sweep opacity-30 animate-[luxury-beam_12s_infinite]" />

          <div className="flex items-center gap-1 relative z-10 px-1">
            {items.map((item, index) => {
              const Icon = item.icon;
              const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);

              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.disabled ? "#" : item.href}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onClick={item.disabled ? (e: React.MouseEvent) => e.preventDefault() : undefined}
                      className={cn(
                        "relative flex items-center gap-2 rounded-full px-5 py-2.5 transition-all duration-500 ease-out group/item",
                        isActive 
                          ? "text-white dark:text-black" 
                          : "text-muted-foreground hover:text-foreground",
                        item.disabled && "cursor-not-allowed opacity-40 pointer-events-none"
                      )}
                    >
                      {/* Active Background Pill - Hyper-Liquid Gradient */}
                      <AnimatePresence mode="wait">
                        {isActive && (
                          <motion.div
                            layoutId="nav-active-bg"
                            className="absolute inset-0 rounded-full z-[-1] overflow-hidden shadow-[0_15px_40px_-5px_rgba(var(--gold-glow-rgb),0.8)]"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ 
                              type: "spring", 
                              stiffness: 260,
                              damping: 20,
                              mass: 0.6
                            }}
                          >
                            {/* Living Gold Gradient */}
                            <div className="absolute inset-0 bg-[var(--mercury-living)] animate-[mercury-living_8s_linear_infinite] bg-[length:300%_300%]" />
                            <div className="absolute inset-0 bg-white/40 dark:bg-black/40 mix-blend-overlay" />
                            
                            {/* Inner Shimmer Sweep - Sharp diamond-like reflection */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/90 to-transparent -translate-x-full animate-[hyper-shine_1.8s_infinite] opacity-100" />
                            
                            {/* Specular Highlights */}
                            <div className="absolute inset-x-4 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/100 to-transparent blur-[1px]" />
                            <div className="absolute inset-x-8 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[hsl(var(--gold-100))] to-transparent blur-[1px]" />
                            
                            {/* Inner Jewel Glow */}
                            <div className="absolute inset-0 bg-[rgba(var(--gold-glow-rgb),0.4)] blur-[20px] opacity-60 animate-pulse" />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Hover indicator (Spotlight) */}
                      <AnimatePresence>
                        {hoveredIndex === index && !isActive && (
                          <motion.div
                            layoutId="nav-hover-bg"
                            className="absolute inset-0 bg-[hsl(var(--gold-400)/0.3)] dark:bg-[hsl(var(--gold-300)/0.2)] rounded-full z-[-1] blur-[6px]"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.4 }}
                          />
                        )}
                      </AnimatePresence>

                      <div className="flex items-center gap-2 relative">
                        {Icon && (
                          <Icon className={cn(
                            "h-4 w-4 shrink-0 transition-all duration-1000 ease-out",
                            isActive 
                              ? "scale-125 drop-shadow-[0_0_25px_rgba(255,255,255,1)] dark:drop-shadow-[0_0_20px_rgba(var(--gold-glow-rgb),1)]" 
                              : "group-hover/item:scale-135 group-hover/item:text-[hsl(var(--gold-600))] dark:group-hover/item:text-[hsl(var(--gold-300))] group-hover/item:drop-shadow-[0_0_15px_rgba(var(--gold-glow-rgb),0.6)]"
                          )} />
                        )}
                        <span className={cn(
                          "hidden xl:inline-block tracking-[0.25em] text-[10px] uppercase transition-all duration-700 font-black",
                          isActive 
                            ? "text-white dark:text-black drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)]" 
                            : "opacity-80 group-hover/item:opacity-100 group-hover/item:tracking-[0.3em]"
                        )}>
                          {item.title}
                        </span>
                      </div>

                      {/* Active Indicator Dot - Animated Jewelry Style */}
                      {isActive && (
                        <motion.div
                          layoutId="nav-dot"
                          className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-white dark:bg-[hsl(var(--gold-200))] rounded-full shadow-[0_0_25px_rgba(var(--gold-glow-rgb),1)]"
                          transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
                          animate={{ 
                            scaleX: [1, 2.5, 1],
                            opacity: [0.8, 1, 0.8],
                            filter: ['blur(0px)', 'blur(1px)', 'blur(0px)']
                          }}
                        />
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent 
                    className="xl:hidden glass-premium border-[hsl(var(--gold-300)/0.2)] text-[10px] font-black uppercase tracking-widest px-3 py-1.5" 
                    sideOffset={12}
                  >
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </nav>
      </div>
    </TooltipProvider>
  );
}
