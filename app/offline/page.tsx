"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WifiOff, RefreshCw, Calendar, ArrowLeft, ShieldAlert } from "lucide-react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    if (navigator.onLine) {
      window.location.href = "/";
    } else {
      setTimeout(() => {
        setIsRetrying(false);
      }, 800);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-[#17201c] flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-md rounded-[32px] border border-[#e1e7df] bg-white p-6 sm:p-8 shadow-xl text-center">
        {/* Animated Badge */}
        <div className="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-[#f0fae1] text-[#487216] border border-[#a8e63d]/50 shadow-inner">
          <WifiOff className="h-8 w-8 sm:h-10 sm:w-10 text-[#487216]" />
        </div>

        <span className="mt-4 inline-block rounded-full bg-[#fbeae8] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#b33322] border border-[#f5c6cb]">
          Network Disconnected
        </span>

        <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-[#17201c]">
          You Are Offline<span className="text-[#a8e63d]">.</span>
        </h1>

        <p className="mt-2 text-xs sm:text-sm text-[#667269] leading-relaxed">
          BookMeBadminton requires an active internet connection for live court availability, bookings, and payment processing.
        </p>

        {/* Informational Card */}
        <div className="my-5 rounded-2xl bg-[#f9faf7] border border-[#e2e8de] p-3.5 text-left text-xs text-[#525f56] space-y-2">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#17201c] block">Live Booking Integrity</strong>
              <p className="text-[11px] text-[#6d7971] mt-0.5">
                To prevent slot collisions and duplicate fees, reservation and payment submissions are never queued silently offline.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#a8e63d] py-3.5 text-xs sm:text-sm font-black text-[#17201c] shadow-[0_6px_20px_rgba(168,230,61,0.4)] hover:bg-[#b8ef59] active:scale-95 transition disabled:opacity-75"
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
            <span>{isRetrying ? "Checking Connection..." : isOnline ? "Connection Restored · Reload" : "Retry Connection"}</span>
          </button>

          <Link
            href="/bookings"
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-[#d6dfd2] bg-white py-3 text-xs sm:text-sm font-bold text-[#17201c] hover:bg-[#f7f8f4] active:scale-95 transition"
          >
            <Calendar className="h-4 w-4 text-[#78a72b]" />
            <span>View Saved Bookings</span>
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-[#edf1ea] flex items-center justify-center gap-1.5 text-[11px] text-[#869288]">
          <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500 animate-ping" : "bg-red-400"}`} />
          <span>Status: {isOnline ? "Back Online" : "Waiting for network..."}</span>
        </div>
      </div>
    </main>
  );
}
