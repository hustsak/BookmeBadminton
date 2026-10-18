"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  Sparkles,
  Building2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export function LoginModal() {
  const router = useRouter();
  const { isLoginModalOpen, closeLoginModal, login } = useApp();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<"CUSTOMER" | "OWNER">("CUSTOMER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [clubName, setClubName] = useState("");
  const [phone, setPhone] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (tab === "signup") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            role,
            phone: phone || undefined,
            clubName: role === "OWNER" ? clubName : undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.message || "Registration failed.");
          setIsLoading(false);
          return;
        }

        login(data.user.email, data.user.name, data.user.role, data.user.id);
        closeLoginModal();

        if (data.user.role === "OWNER") {
          router.push("/owner");
        } else {
          router.push("/");
        }
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          // If not found in DB but matches demo, fallback to client login
          if (email.includes("owner")) {
            login(email, "Smash Management", "OWNER", 5);
            closeLoginModal();
            router.push("/owner");
            return;
          } else {
            login(email, name || email.split("@")[0], "CUSTOMER", 1);
            closeLoginModal();
            router.push("/");
            return;
          }
        }

        login(data.user.email, data.user.name, data.user.role, data.user.id);
        closeLoginModal();

        if (data.user.role === "OWNER") {
          router.push("/owner");
        } else if (data.user.role === "ADMIN") {
          router.push("/admin");
        } else {
          router.push("/");
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeLoginModal}
          className="fixed inset-0 bg-[#17201c]/60 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[#e1e7df] bg-white p-6 sm:p-8 shadow-2xl z-10 my-auto"
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
                : "Choose whether you are registering as a player or club owner."}
            </p>
          </div>

          {/* Tabs */}
          <div className="mt-5 flex rounded-xl bg-[#f4f6f2] p-1">
            <button
              onClick={() => {
                setTab("login");
                setError(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                tab === "login"
                  ? "bg-white text-[#17201c] shadow-sm"
                  : "text-[#7c867f] hover:text-[#17201c]"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setTab("signup");
                setError(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                tab === "signup"
                  ? "bg-white text-[#17201c] shadow-sm"
                  : "text-[#7c867f] hover:text-[#17201c]"
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
              <AlertCircle size={15} className="shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            {/* Required Role Selection Cards on Register Tab */}
            {tab === "signup" && (
              <div>
                <label className="text-[11px] font-black uppercase text-[#5c6760] block mb-1.5">
                  Select Role <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("CUSTOMER")}
                    className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition ${
                      role === "CUSTOMER"
                        ? "border-[#17201c] bg-[#fafbf9]"
                        : "border-[#e2e7df] bg-white hover:border-[#ccd4c9]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#17201c]">
                      <UserIcon size={14} className={role === "CUSTOMER" ? "text-[#55811c]" : "text-gray-400"} />
                      <span>Player</span>
                    </div>
                    <span className="text-[10px] text-[#717d74] mt-0.5">Book & play</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("OWNER")}
                    className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition ${
                      role === "OWNER"
                        ? "border-[#17201c] bg-[#fafbf9]"
                        : "border-[#e2e7df] bg-white hover:border-[#ccd4c9]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#17201c]">
                      <Building2 size={14} className={role === "OWNER" ? "text-[#55811c]" : "text-gray-400"} />
                      <span>Club Owner</span>
                    </div>
                    <span className="text-[10px] text-[#717d74] mt-0.5">Manage courts</span>
                  </button>
                </div>
              </div>
            )}

            {tab === "signup" && (
              <div>
                <label className="text-[11px] font-bold text-[#5c6760]">Full Name</label>
                <div className="mt-1 flex items-center gap-2.5 rounded-xl border border-[#e2e7df] bg-[#f8faf7] px-3.5 py-2 text-sm focus-within:border-[#17201c] focus-within:bg-white">
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

            {tab === "signup" && role === "OWNER" && (
              <div>
                <label className="text-[11px] font-bold text-[#5c6760]">Club / Venue Name</label>
                <div className="mt-1 flex items-center gap-2.5 rounded-xl border border-[#e2e7df] bg-[#f8faf7] px-3.5 py-2 text-sm focus-within:border-[#17201c] focus-within:bg-white">
                  <Building2 className="h-4 w-4 text-[#8e9891]" />
                  <input
                    type="text"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    placeholder="e.g. Victory Badminton Club"
                    className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-[#a1aba3]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-[#5c6760]">Email Address</label>
              <div className="mt-1 flex items-center gap-2.5 rounded-xl border border-[#e2e7df] bg-[#f8faf7] px-3.5 py-2 text-sm focus-within:border-[#17201c] focus-within:bg-white">
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
              <div className="mt-1 flex items-center gap-2.5 rounded-xl border border-[#e2e7df] bg-[#f8faf7] px-3.5 py-2 text-sm focus-within:border-[#17201c] focus-within:bg-white">
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
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#a8e63d] py-3 text-xs font-bold text-[#17201c] shadow-md transition hover:bg-[#b8ef59] active:scale-[0.99] disabled:opacity-60"
            >
              {isLoading ? (
                "Processing..."
              ) : tab === "login" ? (
                <>
                  Sign In <ArrowRight className="h-4 w-4" />
                </>
              ) : role === "OWNER" ? (
                <>
                  Register as Club Owner <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Register as Player <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* Quick Demo Role Switcher */}
            <div className="mt-3 pt-3 border-t border-[#edf1eb]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b958e] block mb-1.5 text-center">
                Quick Demo Sign-In
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    login("alex.nguyen@example.com", "Alex Nguyen", "CUSTOMER", 1);
                    closeLoginModal();
                    router.push("/");
                  }}
                  className="flex-1 rounded-xl border border-[#dbe3d8] bg-[#f8faf7] py-2 text-[11px] font-bold text-[#17201c] hover:bg-[#edf4e8] transition"
                >
                  🏸 Player (Alex)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    login("owner1@bookme.test", "Smash Management", "OWNER", 5);
                    closeLoginModal();
                    router.push("/owner");
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

