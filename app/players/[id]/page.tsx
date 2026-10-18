"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { LoginModal } from "@/components/LoginModal";
import { useApp } from "@/context/AppContext";
import {
  Users,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Share2,
  Award,
  Zap,
  Activity,
  Trophy,
  Star,
  Flame,
  TrendingUp,
  Flag,
  MessageSquare,
  Check,
  X,
} from "lucide-react";

export default function PlayerProfileDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  const { user, openLoginModal } = useApp();

  const [player, setPlayer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

  // Reviews & Reporting state
  const [reviewsData, setReviewsData] = useState<any>(null);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportToast, setReportToast] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlayer() {
      setIsLoading(true);
      try {
        const numericId = parseInt(id, 10);
        const res = await fetch(`/api/players/${numericId}`, {
          headers: user?.id ? { "x-user-id": String(user.id) } : {},
        });
        const data = await res.json();
        if (res.ok && data.success && data.player) {
          setPlayer(data.player);
        } else {
          setErrorMessage(data.message || "Player not found.");
        }
      } catch (err) {
        console.error("Failed to load player profile:", err);
        setErrorMessage("Network error occurred while fetching player profile.");
      } finally {
        setIsLoading(false);
      }
    }
    loadPlayer();
  }, [id, user?.id]);

  useEffect(() => {
    async function loadReviews() {
      try {
        const numericId = parseInt(id, 10);
        const res = await fetch(`/api/players/${numericId}/reviews?page=${reviewsPage}&limit=5`);
        const data = await res.json();
        if (res.ok && data.success) {
          setReviewsData(data);
        }
      } catch (err) {
        console.warn("Failed to load player reviews:", err);
      }
    }
    loadReviews();
  }, [id, reviewsPage]);

  // Handle Escape key to close report modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isReportModalOpen) {
        setIsReportModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReportModalOpen]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    }
  };

  const handleOpenReport = (reviewId: number) => {
    if (!user) {
      openLoginModal();
      return;
    }
    setReportingReviewId(reviewId);
    setReportReason("");
    setReportDetails("");
    setIsReportModalOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!reportingReviewId || !user) return;
    if (!reportReason.trim()) {
      alert("Please enter a reason for reporting this review.");
      return;
    }
    setIsSubmittingReport(true);
    try {
      const res = await fetch(`/api/reviews/${reportingReviewId}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id),
        },
        body: JSON.stringify({
          reason: reportReason.trim(),
          details: reportDetails.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsReportModalOpen(false);
        setReportToast("Review reported. Our moderation team will investigate.");
        setTimeout(() => setReportToast(null), 4000);
      } else {
        alert(data.message || "Failed to submit report.");
      }
    } catch {
      alert("Network error submitting report. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const getSkillBadgeStyle = (level: string) => {
    switch (level?.toUpperCase()) {
      case "BEGINNER":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-400/30";
      case "INTERMEDIATE":
        return "bg-blue-500/20 text-blue-300 border-blue-400/30";
      case "ADVANCED":
        return "bg-purple-500/20 text-purple-300 border-purple-400/30";
      case "PROFESSIONAL":
        return "bg-amber-500/20 text-amber-300 border-amber-400/30";
      default:
        return "bg-white/10 text-white border-white/20";
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#F7F8F4] text-[#17201C] pb-24">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-16 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#a8e63d] border-t-transparent" />
          <p className="mt-4 text-xs font-bold text-[#7a867e]">Loading player profile...</p>
        </div>
      </main>
    );
  }

  if (errorMessage || !player) {
    return (
      <main className="min-h-screen bg-[#F7F8F4] text-[#17201C] pb-24">
        <Navbar />
        <div className="mx-auto max-w-md px-4 pt-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-4">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-extrabold text-[#17201c]">Player Not Found</h1>
          <p className="mt-2 text-xs text-[#717b73]">
            {errorMessage || "The player profile you requested does not exist."}
          </p>
          <Link
            href="/players"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#17201c] px-6 py-3 text-xs font-bold text-white transition hover:bg-[#2c3830]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Players Directory
          </Link>
        </div>
      </main>
    );
  }

  const isSelf = user?.id && player.userId === user.id;
  const compatibility = player.compatibility;
  const stats = player.statistics || {
    matchesPlayed: player.stats?.matchesPlayed || 0,
    matchesHosted: player.stats?.matchesHosted || 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    currentStreak: { type: "NONE", count: 0, label: "-" },
    bestWinStreak: 0,
    averageRating: 0,
    ratingsCount: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    recentMatches: [],
    monthlyTrends: [],
    venueStats: [],
  };

  return (
    <main className="min-h-screen bg-[#F7F8F4] text-[#17201C] pb-36 sm:pb-32 w-full max-w-full overflow-x-hidden">
      <Navbar />
      <LoginModal />

      {/* Floating Feedback Toasts */}
      {copiedToast && (
        <div className="fixed bottom-20 sm:bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-[#17201c] px-4 py-3 text-xs font-bold text-white shadow-2xl">
          <Sparkles className="h-4 w-4 text-[#a8e63d]" />
          <span>Profile link copied to clipboard!</span>
        </div>
      )}

      {reportToast && (
        <div className="fixed bottom-20 sm:bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-[#17201c] px-4 py-3 text-xs font-bold text-white shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-[#a8e63d]" />
          <span>{reportToast}</span>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-6 sm:pt-10">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#7c867f]">
            <Link
              href="/players"
              className="flex items-center gap-1.5 font-semibold hover:text-[#17201c] transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Players Directory
            </Link>
            <span>/</span>
            <span className="text-[#17201c] font-bold truncate max-w-[200px] sm:max-w-none">
              {player.displayName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-full border border-[#dce2d9] bg-white px-3.5 py-1.5 text-xs font-bold text-[#556158] hover:bg-[#f2f6ef] transition"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share Profile
            </button>
            {isSelf && (
              <Link
                href="/profile"
                className="flex items-center gap-1.5 rounded-full bg-[#a8e63d] px-3.5 py-1.5 text-xs font-bold text-[#17201c] hover:bg-[#b8ef59] transition shadow-sm"
              >
                Edit My Profile
              </Link>
            )}
          </div>
        </div>

        {/* HERO PROFILE CARD */}
        <div className="relative overflow-hidden rounded-[28px] sm:rounded-[36px] bg-gradient-to-br from-[#17201c] via-[#203027] to-[#131d17] p-6 sm:p-10 text-white shadow-xl mb-6">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#a8e63d]/15 blur-3xl" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar / Initials */}
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#17201c] text-2xl font-black text-[#a8e63d] ring-4 ring-[#a8e63d]/30 shadow-2xl">
                {player.displayName ? player.displayName.slice(0, 2).toUpperCase() : "P"}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`rounded-full border px-3 py-0.5 text-xs font-extrabold uppercase ${getSkillBadgeStyle(
                      player.skillLevel
                    )}`}
                  >
                    {player.skillLevel}
                  </span>

                  <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs font-semibold backdrop-blur text-[#d4ded6]">
                    {player.playingStyle} Format
                  </span>

                  <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs font-semibold backdrop-blur text-[#d4ded6]">
                    {player.playHand || "Right"}-Handed
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {player.displayName}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[#ccd6ce]">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#a8e63d]" />
                    {player.homeVenue?.name || player.district || "Hanoi, Vietnam"}
                  </span>
                  <span>•</span>
                  <span>{player.yearsExperience || 1} years playing experience</span>
                  {stats.ratingsCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-bold text-amber-300">
                        <Star className="h-3.5 w-3.5 fill-amber-300" />
                        {stats.averageRating} ({stats.ratingsCount} reviews)
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Match Stats Quick Numbers */}
            <div className="flex items-center gap-3 sm:gap-5 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur text-center self-stretch sm:self-auto justify-around">
              <div>
                <span className="block text-xl sm:text-2xl font-black text-white">
                  {stats.matchesPlayed}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[#9db0a3] font-bold">
                  Played
                </span>
              </div>
              <div className="h-8 w-px bg-white/15" />
              <div>
                <span className="block text-xl sm:text-2xl font-black text-[#a8e63d]">
                  {stats.winRate}%
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[#9db0a3] font-bold">
                  Win Rate
                </span>
              </div>
              <div className="h-8 w-px bg-white/15" />
              <div>
                <span className="block text-xl sm:text-2xl font-black text-white">
                  {stats.currentStreak.label}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[#9db0a3] font-bold">
                  Streak
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* COMPATIBILITY SCORE CARD (If viewer is logged in and not self) */}
        {!isSelf && compatibility && (
          <div className="rounded-[28px] border border-[#d7e4cf] bg-gradient-to-r from-[#f0fae1] to-[#e4f6cb] p-6 shadow-sm mb-6 text-[#17201c]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#17201c] text-xl font-black text-[#a8e63d] shadow-md shrink-0">
                  {compatibility.score}%
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#598c19]" />
                    <span className="text-xs font-black uppercase tracking-wider text-[#477014]">
                      Smart Matchmaking Score
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-[#17201c]">
                    {compatibility.score >= 80
                      ? "High Sparring Compatibility!"
                      : compatibility.score >= 60
                      ? "Good Potential Playing Partner"
                      : "Moderate Match Alignment"}
                  </h3>
                  <p className="text-xs text-[#526354] mt-0.5">
                    Calculated from skill tiers (40%), schedule overlap (25%), venue (20%), and style (15%).
                  </p>
                </div>
              </div>
            </div>

            {/* Explanation Reasons */}
            {compatibility.reasons && compatibility.reasons.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#d8e6cf] flex flex-wrap gap-2 text-xs">
                {compatibility.reasons.map((r: string, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-[#cbe0bf] px-3 py-1 font-bold text-[#355214]"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#5e941c]" />
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PERFORMANCE STATISTICS OVERVIEW */}
        <div className="mb-6 rounded-[28px] border border-[#e1e7df] bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0fae1] text-[#4d7818]">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#17201c]">
                  Match Statistics & Record
                </h2>
                <p className="text-xs text-[#7e8b82]">
                  Calculated from verified community matches
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-[#5c6960]">
                Best Win Streak:{" "}
                <span className="font-extrabold text-[#17201c]">
                  {stats.bestWinStreak} wins
                </span>
              </span>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="rounded-2xl border border-[#edf1ea] bg-[#f9faf7] p-4 text-center">
              <span className="text-xs font-bold text-[#717e74] uppercase">Record</span>
              <p className="mt-1 text-xl font-black text-[#17201c]">
                <span className="text-[#4b7a16]">{stats.wins}W</span> -{" "}
                <span className="text-red-600">{stats.losses}L</span>
                {stats.draws > 0 && <span className="text-slate-500"> - {stats.draws}D</span>}
              </p>
            </div>

            <div className="rounded-2xl border border-[#edf1ea] bg-[#f9faf7] p-4 text-center">
              <span className="text-xs font-bold text-[#717e74] uppercase">Win Rate</span>
              <p className="mt-1 text-xl font-black text-[#17201c]">{stats.winRate}%</p>
            </div>

            <div className="rounded-2xl border border-[#edf1ea] bg-[#f9faf7] p-4 text-center">
              <span className="text-xs font-bold text-[#717e74] uppercase">Current Streak</span>
              <p className="mt-1 text-xl font-black text-[#17201c]">
                {stats.currentStreak.label}
              </p>
            </div>

            <div className="rounded-2xl border border-[#edf1ea] bg-[#f9faf7] p-4 text-center">
              <span className="text-xs font-bold text-[#717e74] uppercase">Matches Hosted</span>
              <p className="mt-1 text-xl font-black text-[#17201c]">{stats.matchesHosted}</p>
            </div>
          </div>

          {/* Win Rate Bar */}
          <div className="space-y-1.5 mb-6">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-[#647167]">Win / Loss Distribution</span>
              <span className="text-[#17201c]">
                {stats.wins} Wins ({stats.winRate}%)
              </span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#f0f3ee]">
              <div
                className="bg-[#78a72b] transition-all duration-500"
                style={{ width: `${stats.winRate}%` }}
              />
              <div
                className="bg-red-400 transition-all duration-500"
                style={{ width: `${100 - stats.winRate}%` }}
              />
            </div>
          </div>

          {/* Venue-Specific Breakdown (if any) */}
          {stats.venueStats && stats.venueStats.length > 0 && (
            <div className="pt-5 border-t border-[#edf1ea]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#69766d] mb-3">
                Venue Performance
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stats.venueStats.map((vs: any) => (
                  <div
                    key={vs.venueId}
                    className="flex items-center justify-between rounded-2xl border border-[#edf1ea] bg-[#fbfcfb] p-3 text-xs"
                  >
                    <div>
                      <span className="font-extrabold text-[#17201c] block truncate max-w-[180px]">
                        {vs.venueName}
                      </span>
                      <span className="text-[11px] text-[#78857c]">
                        {vs.matchesPlayed} matches played
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-[#487418]">
                        {vs.wins}W - {vs.losses}L
                      </span>
                      <span className="text-[10px] text-[#818e84] block font-bold">
                        {vs.winRate}% Win Rate
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* DETAILS GRID */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Info Column (2 cols) */}
          <div className="md:col-span-2 space-y-6">
            {/* Recent Match History */}
            <div className="rounded-[28px] border border-[#e1e7df] bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#75a62b]" />
                  <h2 className="text-sm font-extrabold text-[#17201c]">
                    Recent Match History
                  </h2>
                </div>
                <span className="text-xs text-[#7e8b82]">
                  {stats.recentMatches?.length || 0} completed
                </span>
              </div>

              {stats.recentMatches && stats.recentMatches.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentMatches.map((m: any) => (
                    <div
                      key={m.matchId}
                      className="flex items-center justify-between rounded-2xl border border-[#edf1ea] bg-[#f9faf7] p-3.5 transition hover:bg-[#f4f7f2]"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-12 items-center justify-center rounded-xl text-xs font-black ${
                            m.outcome === "WIN"
                              ? "bg-[#eaf7d5] text-[#3e6813] border border-[#c6e99c]"
                              : m.outcome === "LOSS"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {m.outcome}
                        </span>

                        <div>
                          <Link
                            href={`/friendly-matches/${m.matchId}`}
                            className="font-bold text-xs sm:text-sm text-[#17201c] hover:underline"
                          >
                            {m.title}
                          </Link>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#717e75] mt-0.5">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-[#78a72b]" />
                              {m.venueName}
                            </span>
                            <span>•</span>
                            <span>{m.date ? String(m.date).slice(0, 10) : ""}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-xs sm:text-sm text-[#17201c]">
                          {m.score}
                        </span>
                        <span className="block text-[10px] text-[#7d8a80] font-semibold">
                          {m.format || "Doubles"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#dce3d9] p-6 text-center text-xs text-[#7e8b82]">
                  No completed matches recorded yet. Play open matches to build history!
                </div>
              )}
            </div>

            {/* Verified Player Reviews & Sportsmanship Ratings */}
            <div className="rounded-[28px] border border-[#e1e7df] bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  <h2 className="text-sm font-extrabold text-[#17201c]">
                    Peer Ratings & Sportsmanship
                  </h2>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  <Star className="h-3.5 w-3.5 fill-amber-500" />
                  <span>{stats.averageRating} ★</span>
                  <span className="text-amber-700/70 font-semibold">
                    ({stats.ratingsCount} reviews)
                  </span>
                </div>
              </div>

              {/* Rating Distribution Bars */}
              {stats.ratingsCount > 0 && (
                <div className="mb-6 space-y-1.5 bg-[#f9faf7] rounded-2xl p-4 border border-[#edf1ea]">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = stats.ratingDistribution?.[stars as 1 | 2 | 3 | 4 | 5] || 0;
                    const pct = stats.ratingsCount > 0 ? (count / stats.ratingsCount) * 100 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-2 text-xs">
                        <span className="w-7 text-right font-bold text-[#647167]">
                          {stars} ★
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-[#e8eee6] overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-6 text-left text-[11px] text-[#818f85] font-semibold">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reviews List */}
              {reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviewsData.reviews.map((rev: any) => (
                    <div
                      key={rev.id}
                      className="rounded-2xl border border-[#edf1ea] bg-[#f9faf7] p-4 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#17201c] text-xs font-black text-[#a8e63d]">
                            {rev.reviewer?.profile?.displayName
                              ? rev.reviewer.profile.displayName.slice(0, 2).toUpperCase()
                              : "P"}
                          </div>
                          <div>
                            <span className="font-extrabold text-xs sm:text-sm text-[#17201c] block">
                              {rev.reviewer?.profile?.displayName || rev.reviewer?.name || "Participant"}
                            </span>
                            <span className="text-[11px] text-[#738077]">
                              Verified match at {rev.match?.venue?.name || "venue"} •{" "}
                              {rev.createdAt ? String(rev.createdAt).slice(0, 10) : ""}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center text-amber-500 text-xs font-black">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < rev.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-300"
                                }`}
                              />
                            ))}
                          </div>
                          <button
                            onClick={() => handleOpenReport(rev.id)}
                            title="Report abusive comment"
                            className="text-[#96a49a] hover:text-red-500 transition p-1"
                          >
                            <Flag className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {rev.comment && (
                        <p className="mt-3 text-xs sm:text-sm text-[#38433d] leading-relaxed italic bg-white/70 p-3 rounded-xl border border-[#e8eee5]">
                          "{rev.comment}"
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Reviews Pagination */}
                  {reviewsData.pagination?.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-3 border-t border-[#edf1ea]">
                      <span className="text-xs text-[#717e75]">
                        Page {reviewsData.pagination.page} of {reviewsData.pagination.totalPages}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={reviewsPage <= 1}
                          onClick={() => setReviewsPage((p) => Math.max(1, p - 1))}
                          className="rounded-xl border border-[#d8e0d6] bg-white px-3 py-1 text-xs font-bold disabled:opacity-40"
                        >
                          Prev
                        </button>
                        <button
                          disabled={reviewsPage >= reviewsData.pagination.totalPages}
                          onClick={() => setReviewsPage((p) => p + 1)}
                          className="rounded-xl border border-[#d8e0d6] bg-white px-3 py-1 text-xs font-bold disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#dce3d9] p-6 text-center text-xs text-[#7e8b82]">
                  No reviews submitted for this player yet.
                </div>
              )}
            </div>

            {/* Bio & Playing Notes */}
            <div className="rounded-[28px] border border-[#e1e7df] bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#637067] mb-3">
                Player Bio & Sparring Style
              </h2>
              <p className="text-xs sm:text-sm text-[#3b4640] leading-relaxed whitespace-pre-line">
                {player.bio ||
                  "Badminton enthusiast actively looking for friendly matches, sparring drills, and doubles sessions."}
              </p>
            </div>
          </div>

          {/* Sidebar Column (1 col) */}
          <div className="space-y-6">
            {/* Preferred Venue Card */}
            <div className="rounded-[28px] border border-[#e1e7df] bg-white p-6 shadow-sm space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#647167] block">
                Home Court
              </span>
              <h3 className="text-base font-extrabold text-[#17201c]">
                {player.homeVenue?.name || "Flexible across Hanoi"}
              </h3>
              <p className="text-xs text-[#6a776e]">
                {player.homeVenue?.address || player.homeVenue?.location || "No fixed home venue specified"}
              </p>
              {player.homeVenueId && (
                <Link
                  href={`/courts/${player.homeVenueId}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#55841c] hover:underline pt-1"
                >
                  View Venue Details & Courts
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>

            {/* Availability Schedule Card */}
            <div className="rounded-[28px] border border-[#e1e7df] bg-white p-6 shadow-sm space-y-3 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#647167] block">
                Availability Schedule
              </span>
              <div>
                <span className="text-[#849287] block font-medium">Preferred Days:</span>
                <span className="font-bold text-[#17201c]">
                  {player.preferredDays && player.preferredDays.length > 0
                    ? player.preferredDays
                        .map((d: string) => d.charAt(0) + d.slice(1).toLowerCase())
                        .join(", ")
                    : "Flexible (Any Day)"}
                </span>
              </div>
              <div className="pt-2 border-t border-[#edf1ea]">
                <span className="text-[#849287] block font-medium">Typical Playing Hours:</span>
                <span className="font-bold text-[#17201c]">
                  {player.preferredTimeStart || "18:00"} - {player.preferredTimeEnd || "21:00"}
                </span>
              </div>
            </div>

            {/* Connect / Actions */}
            <div className="rounded-[28px] border border-[#e1e7df] bg-white p-6 shadow-sm space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#647167] block">
                Team Up & Spar
              </span>
              <p className="text-xs text-[#627066] leading-relaxed">
                Want to play badminton with {player.displayName}? Browse open matches or host a session at their home court!
              </p>
              <Link
                href="/friendly-matches/create"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#a8e63d] py-3 text-xs font-black text-[#17201c] shadow transition hover:bg-[#b8ef59]"
              >
                Host Match & Invite
              </Link>
              <Link
                href="/friendly-matches"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#f0fae1] border border-[#a8e63d] py-2.5 text-xs font-bold text-[#355a10] hover:bg-[#e4f6cb] transition"
              >
                Discover Compatible Open Matches
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* REPORT MODAL */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-red-500" />
                <h3 className="text-base font-extrabold text-[#17201c]">Report Review</h3>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="rounded-full p-1 text-[#828f85] hover:bg-[#edf1ea]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-[#667469] mb-4">
              Our moderation team reviews reported comments for abusive language, hate speech, or harassment.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#17201c] block mb-1">
                  Reason for reporting *
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full rounded-xl border border-[#d8e0d6] bg-[#f9faf7] p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">Select a reason...</option>
                  <option value="Offensive or abusive language">Offensive or abusive language</option>
                  <option value="Harassment or personal attack">Harassment or personal attack</option>
                  <option value="False information or fake match">False information or fake match</option>
                  <option value="Spam or advertising">Spam or advertising</option>
                  <option value="Other violation">Other violation</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#17201c] block mb-1">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide context for our review team..."
                  rows={3}
                  className="w-full rounded-xl border border-[#d8e0d6] bg-[#f9faf7] p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="flex-1 rounded-xl border border-[#d8e0d6] py-2.5 text-xs font-bold text-[#556258] hover:bg-[#edf1ea]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingReport || !reportReason}
                  onClick={handleSubmitReport}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition shadow"
                >
                  {isSubmittingReport ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
