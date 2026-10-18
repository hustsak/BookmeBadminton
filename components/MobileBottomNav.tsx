"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useApp } from "@/context/AppContext";
import {
  Compass,
  Users,
  Calendar,
  Bell,
  User as UserIcon,
  ShieldCheck,
  Building2,
} from "lucide-react";

import { useUnreadNotifications } from "@/hooks";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, openLoginModal, bookings, friendlyMatches } = useApp();
  const { unreadCount: unreadNotifications } = useUnreadNotifications(user?.id);

  const activeBookingsCount = bookings.filter((b) => b.status === "CONFIRMED").length;
  const openMatchesCount = friendlyMatches.filter((m) => m.status === "OPEN").length;

  // Hide on court details & reservation page where dedicated sticky booking action bar is active
  if (pathname.startsWith("/courts/")) {
    return null;
  }

  const isOwner = user?.role === "OWNER";

  const navItems = isOwner
    ? [
        {
          label: "Dashboard",
          href: "/owner",
          icon: ShieldCheck,
          badge: 0,
          isActive: pathname === "/owner" && !pathname.includes("tab="),
        },
        {
          label: "Courts",
          href: "/owner?tab=courts",
          icon: Building2,
          badge: 0,
          isActive: pathname === "/owner" && pathname.includes("tab=courts"),
        },
        {
          label: "Bookings",
          href: "/owner?tab=bookings",
          icon: Calendar,
          badge: 0,
          isActive: pathname === "/owner" && pathname.includes("tab=bookings"),
        },
        {
          label: "Club Profile",
          href: "/owner?tab=profile",
          icon: UserIcon,
          badge: 0,
          isActive: pathname === "/owner" && pathname.includes("tab=profile"),
        },
      ]
    : [
        {
          label: "Courts",
          href: "/",
          icon: Compass,
          badge: 0,
          isActive: pathname === "/",
        },
        {
          label: "Matches",
          href: "/friendly-matches",
          icon: Users,
          badge: openMatchesCount,
          isActive: pathname === "/friendly-matches" || pathname.startsWith("/players"),
        },
        {
          label: "Bookings",
          href: "/bookings",
          icon: Calendar,
          badge: activeBookingsCount,
          isActive: pathname === "/bookings",
        },
        {
          label: "Alerts",
          href: "/notifications",
          icon: Bell,
          badge: unreadNotifications,
          isActive: pathname === "/notifications",
        },
      ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden pointer-events-none pb-safe">
      <div className="mx-auto max-w-md px-3 pb-2 pt-1">
        <nav
          aria-label="Mobile Bottom Navigation"
          className="pointer-events-auto flex items-center justify-between rounded-[26px] border border-white/60 bg-[#17201c]/95 px-1.5 py-1.5 text-white shadow-[0_16px_36px_rgba(23,32,28,0.38)] backdrop-blur-2xl ring-1 ring-white/10"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive;

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="relative flex flex-1 flex-col items-center justify-center py-1 select-none focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#a8e63d] rounded-2xl min-h-[44px]"
              >
                <motion.div
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`relative flex items-center justify-center rounded-2xl px-2.5 py-1.5 transition-colors ${
                    active ? "text-[#17201c]" : "text-[#9ca89f] hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="mobileNavIndicator"
                      className="absolute inset-0 rounded-2xl bg-[#a8e63d] shadow-[0_4px_14px_rgba(168,230,61,0.45)]"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}

                  <span className="relative z-10 flex items-center gap-1">
                    <Icon className="h-4 w-4" />
                    {active && (
                      <span className="text-[11px] font-extrabold tracking-tight">
                        {item.label}
                      </span>
                    )}
                  </span>

                  {item.badge > 0 && (
                    <span
                      className={`absolute -right-1 -top-1 z-20 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-black ${
                        active
                          ? "bg-[#17201c] text-[#a8e63d] ring-1 ring-white/20"
                          : "bg-[#a8e63d] text-[#17201c]"
                      }`}
                    >
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </motion.div>
                {!active && (
                  <span className="mt-0.5 text-[9.5px] font-medium text-[#7d8c80]">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Profile / Account Item */}
          <div className="flex flex-1 flex-col items-center justify-center py-1 select-none min-h-[44px]">
            {user ? (
              <Link
                href="/profile"
                aria-current={pathname === "/profile" ? "page" : undefined}
                className="relative flex flex-col items-center justify-center rounded-2xl p-0.5 text-[#9ca89f] hover:text-white focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#a8e63d]"
                title={user.name}
              >
                <motion.div
                  whileTap={{ scale: 0.88 }}
                  className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded-full ring-2 ${
                    pathname === "/profile" ? "ring-[#a8e63d] scale-105" : "ring-white/40"
                  }`}
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-full w-full object-cover"
                  />
                </motion.div>
                <span
                  className={`mt-0.5 text-[9.5px] font-medium max-w-[50px] truncate ${
                    pathname === "/profile" ? "text-[#a8e63d] font-bold" : "text-[#7d8c80]"
                  }`}
                >
                  Profile
                </span>
              </Link>
            ) : (
              <button
                onClick={openLoginModal}
                className="relative flex flex-col items-center justify-center rounded-2xl py-0.5 text-[#9ca89f] hover:text-white focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#a8e63d]"
                title="Log In"
              >
                <motion.div
                  whileTap={{ scale: 0.88 }}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white"
                >
                  <UserIcon className="h-4 w-4 text-[#a8e63d]" />
                </motion.div>
                <span className="mt-0.5 text-[9.5px] font-medium text-[#7d8c80]">
                  Log In
                </span>
              </button>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}
