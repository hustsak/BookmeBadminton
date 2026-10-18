"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  Heart,
  Calendar,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Users,
  Menu,
  X,
  Sparkles,
  Building2,
  Plus,
  ShieldCheck,
  Bell,
  CheckCheck,
  ExternalLink,
  ChevronRight,
  Trophy,
  ShieldAlert,
} from "lucide-react";

import { MobileBottomNav } from "@/components/MobileBottomNav";

export function Navbar() {
  const pathname = usePathname();
  const { user, openLoginModal, logout, favorites, bookings, friendlyMatches } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const activeBookingsCount = bookings.filter((b) => b.status === "CONFIRMED").length;
  const openMatchesCount = friendlyMatches.filter((m) => m.status === "OPEN").length;

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await fetch("/api/notifications/unread-count", {
        headers: { "x-user-id": user.id.toString() },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUnreadCount(data.count);
        }
      }
    } catch {
      // quiet fail
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();

    const handleFocus = () => {
      fetchUnreadCount();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("bookme:notification_refresh", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("bookme:notification_refresh", handleFocus);
    };
  }, [fetchUnreadCount]);

  const toggleNotifications = async () => {
    const nextState = !notificationsOpen;
    setNotificationsOpen(nextState);
    if (nextState && user) {
      try {
        setLoadingNotifications(true);
        const res = await fetch("/api/notifications?limit=5", {
          headers: { "x-user-id": user.id.toString() },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setRecentNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
          }
        }
      } catch {
        // quiet
      } finally {
        setLoadingNotifications(false);
      }
    }
  };

  const handleMarkAllReadFlyout = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { "x-user-id": user.id.toString() },
      });
      if (res.ok) {
        setUnreadCount(0);
        setRecentNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch {
      // quiet
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-[#e1e7df] bg-[#f7f8f4]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[64px] sm:h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 text-lg sm:text-xl font-bold group select-none">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-[#e1e7df] overflow-hidden transition-transform group-hover:scale-105">
              <img
                src="/logo.png"
                alt="BookMeBadminton Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="tracking-tight text-[#17201c]">BookMe<span className="text-[#5b871c]">Badminton</span></span>
            <span className="text-[#a8e63d] -ml-1 text-xl leading-none">.</span>
          </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden items-center gap-5 lg:gap-6 md:flex">
          <Link
            href="/"
            className={`text-sm font-semibold transition ${
              pathname === "/"
                ? "text-[#17201c] underline underline-offset-8 decoration-[#a8e63d] decoration-2"
                : "text-[#7c867f] hover:text-[#17201c]"
            }`}
          >
            Explore
          </Link>

          <Link
            href="/friendly-matches"
            className={`relative text-sm font-semibold transition flex items-center gap-1.5 ${
              pathname === "/friendly-matches"
                ? "text-[#17201c] underline underline-offset-8 decoration-[#a8e63d] decoration-2"
                : "text-[#7c867f] hover:text-[#17201c]"
            }`}
          >
            <Users className="h-4 w-4 text-[#78a72b]" />
            Friendly Match
            {openMatchesCount > 0 && (
              <span className="flex h-5 items-center justify-center rounded-full bg-[#f0fae1] border border-[#a8e63d]/70 px-1.5 text-[10px] font-bold text-[#456e17]">
                {openMatchesCount} open
              </span>
            )}
          </Link>

          <Link
            href="/players"
            className={`relative text-sm font-semibold transition flex items-center gap-1.5 ${
              pathname === "/players" || pathname.startsWith("/players/")
                ? "text-[#17201c] underline underline-offset-8 decoration-[#a8e63d] decoration-2"
                : "text-[#7c867f] hover:text-[#17201c]"
            }`}
          >
            <Sparkles className="h-4 w-4 text-[#78a72b]" />
            Find Players
          </Link>

          <Link
            href="/leaderboards"
            className={`relative text-sm font-semibold transition flex items-center gap-1.5 ${
              pathname === "/leaderboards"
                ? "text-[#17201c] underline underline-offset-8 decoration-[#a8e63d] decoration-2"
                : "text-[#7c867f] hover:text-[#17201c]"
            }`}
          >
            <Trophy className="h-4 w-4 text-[#78a72b]" />
            Leaderboards
          </Link>

          <Link
            href="/bookings"
            className={`relative text-sm font-semibold transition flex items-center gap-1.5 ${
              pathname === "/bookings"
                ? "text-[#17201c] underline underline-offset-8 decoration-[#a8e63d] decoration-2"
                : "text-[#7c867f] hover:text-[#17201c]"
            }`}
          >
            <Calendar className="h-4 w-4" />
            My Bookings
            {activeBookingsCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#a8e63d] px-1 text-[10px] font-bold text-[#17201c]">
                {activeBookingsCount}
              </span>
            )}
          </Link>

          <Link
            href="/favorites"
            className={`relative text-sm font-semibold transition flex items-center gap-1.5 ${
              pathname === "/favorites"
                ? "text-[#17201c] underline underline-offset-8 decoration-[#a8e63d] decoration-2"
                : "text-[#7c867f] hover:text-[#17201c]"
            }`}
          >
            <Heart className="h-4 w-4" />
            Favorites
            {favorites.length > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#17201c] px-1 text-[10px] font-bold text-white">
                {favorites.length}
              </span>
            )}
          </Link>

          <Link
            href="/add-club"
            className={`relative text-xs font-bold transition flex items-center gap-1.5 rounded-full px-3.5 py-1.5 border ${
              pathname === "/add-club"
                ? "bg-[#17201c] text-[#a8e63d] border-[#17201c]"
                : "bg-[#f0fae1] text-[#365711] border-[#a8e63d]/80 hover:bg-[#a8e63d] hover:text-[#17201c]"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            Add Club
          </Link>

          <Link
            href="/owner"
            className={`relative text-xs font-bold transition flex items-center gap-1.5 rounded-full px-3.5 py-1.5 border ${
              pathname === "/owner"
                ? "bg-[#17201c] text-[#a8e63d] border-[#17201c]"
                : "bg-white text-[#17201c] border-[#e1e7df] hover:border-[#a8e63d]"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-[#54801b]" />
            Owner Portal
          </Link>

          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className={`relative text-xs font-bold transition flex items-center gap-1.5 rounded-full px-3.5 py-1.5 border ${
                pathname.startsWith("/admin")
                  ? "bg-[#17201c] text-[#a8e63d] border-[#17201c]"
                  : "bg-[#17201c] text-white border-[#17201c] hover:bg-[#283730]"
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-[#a8e63d]" />
              Admin
            </Link>
          )}
        </div>

        {/* User Account & Actions */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              {/* Notification Bell & Flyout */}
              <div className="relative">
                <button
                  onClick={toggleNotifications}
                  className={`relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border transition active:scale-95 ${
                    notificationsOpen
                      ? "border-[#a8e63d] bg-[#f0fae1] text-[#365711]"
                      : "border-[#e1e7df] bg-white text-[#525f57] hover:border-[#a8e63d] hover:text-[#17201c]"
                  }`}
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] sm:h-5 sm:min-w-[20px] items-center justify-center rounded-full bg-[#a8e63d] px-1 text-[9px] sm:text-[10px] font-extrabold text-[#17201c] ring-2 ring-white animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Compact Recent Notifications Panel */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-[#e1e7df] bg-white p-3 sm:p-4 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-[#edf1eb]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-[#17201c]">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="flex h-4 items-center justify-center rounded-full bg-[#a8e63d] px-1.5 text-[10px] font-bold text-[#17201c]">
                            {unreadCount} unread
                          </span>
                        )}
                      </div>

                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllReadFlyout}
                          className="flex items-center gap-1 text-[11px] font-bold text-[#54801b] hover:underline"
                        >
                          <CheckCheck className="h-3 w-3" />
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* Notification list in flyout */}
                    <div className="py-2 space-y-2 max-h-72 overflow-y-auto">
                      {loadingNotifications ? (
                        <div className="py-6 text-center text-xs text-[#7c867f]">
                          Loading notifications...
                        </div>
                      ) : recentNotifications.length === 0 ? (
                        <div className="py-6 text-center">
                          <p className="text-xs font-semibold text-[#17201c]">No notifications yet</p>
                          <p className="text-[11px] text-[#7c867f] mt-0.5">You are completely up to date!</p>
                        </div>
                      ) : (
                        recentNotifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-2.5 rounded-xl border text-xs transition ${
                              notif.isRead
                                ? "bg-white border-[#edf1eb]"
                                : "bg-[#f8fbf5] border-[#a8e63d]/60"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <p className="font-bold text-[#17201c] line-clamp-1">{notif.title}</p>
                              {!notif.isRead && (
                                <span className="h-2 w-2 rounded-full bg-[#78a72b] shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-[11px] text-[#525f57] mt-0.5 line-clamp-2">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* View all link */}
                    <div className="pt-2 border-t border-[#edf1eb]">
                      <Link
                        href="/notifications"
                        onClick={() => setNotificationsOpen(false)}
                        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-[#f0fae1] hover:bg-[#e3f7c4] text-xs font-bold text-[#365711] transition"
                      >
                        <span>View Notification Center</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-full border border-[#e1e7df] bg-white px-2.5 sm:px-3 py-1.5 shadow-sm transition hover:border-[#a8e63d] active:scale-95"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-7 w-7 rounded-full object-cover ring-2 ring-[#a8e63d]"
                  />
                  <span className="text-xs font-bold text-[#17201c] hidden sm:inline">
                    {user.name}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#869289] hidden sm:inline" />
                </button>

                {/* Dropdown menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#e1e7df] bg-white p-2 shadow-xl z-50">
                    <div className="border-b border-[#edf1eb] px-3 py-2">
                      <p className="text-xs font-bold text-[#17201c]">{user.name}</p>
                      <p className="text-[10px] text-[#869289] truncate">{user.email}</p>
                    </div>

                    <Link
                      href="/notifications"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-[#2d4d0f] bg-[#f0fae1] hover:bg-[#e3f7c4] my-1"
                    >
                      <div className="flex items-center gap-2">
                        <Bell className="h-3.5 w-3.5 text-[#78a72b]" />
                        <span>Notifications</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#a8e63d] px-1 text-[9px] font-bold text-[#17201c]">
                          {unreadCount}
                        </span>
                      )}
                    </Link>

                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#2d4d0f] bg-[#f0fae1] hover:bg-[#e3f7c4] my-1"
                    >
                      <UserIcon className="h-3.5 w-3.5 text-[#78a72b]" />
                      My Player Profile
                    </Link>

                    <Link
                      href="/players"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#3a443e] hover:bg-[#f5f7f3]"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#78a72b]" />
                      Discover Players
                    </Link>

                    <Link
                      href="/leaderboards"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#3a443e] hover:bg-[#f5f7f3]"
                    >
                      <Trophy className="h-3.5 w-3.5 text-[#78a72b]" />
                      Leaderboards
                    </Link>

                    <Link
                      href="/owner"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#17201c] bg-[#eaf7d5] hover:bg-[#def5b8] my-1"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-[#456e18]" />
                      Venue Owner Portal
                    </Link>

                    {user.role === "ADMIN" && (
                      <Link
                        href="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#17201c] bg-[#a8e63d]/25 hover:bg-[#a8e63d]/40 my-1"
                      >
                        <ShieldAlert className="h-3.5 w-3.5 text-[#3e6810]" />
                        Admin Dashboard
                      </Link>
                    )}

                    <Link
                      href="/add-club"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#3a443e] hover:bg-[#f5f7f3]"
                    >
                      <Building2 className="h-3.5 w-3.5 text-[#78a72b]" />
                      List Your Club / Court
                    </Link>

                    <Link
                      href="/friendly-matches"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#3a443e] hover:bg-[#f5f7f3]"
                    >
                      <Users className="h-3.5 w-3.5 text-[#78a72b]" />
                      Friendly Matches ({friendlyMatches.length})
                    </Link>

                    <Link
                      href="/bookings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#3a443e] hover:bg-[#f5f7f3]"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      My Bookings ({bookings.length})
                    </Link>

                    <Link
                      href="/favorites"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#3a443e] hover:bg-[#f5f7f3]"
                    >
                      <Heart className="h-3.5 w-3.5" />
                      Favorites ({favorites.length})
                    </Link>

                    <button
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#e53935] hover:bg-[#fdf2f2]"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={openLoginModal}
              className="flex items-center gap-1.5 rounded-full bg-[#17201c] px-3.5 sm:px-5 py-1.5 sm:py-2 text-xs font-bold text-white transition hover:bg-[#2c3a32] active:scale-95 shadow-sm"
            >
              <UserIcon className="h-3.5 w-3.5 text-[#a8e63d]" />
              <span>Log in</span>
            </button>
          )}
        </div>
      </div>
    </nav>
    <MobileBottomNav />
  </>
  );
}
