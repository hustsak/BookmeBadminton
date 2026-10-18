"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Navbar } from "@/components/Navbar";
import { useApp } from "@/context/AppContext";
import {
  User as UserIcon,
  Building2,
  Mail,
  Lock,
  Phone,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useApp();

  const [role, setRole] = useState<"CUSTOMER" | "OWNER">("CUSTOMER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [clubName, setClubName] = useState("");
  const [clubAddress, setClubAddress] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role,
          phone: phone || undefined,
          clubName: role === "OWNER" ? clubName : undefined,
          clubAddress: role === "OWNER" ? clubAddress : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Registration failed. Please check your inputs.");
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        role === "OWNER"
          ? "Club Owner account created successfully! Redirecting to Owner Dashboard..."
          : "Player account created successfully! Welcome to BookMeBadminton..."
      );

      // Update client context with verified database user details
      login(data.user.email, data.user.name, data.user.role, data.user.id);

      setTimeout(() => {
        router.push(data.redirectTo || (role === "OWNER" ? "/owner" : "/"));
      }, 900);
    } catch (err: any) {
      console.error("Registration error:", err);
      setError("An unexpected network error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8f4] text-[#17201c]">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe3d8] bg-[#f0fae1] px-3.5 py-1 text-xs font-bold text-[#456e17]">
            <Sparkles className="h-3.5 w-3.5 text-[#78a72b]" />
            Join BookMeBadminton
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-black text-[#17201c] tracking-tight">
            Create Your Account<span className="text-[#a8e63d]">.</span>
          </h1>
          <p className="mt-2 text-sm text-[#6c7870] max-w-md mx-auto">
            Choose your account role below to unlock tailored features for booking courts or managing your club.
          </p>
        </div>

        {/* Card Form Container */}
        <div className="rounded-[28px] border border-[#e1e7df] bg-white p-6 sm:p-10 shadow-sm">
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
              <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#c4e88f] bg-[#f2fadc] p-4 text-xs font-bold text-[#355b10]">
              <CheckCircle2 size={18} className="shrink-0 text-[#548419] mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-6">
            {/* 1. REQUIRED ROLE SELECTION CARDS */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#57645b] mb-3">
                1. Select Your Role <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Player Card */}
                <button
                  type="button"
                  onClick={() => setRole("CUSTOMER")}
                  className={`relative flex flex-col items-start p-5 rounded-2xl border-2 text-left transition active:scale-[0.99] ${
                    role === "CUSTOMER"
                      ? "border-[#17201c] bg-[#fafbf9] shadow-sm"
                      : "border-[#e5ebe2] bg-white hover:border-[#ccd4c9]"
                  }`}
                >
                  <div className="flex w-full items-center justify-between mb-2.5">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        role === "CUSTOMER" ? "bg-[#17201c] text-[#a8e63d]" : "bg-[#f2f5ef] text-[#69756c]"
                      }`}
                    >
                      <UserIcon size={20} />
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        role === "CUSTOMER" ? "bg-[#eaf7d5] text-[#3c6b12]" : "bg-[#edf1eb] text-gray-500"
                      }`}
                    >
                      Player
                    </span>
                  </div>
                  <h3 className="text-base font-black text-[#17201c]">Player</h3>
                  <p className="mt-1 text-xs text-[#717d74] leading-relaxed">
                    Book courts, view booking history, join sparring matches, and save favorites.
                  </p>
                  {role === "CUSTOMER" && (
                    <div className="mt-3 flex items-center gap-1 text-[11px] font-extrabold text-[#3a6810]">
                      <CheckCircle2 size={13} /> Selected Role
                    </div>
                  )}
                </button>

                {/* Club Owner Card */}
                <button
                  type="button"
                  onClick={() => setRole("OWNER")}
                  className={`relative flex flex-col items-start p-5 rounded-2xl border-2 text-left transition active:scale-[0.99] ${
                    role === "OWNER"
                      ? "border-[#17201c] bg-[#fafbf9] shadow-sm"
                      : "border-[#e5ebe2] bg-white hover:border-[#ccd4c9]"
                  }`}
                >
                  <div className="flex w-full items-center justify-between mb-2.5">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        role === "OWNER" ? "bg-[#17201c] text-[#a8e63d]" : "bg-[#f2f5ef] text-[#69756c]"
                      }`}
                    >
                      <Building2 size={20} />
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        role === "OWNER" ? "bg-[#eaf7d5] text-[#3c6b12]" : "bg-[#edf1eb] text-gray-500"
                      }`}
                    >
                      Court Owner
                    </span>
                  </div>
                  <h3 className="text-base font-black text-[#17201c]">Club Owner</h3>
                  <p className="mt-1 text-xs text-[#717d74] leading-relaxed">
                    Manage your courts, monitor reservations, manage hours, and oversee operations.
                  </p>
                  {role === "OWNER" && (
                    <div className="mt-3 flex items-center gap-1 text-[11px] font-extrabold text-[#3a6810]">
                      <CheckCircle2 size={13} /> Selected Role
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* 2. USER DETAILS */}
            <div className="space-y-4 pt-2 border-t border-[#edf1eb]">
              <label className="block text-xs font-black uppercase tracking-wider text-[#57645b]">
                2. Account Details
              </label>

              <div>
                <label className="text-xs font-bold text-[#5c6760] block mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2.5 rounded-xl border border-[#e2e7df] bg-[#f8faf7] px-3.5 py-2.5 text-xs focus-within:border-[#17201c] focus-within:bg-white">
                  <UserIcon className="h-4 w-4 text-[#8e9891]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Nguyen"
                    className="w-full bg-transparent font-medium outline-none text-[#17201c] placeholder:text-[#a1aba3]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5c6760] block mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2.5 rounded-xl border border-[#e2e7df] bg-[#f8faf7] px-3.5 py-2.5 text-xs focus-within:border-[#17201c] focus-within:bg-white">
                  <Mail className="h-4 w-4 text-[#8e9891]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex.nguyen@example.com"
                    className="w-full bg-transparent font-medium outline-none text-[#17201c] placeholder:text-[#a1aba3]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5c6760] block mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2.5 rounded-xl border border-[#e2e7df] bg-[#f8faf7] px-3.5 py-2.5 text-xs focus-within:border-[#17201c] focus-within:bg-white">
                  <Lock className="h-4 w-4 text-[#8e9891]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent font-medium outline-none text-[#17201c] placeholder:text-[#a1aba3]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5c6760] block mb-1">Phone Number (Optional)</label>
                <div className="flex items-center gap-2.5 rounded-xl border border-[#e2e7df] bg-[#f8faf7] px-3.5 py-2.5 text-xs focus-within:border-[#17201c] focus-within:bg-white">
                  <Phone className="h-4 w-4 text-[#8e9891]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912 345 678"
                    className="w-full bg-transparent font-medium outline-none text-[#17201c] placeholder:text-[#a1aba3]"
                  />
                </div>
              </div>
            </div>

            {/* 3. CLUB OWNER DETAILS (Only if OWNER selected) */}
            {role === "OWNER" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-4 pt-2 border-t border-[#edf1eb]"
              >
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-[#456e18]" />
                  <label className="block text-xs font-black uppercase tracking-wider text-[#57645b]">
                    3. Club Information
                  </label>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#5c6760] block mb-1">Club / Venue Name</label>
                  <input
                    type="text"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    placeholder="e.g. Apex Badminton Club"
                    className="w-full rounded-xl border border-[#e2e7df] bg-[#f8faf7] px-3.5 py-2.5 text-xs font-medium outline-none focus:border-[#17201c] focus:bg-white text-[#17201c]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#5c6760] block mb-1">Club Address / District</label>
                  <input
                    type="text"
                    value={clubAddress}
                    onChange={(e) => setClubAddress(e.target.value)}
                    placeholder="e.g. 120 Hoang Quoc Viet, Cau Giay, Hanoi"
                    className="w-full rounded-xl border border-[#e2e7df] bg-[#f8faf7] px-3.5 py-2.5 text-xs font-medium outline-none focus:border-[#17201c] focus:bg-white text-[#17201c]"
                  />
                </div>
              </motion.div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#a8e63d] py-3.5 text-sm font-black text-[#17201c] shadow-md transition hover:bg-[#b8ef59] active:scale-[0.99] disabled:opacity-60"
            >
              {isLoading ? (
                "Creating Account..."
              ) : role === "OWNER" ? (
                <>
                  Register as Club Owner <ArrowRight size={16} />
                </>
              ) : (
                <>
                  Register as Player <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 text-center text-xs text-[#717d74]">
            Already have an account?{" "}
            <Link href="/" className="font-bold text-[#17201c] underline hover:text-[#52811a]">
              Sign in from the home page
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
