"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import {
  Bell,
  CheckCircle,
  Calendar,
  CalendarX,
  CreditCard,
  Users,
  UserMinus,
  Ban,
  Clock,
  Sparkles,
  Trash2,
  CheckCheck,
  Settings,
  Mail,
  X,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Shield,
  Smartphone,
  ChevronRight,
  Filter,
} from "lucide-react";

interface NotificationItem {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  metadata: any;
}

interface PreferencesData {
  bookingUpdates: boolean;
  matchUpdates: boolean;
  reminders: boolean;
  social: boolean;
  channels: {
    inApp: { available: boolean; status: string };
    email: { available: boolean; status: string; note: string };
    push: { available: boolean; status: string; note: string };
    sms: { available: boolean; status: string; note: string };
  };
}

export default function NotificationsPage() {
  const { user, openLoginModal } = useApp();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "invitations">("all");
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  // Invitations state
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState<boolean>(false);
  const [respondingInviteId, setRespondingInviteId] = useState<number | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<{ id: number; message: string; isError: boolean } | null>(null);

  // Preferences modal state
  const [prefsOpen, setPrefsOpen] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<PreferencesData | null>(null);
  const [savingPrefs, setSavingPrefs] = useState<boolean>(false);
  const [prefsSavedMessage, setPrefsSavedMessage] = useState<string | null>(null);
  const [browserPermission, setBrowserPermission] = useState<string>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  // Keyboard accessibility: Escape key to close preferences modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && prefsOpen) {
        setPrefsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prefsOpen]);

  const handleRequestPushPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setBrowserPermission("unsupported");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
    } catch {
      setBrowserPermission("denied");
    }
  };

  // Fetch notifications
  const fetchNotifications = useCallback(
    async (pageToFetch: number = 1, append: boolean = false) => {
      if (!user) return;
      try {
        if (!append) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        const unreadParam = activeTab === "unread" ? "&unreadOnly=true" : "";
        const res = await fetch(
          `/api/notifications?page=${pageToFetch}&limit=12${unreadParam}`,
          {
            headers: { "x-user-id": user.id.toString() },
          }
        );

        if (!res.ok) {
          throw new Error(`Failed to load notifications (HTTP ${res.status})`);
        }

        const data = await res.json();
        if (data.success) {
          if (append) {
            setNotifications((prev) => [...prev, ...data.notifications]);
          } else {
            setNotifications(data.notifications);
          }
          setUnreadCount(data.unreadCount);
          setHasMore(data.pagination.page < data.pagination.totalPages);
          setPage(data.pagination.page);
        } else {
          throw new Error(data.message || "Failed to load notifications.");
        }
      } catch (err: any) {
        setError(err.message || "Unable to reach notification service.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, activeTab]
  );

  // Fetch received invitations
  const fetchInvitations = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingInvitations(true);
      const res = await fetch("/api/invitations?type=received", {
        headers: { "x-user-id": user.id.toString() },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setInvitations(data.invitations);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch match invitations:", err);
    } finally {
      setLoadingInvitations(false);
    }
  }, [user]);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/notifications/preferences", {
        headers: { "x-user-id": user.id.toString() },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPreferences(data.preferences);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch preferences:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications(1, false);
      if (activeTab === "invitations") {
        fetchInvitations();
      }
    } else {
      setLoading(false);
    }
  }, [user, activeTab, fetchNotifications, fetchInvitations]);

  // Mark single notification as read
  const handleMarkAsRead = async (id: number) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "x-user-id": user.id.toString() },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    if (!user || unreadCount === 0) return;
    try {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { "x-user-id": user.id.toString() },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // Delete notification
  const handleDelete = async (id: number) => {
    if (!user) return;
    try {
      const target = notifications.find((n) => n.id === id);
      const res = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        headers: { "x-user-id": user.id.toString() },
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (target && !target.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  // Respond to invitation
  const handleRespondInvitation = async (invitationId: number, action: "ACCEPT" | "DECLINE") => {
    if (!user) return;
    try {
      setRespondingInviteId(invitationId);
      setInviteFeedback(null);

      const res = await fetch(`/api/invitations/${invitationId}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id.toString(),
        },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setInviteFeedback({
          id: invitationId,
          message: data.message,
          isError: false,
        });
        // Update local invitations list
        setInvitations((prev) =>
          prev.map((inv) =>
            inv.id === invitationId
              ? { ...inv, status: action === "ACCEPT" ? "ACCEPTED" : "DECLINED" }
              : inv
          )
        );
        // Refresh notifications count
        fetchNotifications(1, false);
      } else {
        setInviteFeedback({
          id: invitationId,
          message: data.message || "Failed to respond to invitation.",
          isError: true,
        });
      }
    } catch (err: any) {
      setInviteFeedback({
        id: invitationId,
        message: err.message || "Network error responding to invitation.",
        isError: true,
      });
    } finally {
      setRespondingInviteId(null);
    }
  };

  // Save preferences
  const handleSavePreferences = async (updatedPrefs: Partial<PreferencesData>) => {
    if (!user) return;
    try {
      setSavingPrefs(true);
      setPrefsSavedMessage(null);
      const res = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id.toString(),
        },
        body: JSON.stringify(updatedPrefs),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPreferences(data.preferences);
          setPrefsSavedMessage("Preferences saved successfully!");
          setTimeout(() => setPrefsSavedMessage(null), 3000);
        }
      }
    } catch (err) {
      console.error("Failed to save preferences:", err);
    } finally {
      setSavingPrefs(false);
    }
  };

  // Helper for notification icons and color themes
  const getNotificationVisuals = (type: string) => {
    switch (type) {
      case "BOOKING_CONFIRMED":
        return {
          icon: Calendar,
          bg: "bg-[#eaf7d5] text-[#365711] border-[#a8e63d]/60",
          tag: "Booking Confirmed",
        };
      case "BOOKING_CANCELLED":
        return {
          icon: CalendarX,
          bg: "bg-red-50 text-red-700 border-red-200",
          tag: "Booking Cancelled",
        };
      case "PAYMENT_CONFIRMED":
        return {
          icon: CreditCard,
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          tag: "Payment Confirmed",
        };
      case "MATCH_INVITATION":
        return {
          icon: Mail,
          bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
          tag: "Match Invite",
        };
      case "MATCH_JOINED":
        return {
          icon: Users,
          bg: "bg-teal-50 text-teal-700 border-teal-200",
          tag: "Player Joined",
        };
      case "MATCH_LEFT":
        return {
          icon: UserMinus,
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          tag: "Player Left",
        };
      case "MATCH_CANCELLED":
        return {
          icon: Ban,
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          tag: "Match Cancelled",
        };
      case "MATCH_REMINDER":
        return {
          icon: Clock,
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          tag: "Upcoming Reminder",
        };
      default:
        return {
          icon: Bell,
          bg: "bg-[#f2f5ef] text-[#2c3a32] border-[#e1e7df]",
          tag: "System Notice",
        };
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Not signed in state
  if (!user) {
    return (
      <main className="min-h-screen bg-[#f7f8f4] py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#e1e7df] bg-white p-8 sm:p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f0fae1] text-[#456e17]">
            <Bell className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#17201c]">Notification Center</h1>
          <p className="mt-2 text-sm text-[#7c867f] max-w-md mx-auto">
            Sign in to view real-time court booking confirmations, friendly match alerts, player invites, and game reminders.
          </p>
          <button
            onClick={openLoginModal}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#17201c] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#2c3a32] active:scale-95"
          >
            Sign in to View Notifications
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] py-8 sm:py-12 pb-36 sm:pb-24 px-4 sm:px-6 w-full max-w-full overflow-x-hidden">
      <div className="mx-auto max-w-4xl">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17201c] tracking-tight">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="flex h-6 items-center justify-center rounded-full bg-[#a8e63d] px-2.5 text-xs font-bold text-[#17201c] shadow-sm">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#7c867f] mt-1">
              Stay updated on your court reservations, match invitations, and player activity.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e1e7df] bg-white px-3.5 py-2 text-xs font-bold text-[#17201c] shadow-sm hover:border-[#a8e63d] transition active:scale-95"
              >
                <CheckCheck className="h-3.5 w-3.5 text-[#54801b]" />
                Mark all read
              </button>
            )}

            <button
              onClick={() => {
                fetchPreferences();
                setPrefsOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e1e7df] bg-white px-3.5 py-2 text-xs font-bold text-[#3a443e] shadow-sm hover:border-[#a8e63d] transition active:scale-95"
              title="Notification Preferences"
            >
              <Settings className="h-3.5 w-3.5 text-[#7c867f]" />
              Preferences
            </button>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#e1e7df] pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              activeTab === "all"
                ? "bg-[#17201c] text-[#a8e63d]"
                : "bg-white text-[#7c867f] border border-[#e1e7df] hover:text-[#17201c]"
            }`}
          >
            All Notifications
          </button>

          <button
            onClick={() => setActiveTab("unread")}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              activeTab === "unread"
                ? "bg-[#17201c] text-[#a8e63d]"
                : "bg-white text-[#7c867f] border border-[#e1e7df] hover:text-[#17201c]"
            }`}
          >
            Unread Only
            {unreadCount > 0 && (
              <span className={`flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] ${
                activeTab === "unread" ? "bg-[#a8e63d] text-[#17201c]" : "bg-[#f0fae1] text-[#456e17]"
              }`}>
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("invitations");
              fetchInvitations();
            }}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              activeTab === "invitations"
                ? "bg-[#17201c] text-[#a8e63d]"
                : "bg-white text-[#7c867f] border border-[#e1e7df] hover:text-[#17201c]"
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Match Invites
            {invitations.filter((i) => i.status === "PENDING").length > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-500 text-white px-1 text-[10px]">
                {invitations.filter((i) => i.status === "PENDING").length}
              </span>
            )}
          </button>
        </div>

        {/* Invitations View */}
        {activeTab === "invitations" ? (
          <div>
            {loadingInvitations ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-28 rounded-2xl bg-white border border-[#e1e7df] animate-pulse" />
                ))}
              </div>
            ) : invitations.length === 0 ? (
              <div className="rounded-3xl border border-[#e1e7df] bg-white p-12 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Mail className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-[#17201c]">No Match Invitations</h3>
                <p className="mt-1 text-xs text-[#7c867f] max-w-sm mx-auto">
                  When other players or match organizers invite you to open friendly games, they will appear here.
                </p>
                <Link
                  href="/friendly-matches"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#17201c] px-4 py-2 text-xs font-bold text-[#a8e63d]"
                >
                  Explore Open Matches
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {invitations.map((inv) => {
                  const isPending = inv.status === "PENDING";
                  const matchDate = inv.match ? new Date(inv.match.date).toISOString().split("T")[0] : "";
                  const feedback = inviteFeedback?.id === inv.id ? inviteFeedback : null;

                  return (
                    <div
                      key={inv.id}
                      className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-sm transition hover:border-[#a8e63d]/70"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                            <Mail className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Match Invitation
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                inv.status === "PENDING"
                                  ? "bg-amber-100 text-amber-800"
                                  : inv.status === "ACCEPTED"
                                  ? "bg-[#eaf7d5] text-[#365711]"
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {inv.status}
                              </span>
                              <span className="text-[11px] text-[#7c867f]">
                                {formatTimestamp(inv.createdAt)}
                              </span>
                            </div>

                            <h3 className="text-sm sm:text-base font-bold text-[#17201c] mt-1.5">
                              {inv.sender.name} invited you to &ldquo;{inv.match.title}&rdquo;
                            </h3>

                            <div className="mt-1 flex items-center gap-3 text-xs text-[#525f57] flex-wrap">
                              <span>📍 {inv.match.venue.name}</span>
                              <span>📅 {matchDate} ({inv.match.startTime})</span>
                            </div>

                            {inv.notes && (
                              <p className="mt-2 text-xs italic bg-[#f7f8f4] p-2.5 rounded-xl border border-[#e1e7df] text-[#3a443e]">
                                &ldquo;{inv.notes}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Invitation Action Buttons */}
                        {isPending ? (
                          <div className="flex items-center gap-2 shrink-0 sm:self-center">
                            <button
                              disabled={respondingInviteId === inv.id}
                              onClick={() => handleRespondInvitation(inv.id, "ACCEPT")}
                              className="rounded-full bg-[#17201c] px-4 py-2 text-xs font-bold text-[#a8e63d] shadow-sm hover:bg-[#2c3a32] active:scale-95 transition disabled:opacity-50"
                            >
                              {respondingInviteId === inv.id ? "Joining..." : "Accept & Join"}
                            </button>
                            <button
                              disabled={respondingInviteId === inv.id}
                              onClick={() => handleRespondInvitation(inv.id, "DECLINE")}
                              className="rounded-full border border-[#e1e7df] bg-white px-3.5 py-2 text-xs font-semibold text-[#7c867f] hover:text-[#17201c] hover:border-[#17201c] active:scale-95 transition disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </div>
                        ) : (
                          <div className="shrink-0 sm:self-center">
                            <Link
                              href={`/friendly-matches/${inv.matchId}`}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#e1e7df] bg-white px-3.5 py-1.5 text-xs font-bold text-[#17201c] hover:border-[#a8e63d]"
                            >
                              View Match <ChevronRight className="h-3 w-3" />
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* Immediate Feedback alert */}
                      {feedback && (
                        <div className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
                          feedback.isError ? "bg-red-50 text-red-700 border border-red-200" : "bg-[#eaf7d5] text-[#365711] border border-[#a8e63d]/60"
                        }`}>
                          {feedback.isError ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle className="h-4 w-4 shrink-0" />}
                          <span>{feedback.message}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Notifications Feed View */
          <div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 rounded-2xl bg-white border border-[#e1e7df] animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
                <p className="text-sm font-semibold text-red-800">{error}</p>
                <button
                  onClick={() => fetchNotifications(1, false)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-700 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-800"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-3xl border border-[#e1e7df] bg-white p-12 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0fae1] text-[#456e17]">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-[#17201c]">All Caught Up!</h3>
                <p className="mt-1 text-xs text-[#7c867f] max-w-sm mx-auto">
                  {activeTab === "unread"
                    ? "You don't have any unread notifications."
                    : "You don't have any notifications yet. Book a court or join a friendly match to get started!"}
                </p>
                {activeTab === "unread" ? (
                  <button
                    onClick={() => setActiveTab("all")}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#e1e7df] bg-white px-4 py-2 text-xs font-bold text-[#17201c] hover:border-[#a8e63d]"
                  >
                    View All Notifications
                  </button>
                ) : (
                  <Link
                    href="/"
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#17201c] px-4 py-2 text-xs font-bold text-[#a8e63d]"
                  >
                    Browse Badminton Courts
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => {
                  const visuals = getNotificationVisuals(n.type);
                  const Icon = visuals.icon;

                  return (
                    <div
                      key={n.id}
                      className={`group relative rounded-2xl border p-4 transition duration-150 ${
                        n.isRead
                          ? "bg-white border-[#e1e7df] hover:border-[#cfd8cd]"
                          : "bg-[#fdfffa] border-[#a8e63d]/60 shadow-[0_2px_12px_rgba(168,230,61,0.08)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Visual Icon */}
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${visuals.bg}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>

                          {/* Content */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${visuals.bg}`}>
                                {visuals.tag}
                              </span>
                              {!n.isRead && (
                                <span className="inline-block h-2 w-2 rounded-full bg-[#78a72b]" title="Unread" />
                              )}
                              <span className="text-[11px] text-[#869289]">
                                {formatTimestamp(n.createdAt)}
                              </span>
                            </div>

                            <h4 className="text-sm font-bold text-[#17201c] leading-snug">
                              {n.title}
                            </h4>

                            <p className="text-xs text-[#525f57] leading-relaxed">
                              {n.message}
                            </p>

                            {/* Action Link if provided */}
                            {n.link && (
                              <div className="pt-1">
                                <Link
                                  href={n.link}
                                  onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-[#456e18] hover:underline"
                                >
                                  <span>View details</span>
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Top-right Actions: Mark as Read & Delete */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition shrink-0">
                          {!n.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(n.id)}
                              className="rounded-lg p-1.5 text-[#7c867f] hover:bg-[#f0fae1] hover:text-[#365711] transition"
                              title="Mark as read"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(n.id)}
                            className="rounded-lg p-1.5 text-[#7c867f] hover:bg-red-50 hover:text-red-600 transition"
                            title="Delete notification"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Load More Button */}
                {hasMore && (
                  <div className="pt-4 text-center">
                    <button
                      onClick={() => fetchNotifications(page + 1, true)}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-2 rounded-full border border-[#e1e7df] bg-white px-5 py-2 text-xs font-bold text-[#17201c] shadow-sm hover:border-[#a8e63d] transition active:scale-95 disabled:opacity-50"
                    >
                      {loadingMore ? "Loading..." : "Load Older Notifications"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preferences Modal */}
      {prefsOpen && preferences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-[#e1e7df] bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#e1e7df]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0fae1] text-[#456e17]">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#17201c]">Notification Preferences</h3>
                  <p className="text-xs text-[#7c867f]">Control what alerts you receive in-app</p>
                </div>
              </div>
              <button
                onClick={() => setPrefsOpen(false)}
                className="rounded-full p-1.5 text-[#7c867f] hover:bg-[#f7f8f4] hover:text-[#17201c]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {prefsSavedMessage && (
              <div className="mt-4 p-3 rounded-xl bg-[#eaf7d5] text-[#365711] border border-[#a8e63d]/60 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{prefsSavedMessage}</span>
              </div>
            )}

            {/* Notification Category Toggles */}
            <div className="py-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#17201c]">Booking Updates</p>
                  <p className="text-[11px] text-[#7c867f]">Confirmations, cancellations, and payment status</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.bookingUpdates}
                  onChange={(e) =>
                    handleSavePreferences({ bookingUpdates: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-[#456e18] accent-[#456e18] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#17201c]">Open Match Alerts</p>
                  <p className="text-[11px] text-[#7c867f]">When players join, leave, or matches are cancelled</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.matchUpdates}
                  onChange={(e) =>
                    handleSavePreferences({ matchUpdates: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-[#456e18] accent-[#456e18] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#17201c]">Automated Reminders</p>
                  <p className="text-[11px] text-[#7c867f]">24-hour and 2-hour alerts before bookings and games</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.reminders}
                  onChange={(e) =>
                    handleSavePreferences({ reminders: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-[#456e18] accent-[#456e18] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#17201c]">Social & Invitations</p>
                  <p className="text-[11px] text-[#7c867f]">Match invitations and player connection requests</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.social}
                  onChange={(e) =>
                    handleSavePreferences({ social: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-[#456e18] accent-[#456e18] cursor-pointer"
                />
              </div>
            </div>

            {/* Delivery Channels Status & Push Notification Integration */}
            <div className="border-t border-[#edf1eb] pt-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#7c867f] mb-3">
                Delivery Channels & Device Notifications
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="rounded-xl border border-[#a8e63d]/70 bg-[#f0fae1] p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#365711]">In-App Alerts</span>
                    <span className="text-[10px] bg-[#365711] text-white px-1.5 py-0.5 rounded-full font-bold">Active</span>
                  </div>
                  <p className="text-[10px] text-[#54801b] mt-1">Real-time web bell & panel</p>
                </div>

                <div className="rounded-xl border border-[#e1e7df] bg-[#fafafa] p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-700">Web Push</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      browserPermission === "granted"
                        ? "bg-[#eaf7d5] text-[#365711]"
                        : "bg-gray-200 text-gray-700"
                    }`}>
                      {browserPermission === "granted" ? "Granted" : browserPermission === "denied" ? "Denied" : "Available"}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Browser native notifications</p>
                </div>
              </div>

              {/* User-Triggered Push Permission Box */}
              <div className="rounded-2xl border border-[#dce3da] bg-[#f9faf7] p-3 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-[#54801b]" />
                  <span className="font-bold text-[#17201c]">Device Push Notification Access</span>
                </div>
                <p className="text-[11px] text-[#6d7971] leading-relaxed">
                  Allow your mobile browser to display booking confirmations, match slot alerts, and sparring invites on your lock screen.
                </p>

                <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleRequestPushPermission}
                    disabled={browserPermission === "granted"}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                      browserPermission === "granted"
                        ? "bg-[#eaf7d5] text-[#365711] border border-[#a8e63d]/60 cursor-default"
                        : "bg-[#17201c] text-[#a8e63d] hover:bg-[#2c3a32]"
                    }`}
                  >
                    {browserPermission === "granted"
                      ? "✓ Browser Permission Granted"
                      : browserPermission === "denied"
                      ? "Permission Blocked in Settings"
                      : "Enable Device Notifications"}
                  </button>

                  <span className="text-[10px] text-[#839086]">
                    HTTPS · No credentials required
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setPrefsOpen(false)}
                className="rounded-full bg-[#17201c] px-5 py-2 text-xs font-bold text-white hover:bg-[#2c3a32]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
