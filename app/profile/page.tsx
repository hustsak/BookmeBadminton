"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Navbar } from "@/components/Navbar";
import { LoginModal } from "@/components/LoginModal";
import { useApp } from "@/context/AppContext";
import {
  User as UserIcon,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowRight,
  ShieldCheck,
  Flame,
  Award,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  ExternalLink,
  ChevronRight,
  Info,
  Download,
} from "lucide-react";

const DAYS_OF_WEEK = [
  { id: "MON", label: "Mon", full: "Monday" },
  { id: "TUE", label: "Tue", full: "Tuesday" },
  { id: "WED", label: "Wed", full: "Wednesday" },
  { id: "THU", label: "Thu", full: "Thursday" },
  { id: "FRI", label: "Fri", full: "Friday" },
  { id: "SAT", label: "Sat", full: "Saturday" },
  { id: "SUN", label: "Sun", full: "Sunday" },
];

const SKILL_LEVELS = [
  {
    id: "BEGINNER",
    label: "Beginner",
    desc: "Learning rules, basic grip, standard serving, rallies under 5 shots.",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    id: "INTERMEDIATE",
    label: "Intermediate",
    desc: "Consistent clears, basic smashes and drops, good court movement.",
    color: "bg-[#f0fae1] text-[#3e6815] border-[#a8e63d]",
  },
  {
    id: "ADVANCED",
    label: "Advanced",
    desc: "Fast tactical rallies, powerful smashes, deceptive net play.",
    color: "bg-amber-50 text-amber-800 border-amber-300",
  },
  {
    id: "PROFESSIONAL",
    label: "Professional",
    desc: "Tournament / competitive circuit experience, high physical stamina.",
    color: "bg-purple-50 text-purple-800 border-purple-300",
  },
];

const PLAYING_STYLES = [
  { id: "SINGLES", label: "Singles", desc: "Full court coverage, physical endurance" },
  { id: "DOUBLES", label: "Doubles", desc: "Front/back rotations, rapid net reflex" },
  { id: "BOTH", label: "Singles & Doubles", desc: "Versatile player enjoying both" },
];

const PLAY_HANDS = [
  { id: "RIGHT", label: "Right-Handed" },
  { id: "LEFT", label: "Left-Handed" },
  { id: "BOTH", label: "Ambidextrous" },
];

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
];

export default function ProfilePage() {
  const { user, openLoginModal, venues } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [skillLevel, setSkillLevel] = useState<string>("INTERMEDIATE");
  const [playingStyle, setPlayingStyle] = useState<string>("BOTH");
  const [playHand, setPlayHand] = useState<string>("RIGHT");
  const [homeVenueId, setHomeVenueId] = useState<string>("");
  const [preferredDays, setPreferredDays] = useState<string[]>(["SAT", "SUN"]);
  const [startTime, setStartTime] = useState<string>("18:00");
  const [endTime, setEndTime] = useState<string>("21:00");
  const [yearsExperience, setYearsExperience] = useState<number | "">(2);
  const [bio, setBio] = useState("");

  // Server stats state
  const [stats, setStats] = useState<{
    matchesPlayed: number;
    matchesHosted: number;
    completedMatches: number;
    isProfileComplete: boolean;
  }>({
    matchesPlayed: 0,
    matchesHosted: 0,
    completedMatches: 0,
    isProfileComplete: false,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchProfile = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/profile", {
        headers: { "x-user-id": String(user.id) },
      });
      const data = await res.json();
      if (res.ok && data.success && data.profile) {
        const p = data.profile;
        setDisplayName(p.displayName || user.name || "");
        setAvatar(p.avatar || user.avatar || "");
        setSkillLevel(p.skillLevel || "INTERMEDIATE");
        setPlayingStyle(p.playingStyle || "BOTH");
        setPlayHand(p.playHand || "RIGHT");
        setHomeVenueId(p.homeVenueId ? String(p.homeVenueId) : "");
        setPreferredDays(
          Array.isArray(p.preferredDays) && p.preferredDays.length > 0
            ? p.preferredDays
            : ["SAT", "SUN"]
        );
        if (p.preferredTimeRanges && p.preferredTimeRanges.length > 0) {
          setStartTime(p.preferredTimeRanges[0].startTime || "18:00");
          setEndTime(p.preferredTimeRanges[0].endTime || "21:00");
        }
        setYearsExperience(p.yearsExperience ?? 2);
        setBio(p.bio || "");
        setStats({
          matchesPlayed: p.matchesPlayed || 0,
          matchesHosted: p.matchesHosted || 0,
          completedMatches: p.completedMatches || 0,
          isProfileComplete: Boolean(p.isProfileComplete),
        });
      } else {
        // Defaults if no profile created yet
        setDisplayName(user.name || "");
        setAvatar(user.avatar || "");
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setErrorMessage("Could not load your profile. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user?.id]);

  const toggleDay = (dayId: string) => {
    setPreferredDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!displayName.trim()) {
      errors.displayName = "Display name is required.";
    } else if (displayName.trim().length > 60) {
      errors.displayName = "Display name must be 60 characters or less.";
    }

    if (yearsExperience !== "" && (Number(yearsExperience) < 0 || Number(yearsExperience) > 60)) {
      errors.yearsExperience = "Years of experience must be between 0 and 60.";
    }

    if (bio && bio.length > 400) {
      errors.bio = "Bio cannot exceed 400 characters.";
    }

    if (startTime && endTime && startTime >= endTime) {
      errors.timeRange = "Start time must be before end time.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openLoginModal();
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        displayName: displayName.trim(),
        avatar: avatar.trim(),
        skillLevel,
        playingStyle,
        playHand,
        preferredDays,
        preferredTimeRanges: [{ startTime, endTime }],
        homeVenueId: homeVenueId ? Number(homeVenueId) : null,
        preferredVenueIds: homeVenueId ? [Number(homeVenueId)] : [],
        bio: bio.trim(),
        yearsExperience: yearsExperience === "" ? null : Number(yearsExperience),
      };

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Profile saved successfully! Your matchmaking rank has updated.");
        if (data.profile) {
          setStats({
            matchesPlayed: data.profile.matchesPlayed || 0,
            matchesHosted: data.profile.matchesHosted || 0,
            completedMatches: data.profile.completedMatches || 0,
            isProfileComplete: Boolean(data.profile.isProfileComplete),
          });
        }
      } else {
        setErrorMessage(data.message || "Failed to save profile.");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user && !isLoading) {
    return (
      <main className="min-h-screen bg-[#F7F8F4] text-[#17201C] pb-24">
        <Navbar />
        <LoginModal />
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#f0fae1] text-[#426a17] shadow-sm">
            <UserIcon className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-black">Sign in to Manage Profile</h1>
          <p className="mt-2 text-sm text-[#707e74]">
            Build your player identity, set your skill tier, and unlock smart badminton matchmaking.
          </p>
          <button
            onClick={openLoginModal}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#17201c] px-6 py-3 text-sm font-bold text-[#a8e63d] shadow-lg hover:bg-[#2c3a32]"
          >
            Log In Now
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F8F4] text-[#17201C] pb-36 sm:pb-32 w-full max-w-full overflow-x-hidden">
      <Navbar />
      <LoginModal />

      {/* Floating Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 sm:bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border border-[#d6dfd3] bg-[#17201c] px-4 py-3 text-xs font-bold text-white shadow-2xl"
          >
            <Sparkles className="h-4 w-4 text-[#a8e63d]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        {/* Top Header Card */}
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#17201c] via-[#213128] to-[#131d17] p-6 sm:p-8 text-white shadow-xl">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#a8e63d]/15 blur-3xl" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-[#a8e63d] overflow-hidden bg-white/10 shrink-0">
                {avatar ? (
                  <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-black text-2xl text-[#a8e63d]">
                    {(displayName || user?.name || "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-0.5 text-[11px] font-semibold text-[#c8e994]">
                  <Sparkles className="h-3 w-3 text-[#a8e63d]" />
                  <span>Player Profile & Matchmaking Settings</span>
                </div>
                <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">
                  {displayName || user?.name || "Your Profile"}
                </h1>
                <p className="text-xs text-[#a3b3a8]">
                  Keep your info updated to get accurate player and match recommendations.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("bookme:open_install_modal"));
                  }
                }}
                className="flex items-center gap-1.5 rounded-2xl border border-[#a8e63d]/40 bg-[#a8e63d]/10 px-3.5 py-2 text-xs font-bold text-[#c8e994] hover:bg-[#a8e63d]/20 transition active:scale-95"
                title="Install BookMeBadminton app on your phone or desktop"
              >
                <Download className="h-3.5 w-3.5 text-[#a8e63d]" />
                Install App
              </button>

              {user && (
                <Link
                  href={`/players/${user.id}`}
                  className="flex items-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20 transition active:scale-95"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Public Profile
                </Link>
              )}
            </div>
          </div>

          {/* Quick Stats Strip */}
          <div className="relative z-10 mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-white/10 pt-5">
            <div className="rounded-2xl bg-white/5 p-3 backdrop-blur">
              <div className="flex items-center gap-2 text-xs text-[#9eb1a4]">
                <Flame className="h-3.5 w-3.5 text-[#a8e63d]" />
                <span>Matches Played</span>
              </div>
              <p className="mt-1 text-xl font-black text-white">{stats.matchesPlayed}</p>
            </div>

            <div className="rounded-2xl bg-white/5 p-3 backdrop-blur">
              <div className="flex items-center gap-2 text-xs text-[#9eb1a4]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#a8e63d]" />
                <span>Matches Hosted</span>
              </div>
              <p className="mt-1 text-xl font-black text-white">{stats.matchesHosted}</p>
            </div>

            <div className="rounded-2xl bg-white/5 p-3 backdrop-blur">
              <div className="flex items-center gap-2 text-xs text-[#9eb1a4]">
                <Trophy className="h-3.5 w-3.5 text-[#a8e63d]" />
                <span>Completed</span>
              </div>
              <p className="mt-1 text-xl font-black text-white">{stats.completedMatches}</p>
            </div>

            <div className="rounded-2xl bg-white/5 p-3 backdrop-blur">
              <div className="flex items-center gap-2 text-xs text-[#9eb1a4]">
                <Award className="h-3.5 w-3.5 text-[#a8e63d]" />
                <span>Status</span>
              </div>
              <p className="mt-1 text-sm font-bold flex items-center gap-1">
                {stats.isProfileComplete ? (
                  <span className="text-[#a8e63d] flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready for Matchmaking
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Incomplete
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        {isLoading ? (
          <div className="mt-8 flex justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#a8e63d] border-t-transparent" />
              <p className="text-xs font-bold text-[#728277]">Loading player settings...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-8 space-y-6">
            {errorMessage && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. Identity & Avatar */}
            <div className="rounded-[28px] border border-[#e1e7df] bg-white p-6 shadow-sm">
              <h2 className="text-base font-extrabold text-[#17201c] flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-[#5e8b1d]" />
                Player Identity
              </h2>
              <p className="text-xs text-[#707e74] mt-0.5">
                How other players and match organizers see your profile.
              </p>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#2d3a33] mb-1.5">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={60}
                    placeholder="e.g., Alex Nguyen"
                    className={`w-full rounded-2xl border bg-[#f8faf7] px-4 py-3 text-xs sm:text-sm font-semibold text-[#17201c] outline-none transition focus:border-[#a8e63d] ${
                      validationErrors.displayName ? "border-red-400 bg-red-50/50" : "border-[#e3e8e1]"
                    }`}
                  />
                  {validationErrors.displayName && (
                    <p className="mt-1 text-[11px] font-semibold text-red-600">
                      {validationErrors.displayName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2d3a33] mb-1.5">
                    Avatar Image URL
                  </label>
                  <input
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-2xl border border-[#e3e8e1] bg-[#f8faf7] px-4 py-3 text-xs sm:text-sm font-semibold text-[#17201c] outline-none transition focus:border-[#a8e63d]"
                  />
                </div>
              </div>

              {/* Preset Avatars */}
              <div className="mt-4">
                <p className="text-[11px] font-bold text-[#707e74] mb-2">Or choose a preset avatar:</p>
                <div className="flex flex-wrap items-center gap-2.5">
                  {PRESET_AVATARS.map((presetUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatar(presetUrl)}
                      className={`h-11 w-11 rounded-full overflow-hidden border-2 transition ${
                        avatar === presetUrl
                          ? "border-[#5e8b1d] ring-2 ring-[#a8e63d] scale-105"
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                    >
                      <img src={presetUrl} alt="Preset" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Skill Level & Playing Style */}
            <div className="rounded-[28px] border border-[#e1e7df] bg-white p-6 shadow-sm">
              <h2 className="text-base font-extrabold text-[#17201c] flex items-center gap-2">
                <Award className="h-4 w-4 text-[#5e8b1d]" />
                Skill Level & Play Style
              </h2>
              <p className="text-xs text-[#707e74] mt-0.5">
                Our smart engine matches you with players within compatible skill bands.
              </p>

              {/* Skill Level Selection */}
              <div className="mt-5">
                <label className="block text-xs font-bold text-[#2d3a33] mb-2">
                  Skill Level <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {SKILL_LEVELS.map((tier) => (
                    <div
                      key={tier.id}
                      onClick={() => setSkillLevel(tier.id)}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                        skillLevel === tier.id
                          ? "border-[#5e8b1d] bg-[#f2fae6] ring-2 ring-[#a8e63d]/50"
                          : "border-[#e3e8e1] bg-[#fbfcfb] hover:border-[#a8e63d]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${tier.color}`}>
                          {tier.label}
                        </span>
                        {skillLevel === tier.id && (
                          <CheckCircle2 className="h-4 w-4 text-[#4f7d16]" />
                        )}
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-[#56645a]">
                        {tier.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Playing Style & Hand */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 border-t border-[#edf1eb]">
                <div>
                  <label className="block text-xs font-bold text-[#2d3a33] mb-2">
                    Preferred Playing Style <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PLAYING_STYLES.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setPlayingStyle(style.id)}
                        className={`rounded-2xl border py-3 px-2 text-center transition ${
                          playingStyle === style.id
                            ? "border-[#5e8b1d] bg-[#f2fae6] text-[#2c4e0e] font-extrabold ring-1 ring-[#a8e63d]"
                            : "border-[#e3e8e1] bg-[#f8faf7] text-[#4f5c53] font-semibold hover:border-[#a8e63d]"
                        }`}
                      >
                        <div className="text-xs">{style.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2d3a33] mb-2">
                    Dominant Hand <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PLAY_HANDS.map((hand) => (
                      <button
                        key={hand.id}
                        type="button"
                        onClick={() => setPlayHand(hand.id)}
                        className={`rounded-2xl border py-3 px-2 text-center transition ${
                          playHand === hand.id
                            ? "border-[#5e8b1d] bg-[#f2fae6] text-[#2c4e0e] font-extrabold ring-1 ring-[#a8e63d]"
                            : "border-[#e3e8e1] bg-[#f8faf7] text-[#4f5c53] font-semibold hover:border-[#a8e63d]"
                        }`}
                      >
                        <div className="text-xs">{hand.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Availability & Venue Preferences */}
            <div className="rounded-[28px] border border-[#e1e7df] bg-white p-6 shadow-sm">
              <h2 className="text-base font-extrabold text-[#17201c] flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#5e8b1d]" />
                Availability & Preferred Venues
              </h2>
              <p className="text-xs text-[#707e74] mt-0.5">
                Overlapping days and time slots contribute 25% to your compatibility match score.
              </p>

              {/* Preferred Days */}
              <div className="mt-5">
                <label className="block text-xs font-bold text-[#2d3a33] mb-2">
                  Days You Can Play
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = preferredDays.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDay(d.id)}
                        className={`rounded-2xl border px-4 py-2.5 text-xs font-bold transition flex items-center gap-1.5 ${
                          isSelected
                            ? "border-[#5e8b1d] bg-[#17201c] text-[#a8e63d] shadow-sm"
                            : "border-[#e3e8e1] bg-[#f8faf7] text-[#556359] hover:border-[#a8e63d]"
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 text-[#a8e63d]" />}
                        <span>{d.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Range */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-[#edf1eb]">
                <div>
                  <label className="block text-xs font-bold text-[#2d3a33] mb-1.5 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-[#5e8b1d]" />
                    Earliest Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-2xl border border-[#e3e8e1] bg-[#f8faf7] px-4 py-3 text-xs sm:text-sm font-semibold text-[#17201c] outline-none focus:border-[#a8e63d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2d3a33] mb-1.5 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-[#5e8b1d]" />
                    Latest End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-2xl border border-[#e3e8e1] bg-[#f8faf7] px-4 py-3 text-xs sm:text-sm font-semibold text-[#17201c] outline-none focus:border-[#a8e63d]"
                  />
                  {validationErrors.timeRange && (
                    <p className="mt-1 text-[11px] font-semibold text-red-600">
                      {validationErrors.timeRange}
                    </p>
                  )}
                </div>
              </div>

              {/* Home Venue */}
              <div className="mt-6 pt-5 border-t border-[#edf1eb]">
                <label className="block text-xs font-bold text-[#2d3a33] mb-1.5 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[#5e8b1d]" />
                  Home Venue / Favorite Court
                </label>
                <select
                  value={homeVenueId}
                  onChange={(e) => setHomeVenueId(e.target.value)}
                  className="w-full rounded-2xl border border-[#e3e8e1] bg-[#f8faf7] px-4 py-3 text-xs sm:text-sm font-semibold text-[#17201c] outline-none focus:border-[#a8e63d]"
                >
                  <option value="">Select a Home Venue (Optional)</option>
                  {venues.map((v) => (
                    <option key={v.id} value={String(v.id)}>
                      {v.name} — {v.location}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-[#707e74]">
                  Shared home venues give an automatic 20% compatibility boost.
                </p>
              </div>
            </div>

            {/* 4. Experience & Bio */}
            <div className="rounded-[28px] border border-[#e1e7df] bg-white p-6 shadow-sm">
              <h2 className="text-base font-extrabold text-[#17201c] flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[#5e8b1d]" />
                Experience & Bio
              </h2>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#2d3a33] mb-1.5">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={yearsExperience}
                    onChange={(e) =>
                      setYearsExperience(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="2"
                    className="w-full rounded-2xl border border-[#e3e8e1] bg-[#f8faf7] px-4 py-3 text-xs sm:text-sm font-semibold text-[#17201c] outline-none focus:border-[#a8e63d]"
                  />
                  {validationErrors.yearsExperience && (
                    <p className="mt-1 text-[11px] font-semibold text-red-600">
                      {validationErrors.yearsExperience}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#2d3a33] mb-1.5">
                    Short Bio (Max 400 chars)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={400}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell sparring partners about your playing rhythm, preferred racquets, or tournament goals..."
                    className="w-full rounded-2xl border border-[#e3e8e1] bg-[#f8faf7] px-4 py-3 text-xs sm:text-sm font-semibold text-[#17201c] outline-none focus:border-[#a8e63d]"
                  />
                  <div className="flex justify-between text-[11px] text-[#86958a] mt-1">
                    <span>Be friendly and concise!</span>
                    <span>{bio.length}/400</span>
                  </div>
                  {validationErrors.bio && (
                    <p className="mt-1 text-[11px] font-semibold text-red-600">
                      {validationErrors.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-[28px] bg-[#17201c] p-5 text-white shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#a8e63d]/20 text-[#a8e63d]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Ready to save?</p>
                  <p className="text-[11px] text-[#9eb1a4]">
                    Your matchmaking score updates instantly across Hanoi.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-2xl bg-[#a8e63d] px-7 py-3.5 text-xs sm:text-sm font-black text-[#17201c] shadow-lg transition hover:bg-[#bbf05c] active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#17201c] border-t-transparent" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Profile</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-4 w-4"}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
