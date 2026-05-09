"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

export default function TopNavbar() {
  const pathname = usePathname();
  const items = siteConfig.navItems;

  if (!items?.length) {
    return null;
  }

  return (
    <nav className="top-navbar-container">
      <div className="top-navbar-pills">
        {items.map((item, index) => {
          const isActive =
            item.href === "/"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={index}
              href={item.disabled ? "#" : item.href}
              onClick={
                item.disabled
                  ? (e: React.MouseEvent) => e.preventDefault()
                  : undefined
              }
              className={cn(
                "top-navbar-pill",
                isActive && "top-navbar-pill-active",
                item.disabled && "opacity-40 pointer-events-none"
              )}
            >
              {item.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
