"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Mail, Lock, User as UserIcon, ArrowRight, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, login } = useApp();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  if (!isLoginModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, tab === "signup" ? name : undefined);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeLoginModal}
          className="absolute inset-0 bg-[#17201c]/60 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[#e1e7df] bg-white p-6 sm:p-8 shadow-2xl z-10"
        >
          {/* Close button */}
          <button
            onClick={closeLoginModal}
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f7f3] text-[#69746c] transition hover:bg-[#e6ebe3] hover:text-[#17201c]"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Modal Header */}
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe3d8] bg-[#f0fae1] px-3 py-1 text-xs font-bold text-[#4f781a]">
              <Sparkles className="h-3.5 w-3.5 text-[#78a72b]" />
              BookMeBadminton Account
            </div>
            <h2 className="mt-3 text-2xl font-extrabold text-[#17201c]">
              {tab === "login" ? "Welcome back!" : "Create your account"}
            </h2>
            <p className="mt-1 text-xs text-[#7c867f]">
              {tab === "login"
                ? "Sign in to manage your court reservations & favorites."
                : "Join thousands of badminton players booking courts instantly."}
            </p>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex rounded-xl bg-[#f4f6f2] p-1">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                tab === "login"
                  ? "bg-white text-[#17201c] shadow-sm"
                  : "text-[#7c867f] hover:text-[#17201c]"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                tab === "signup"
                  ? "bg-white text-[#17201c] shadow-sm"
                  : "text-[#7c867f] hover:text-[#17201c]"
              }`}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3.5">
            {tab === "signup" && (
              <div>
                <label className="text-[11px] font-bold text-[#5c6760]">Full Name</label>
                <div className="mt-1 flex items-center gap-2.5 rounded-xl border border-[#e2e7df] bg-[#f8faf7] px-3.5 py-2.5 text-sm focus-within:border-[#a8e63d] focus-within:bg-white">
                  <UserIcon className="h-4 w-4 text-[#8e9891]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-[#a1aba3]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-[#5c6760]">Email Address</label>
              <div className="mt-1 flex items-center gap-2.5 rounded-xl border border-[#e2e7df] bg-[#f8faf7] px-3.5 py-2.5 text-sm focus-within:border-[#a8e63d] focus-within:bg-white">
                <Mail className="h-4 w-4 text-[#8e9891]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-[#a1aba3]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#5c6760]">Password</label>
              <div className="mt-1 flex items-center gap-2.5 rounded-xl border border-[#e2e7df] bg-[#f8faf7] px-3.5 py-2.5 text-sm focus-within:border-[#a8e63d] focus-within:bg-white">
                <Lock className="h-4 w-4 text-[#8e9891]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-[#a1aba3]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#a8e63d] py-3 text-xs font-bold text-[#17201c] shadow-md transition hover:bg-[#b8ef59] active:scale-[0.99]"
            >
              {tab === "login" ? "Sign In to BookMeBadminton" : "Create Account"}
              <ArrowRight className="h-4 w-4" />
            </button>

            {/* Quick Demo Role Switcher */}
            <div className="mt-4 pt-3 border-t border-[#edf1eb]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b958e] block mb-2 text-center">
                Quick Demo Sign-In
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    login("alex.nguyen@example.com", "Alex Nguyen", "CUSTOMER");
                  }}
                  className="flex-1 rounded-xl border border-[#dbe3d8] bg-[#f8faf7] py-2 text-[11px] font-bold text-[#17201c] hover:bg-[#edf4e8] transition"
                >
                  🏸 Player (Alex)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    login("owner1@bookme.test", "Smash Management", "OWNER");
                  }}
                  className="flex-1 rounded-xl border border-[#dbe3d8] bg-[#f8faf7] py-2 text-[11px] font-bold text-[#17201c] hover:bg-[#edf4e8] transition"
                >
                  🏢 Venue Owner
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
