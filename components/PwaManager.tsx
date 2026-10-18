"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Download,
  X,
  WifiOff,
  CheckCircle2,
  Share,
  PlusSquare,
  Smartphone,
  Laptop,
  Check,
  ChevronRight,
} from "lucide-react";

import { useNetworkStatus } from "@/hooks";

export function PwaManager() {
  const { isOffline, justReconnected } = useNetworkStatus();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Standalone detection
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // 2. iOS detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 4. Service Worker Registration
    if ("serviceWorker" in navigator && process.env.NODE_ENV !== "test") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // If a new service worker is waiting, update cleanly
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("[PWA] New version available.");
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn("[PWA] Service worker registration error:", err);
        });
    }

    // 5. beforeinstallprompt for Android Chrome / Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Check if user previously dismissed banner in last 7 days
      const dismissed = localStorage.getItem("bm_pwa_banner_dismissed");
      if (!dismissed && !isStandaloneMode) {
        // Show after a brief delay so user is not interrupted instantly on load
        setTimeout(() => {
          setShowBanner(true);
        }, 3000);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Custom event to trigger install modal from anywhere in the app
    const handleOpenInstall = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === "accepted") {
            setShowBanner(false);
            setDeferredPrompt(null);
          }
        });
      } else {
        setShowInstallModal(true);
      }
    };

    window.addEventListener("bookme:open_install_modal", handleOpenInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("bookme:open_install_modal", handleOpenInstall);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setShowBanner(false);
        setDeferredPrompt(null);
      }
    } else {
      // Manual instructions modal for iOS or browsers without native prompt
      setShowBanner(false);
      setShowInstallModal(true);
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    try {
      localStorage.setItem("bm_pwa_banner_dismissed", Date.now().toString());
    } catch {}
  };

  return (
    <>
      {/* 1. TOP OFFLINE / RECONNECTED BANNER */}
      <AnimatePresence>
        {isOffline && (
          <motion.aside
            aria-label="Offline status banner"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-[#17201c] text-white px-4 py-2 text-xs font-semibold shadow-md flex items-center justify-between gap-2 border-b border-[#a8e63d]/40"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-red-400 shrink-0">
                <WifiOff className="h-3 w-3" />
              </span>
              <span>
                You are currently offline. Viewing cached mode — reconnect to check availability or book courts.
              </span>
            </div>
            <a
              href="/offline"
              className="rounded-full bg-white/10 hover:bg-white/20 px-2.5 py-0.5 text-[10.5px] font-bold text-[#a8e63d] shrink-0"
            >
              Details
            </a>
          </motion.aside>
        )}

        {justReconnected && !isOffline && (
          <motion.aside
            aria-label="Connection restored"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-[#eaf7d5] text-[#2e570c] px-4 py-2 text-xs font-bold shadow-md flex items-center justify-center gap-2 border-b border-[#a8e63d]"
          >
            <CheckCircle2 className="h-4 w-4 text-[#5b871c]" />
            <span>Connection Restored · Live Availability Resumed</span>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 2. DISCREET PWA INSTALL PROMPT BANNER (Non-intrusive) */}
      <AnimatePresence>
        {showBanner && !isStandalone && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-40"
          >
            <div className="rounded-[24px] border border-[#e1e7df] bg-[#17201c] text-white p-3.5 sm:p-4 shadow-[0_16px_40px_rgba(23,32,28,0.35)] backdrop-blur-xl ring-1 ring-white/15">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white p-1 overflow-hidden shrink-0">
                    <img src="/logo.png" alt="BookMeBadminton" className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white leading-tight">Install BookMeBadminton</h4>
                    <p className="text-[10.5px] text-[#9aa79d]">Quick 1-tap court bookings & passes</p>
                  </div>
                </div>

                <button
                  onClick={handleDismissBanner}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[#9aa79d] hover:text-white"
                  aria-label="Dismiss banner"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#a8e63d] py-2 text-xs font-black text-[#17201c] hover:bg-[#b8ef59] active:scale-95 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Install App</span>
                </button>
                <button
                  onClick={handleDismissBanner}
                  className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-[#a6b3a9] hover:text-white hover:bg-white/5 transition"
                >
                  Later
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. PLATFORM-APPROPRIATE INSTALL INSTRUCTIONS MODAL */}
      <AnimatePresence>
        {showInstallModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17201c]/70 backdrop-blur-md select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              className="relative w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl text-center"
            >
              <button
                onClick={() => setShowInstallModal(false)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f6f2] text-[#637067] hover:bg-[#e4eae1]"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0fae1] text-[#4f781a] border border-[#a8e63d]/40 mb-3 overflow-hidden p-2">
                <img src="/logo.png" alt="BookMeBadminton" className="h-full w-full object-contain" />
              </div>

              <h3 className="text-lg font-black text-[#17201c]">Install BookMeBadminton</h3>
              <p className="text-xs text-[#6e7b72] mt-1">
                Add to your home screen for full-screen court booking, offline pass viewing, and instant loading.
              </p>

              {/* Instructions by Platform */}
              <div className="my-4 rounded-2xl bg-[#f7f9f5] border border-[#e2e8df] p-4 text-left space-y-3 text-xs">
                {isIOS ? (
                  <>
                    <p className="font-extrabold text-[#17201c] flex items-center gap-1.5">
                      <Smartphone className="h-4 w-4 text-[#5b871c]" />
                      iOS Safari Instructions:
                    </p>
                    <ol className="space-y-2 text-[#515e55] list-decimal list-inside pl-1 text-[11.5px]">
                      <li>
                        Tap the <strong>Share</strong> button <Share className="inline h-3.5 w-3.5 text-[#5b871c] mx-0.5" /> in Safari’s bottom toolbar.
                      </li>
                      <li>
                        Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="inline h-3.5 w-3.5 text-[#5b871c] mx-0.5" />.
                      </li>
                      <li>
                        Tap <strong>Add</strong> in the top right corner.
                      </li>
                    </ol>
                  </>
                ) : (
                  <>
                    <p className="font-extrabold text-[#17201c] flex items-center gap-1.5">
                      <Smartphone className="h-4 w-4 text-[#5b871c]" />
                      Android Chrome / Desktop Instructions:
                    </p>
                    <ol className="space-y-2 text-[#515e55] list-decimal list-inside pl-1 text-[11.5px]">
                      <li>
                        Tap browser menu <strong>(3 dots ⋮)</strong> in the top right.
                      </li>
                      <li>
                        Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                      </li>
                      <li>
                        Confirm <strong>Install</strong> to add the badminton icon to your apps.
                      </li>
                    </ol>
                  </>
                )}
              </div>

              <button
                onClick={() => setShowInstallModal(false)}
                className="w-full rounded-2xl bg-[#17201c] py-3 text-xs font-bold text-white hover:bg-[#283730] transition active:scale-95"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
