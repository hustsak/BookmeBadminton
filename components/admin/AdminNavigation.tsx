"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  ShieldCheck,
  Settings,
  ScrollText,
} from "lucide-react";

export interface AdminNavProps {
  pendingReportsCount?: number;
}

export function AdminNavigation({ pendingReportsCount = 0 }: AdminNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Overview",
      href: "/admin",
      icon: LayoutDashboard,
      active: pathname === "/admin",
    },
    {
      label: "User Management",
      href: "/admin/users",
      icon: Users,
      active: pathname === "/admin/users",
    },
    {
      label: "Venues & Courts",
      href: "/admin/venues",
      icon: Building2,
      active: pathname === "/admin/venues",
    },
    {
      label: "Bookings",
      href: "/admin/bookings",
      icon: CalendarDays,
      active: pathname === "/admin/bookings",
    },
    {
      label: "Moderation",
      href: "/admin/moderation",
      icon: ShieldCheck,
      active: pathname === "/admin/moderation",
      badge: pendingReportsCount > 0 ? pendingReportsCount : undefined,
    },
    {
      label: "Platform Settings",
      href: "/admin/settings",
      icon: Settings,
      active: pathname === "/admin/settings",
    },
    {
      label: "Audit Logs",
      href: "/admin/audit-logs",
      icon: ScrollText,
      active: pathname === "/admin/audit-logs",
    },
  ];

  return (
    <nav className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition select-none ${
              item.active
                ? "bg-[#17201c] text-[#a8e63d] shadow-sm"
                : "border border-[#e1e7df] bg-white text-[#525f57] hover:border-[#a8e63d] hover:text-[#17201c]"
            }`}
          >
            <Icon className={`h-4 w-4 ${item.active ? "text-[#a8e63d]" : "text-[#7c867f]"}`} />
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={`ml-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-extrabold ${
                  item.active
                    ? "bg-[#a8e63d] text-[#17201c]"
                    : "bg-[#e12a43] text-white"
                }`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
