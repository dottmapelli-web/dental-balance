
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/config/site";
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

interface MainSidebarNavProps {
  items: NavItem[];
}

export default function MainSidebarNav({ items }: MainSidebarNavProps) {
  const pathname = usePathname();

  if (!items?.length) {
    return null;
  }

  return (
    <SidebarMenu>
      {items.map((item, index) => {
        const Icon = item.icon;
        const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
        
        return (
          <SidebarMenuItem key={index}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              aria-disabled={item.disabled}
              className={cn(
                "w-full justify-start",
                isActive && "font-semibold",
                item.disabled && "cursor-not-allowed opacity-80"
              )}
              tooltip={item.title}
            >
              <Link
                href={item.disabled ? "#" : item.href}
                onClick={item.disabled ? (e: React.MouseEvent) => e.preventDefault() : undefined}
              >
                {Icon && <Icon className="mr-2 h-5 w-5 flex-shrink-0" />}
                <span className="truncate">{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

    