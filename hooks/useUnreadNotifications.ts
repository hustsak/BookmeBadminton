"use client";

import { useState, useCallback, useEffect } from "react";

/**
 * Reusable hook to track unread notification count with automatic window focus
 * and custom event ("bookme:notification_refresh") listeners.
 */
export function useUnreadNotifications(userId?: number | null) {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await fetch("/api/notifications/unread-count", {
        headers: { "x-user-id": userId.toString() },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUnreadCount(data.count);
        }
      }
    } catch {
      // quiet fail on network issues
    }
  }, [userId]);

  useEffect(() => {
    let active = true;

    if (userId) {
      fetch("/api/notifications/unread-count", {
        headers: { "x-user-id": userId.toString() },
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (active && data?.success) {
            setUnreadCount(data.count);
          }
        })
        .catch(() => {
          // quiet fail
        });
    }

    const handleRefresh = () => {
      refreshUnreadCount();
    };

    window.addEventListener("focus", handleRefresh);
    window.addEventListener("bookme:notification_refresh", handleRefresh);

    return () => {
      active = false;
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("bookme:notification_refresh", handleRefresh);
    };
  }, [userId, refreshUnreadCount]);

  return { unreadCount, setUnreadCount, refreshUnreadCount };
}
