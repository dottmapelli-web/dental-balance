
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, ArrowRightLeft, CalendarDays, BarChart3, Goal, Settings } from 'lucide-react';

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  external?: boolean;
};

export type SiteConfig = {
  name: string;
  description: string;
  navItems: NavItem[];
  subHeaderNavItems?: NavItem[]; // Optional, for items like settings at the bottom of sidebar
};

export const siteConfig: SiteConfig = {
  name: "Dental Balance",
  description: "Gestione bilanci e budget per Studio De Vecchi & Mapelli.",
  navItems: [
    {
      title: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Transazioni",
      href: "/transactions",
      icon: ArrowRightLeft,
    },
    {
      title: "Riepilogo Mensile",
      href: "/monthly-summary",
      icon: CalendarDays,
    },
    {
      title: "Riepilogo Annuale",
      href: "/annual-summary",
      icon: BarChart3,
    },
    {
      title: "Budget e Obiettivi",
      href: "/budget-objectives",
      icon: Goal,
    },
  ],
  // Example for items at the bottom of the sidebar
  // subHeaderNavItems: [ 
  //   {
  //     title: "Impostazioni",
  //     href: "/settings",
  //     icon: Settings,
  //   }
  // ]
};

    