"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { LoginModal } from "@/components/LoginModal";
import { useApp } from "@/context/AppContext";
import {
  Trophy,
  Medal,
  Award,
  Sparkles,
  MapPin,
  TrendingUp,
  Flame,
  Star,
  Users,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

export default function LeaderboardsPage() {
  const { user } = useApp();

  const [metric, setMetric] = useState<"wins" | "winRate" | "rating" | "activity">("wins");
  const [period, setPeriod] = useState<"all-time" | "monthly" | "weekly">("all-time");
  const [skillLevel, setSkillLevel] = useState<string>("ALL");
  const [venueId, setVenueId] = useState<string>("ALL");
  const [venues, setVenues] = useState<any[]>([]);

  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Load venues for dropdown filter
  useEffect(() => {
    async function loadVenues() {
      try {
        const res = await fetch("/api/venues");
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.venues)) {
          setVenues(data.venues);
        }
      } catch (err) {
        console.warn("Failed to load venues for filter:", err);
      }
    }
    loadVenues();
  }, []);

  // Fetch leaderboard data
  useEffect(() => {
    async function fetchLeaderboard() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const params = new URLSearchParams();
        params.set("metric", metric);
        params.set("period", period);
        if (skillLevel !== "ALL") params.set("skillLevel", skillLevel);
        if (venueId !== "ALL") params.set("venueId", venueId);
        params.set("page", String(page));
        params.set("limit", "15");

        const res = await fetch(`/api/leaderboards?${params.toString()}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setLeaderboardData(data);
        } else {
          setErrorMessage(data.message || "Failed to load leaderboard.");
        }
      } catch (err: any) {
        console.error("Leaderboard fetch error:", err);
        setErrorMessage("Network error occurred while fetching leaderboard.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeaderboard();
  }, [metric, period, skillLevel, venueId, page]);

  const handleMetricChange = (newMetric: "wins" | "winRate" | "rating" | "activity") => {
    setMetric(newMetric);
    setPage(1);
  };

  const handlePeriodChange = (newPeriod: "all-time" | "monthly" | "weekly") => {
    setPeriod(newPeriod);
    setPage(1);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-400 text-white shadow-md shadow-amber-400/30">
          <Trophy className="h-5 w-5 fill-white" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-300 text-slate-700 shadow-md">
          <Medal className="h-5 w-5 fill-slate-500" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-md">
          <Award className="h-5 w-5" />
        </div>
      );
    }
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#edf1ea] text-xs font-black text-[#56635a]">
        #{rank}
      </span>
    );
  };

  return (
    <main className="min-h-screen bg-[#F7F8F4] text-[#17201C] pb-32">
      <Navbar />
      <LoginModal />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 sm:pt-10">
        {/* HERO HEADER */}
        <div className="relative overflow-hidden rounded-[28px] sm:rounded-[36px] bg-gradient-to-br from-[#17201c] via-[#213229] to-[#121c17] p-6 sm:p-10 text-white shadow-xl mb-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-[#a8e63d]/15 blur-3xl" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#a8e63d]/20 border border-[#a8e63d]/30 px-3 py-1 text-xs font-bold text-[#c8f57f] mb-3">
                <Trophy className="h-3.5 w-3.5 text-[#a8e63d]" />
                Community Standings
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Player Leaderboards
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-[#cbd6cd] max-w-xl">
                Track top badminton performers across verified community matches, win rates, and sportsmanship ratings.
              </p>
            </div>

            {/* Time Period Selector Tabs */}
            <div className="flex items-center rounded-2xl bg-white/10 p-1.5 backdrop-blur border border-white/10 self-start md:self-auto">
              {(["all-time", "monthly", "weekly"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition capitalize ${
                    period === p
                      ? "bg-[#a8e63d] text-[#17201c] shadow-sm"
                      : "text-[#dce4dd] hover:text-white"
                  }`}
                >
                  {p === "all-time" ? "All Time" : p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* METRICS & FILTERS BAR */}
        <div className="mb-6 space-y-4">
          {/* Primary Metric Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: "wins", label: "Most Wins", icon: Trophy, desc: "Total match victories" },
              { id: "winRate", label: "Win Rate", icon: TrendingUp, desc: "Min 3 matches required" },
              { id: "rating", label: "Top Rated", icon: Star, desc: "Min 3 reviews required" },
              { id: "activity", label: "Most Active", icon: Flame, desc: "Matches completed" },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = metric === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleMetricChange(tab.id as any)}
                  className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition ${
                    isActive
                      ? "border-[#a8e63d] bg-white text-[#17201c] shadow-md ring-2 ring-[#a8e63d]/40"
                      : "border-[#e3e8e1] bg-white/70 text-[#67746b] hover:bg-white hover:border-[#ccd5c9]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${isActive ? "text-[#5e8b1d]" : "text-[#7f8e83]"}`} />
                    <span className="text-xs font-black">{tab.label}</span>
                  </div>
                  <span className="text-[10px] text-[#859288]">{tab.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Secondary Dropdown Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e1e7df] bg-white p-3.5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#647268]">
                <Filter className="h-3.5 w-3.5" />
                <span>Filters:</span>
              </div>

              {/* Skill Level Filter */}
              <select
                value={skillLevel}
                onChange={(e) => {
                  setSkillLevel(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-[#d8e0d6] bg-[#f9faf7] px-3 py-1.5 text-xs font-bold text-[#17201c] focus:outline-none focus:ring-2 focus:ring-[#a8e63d]"
              >
                <option value="ALL">All Skill Levels</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
                <option value="PROFESSIONAL">Professional</option>
              </select>

              {/* Venue Filter */}
              <select
                value={venueId}
                onChange={(e) => {
                  setVenueId(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-[#d8e0d6] bg-[#f9faf7] px-3 py-1.5 text-xs font-bold text-[#17201c] focus:outline-none focus:ring-2 focus:ring-[#a8e63d] max-w-[200px] truncate"
              >
                <option value="ALL">All Venues</option>
                {venues.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Criteria & Threshold Info */}
            {leaderboardData?.criteria && (
              <div className="text-[11px] font-semibold text-[#738278] flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-[#5e8b1d]" />
                <span>{leaderboardData.criteria.thresholdDescription}</span>
              </div>
            )}
          </div>
        </div>

        {/* LEADERBOARD TABLE / LIST */}
        <div className="overflow-hidden rounded-[26px] border border-[#e1e7df] bg-white shadow-sm">
          {isLoading ? (
            <div className="p-16 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#a8e63d] border-t-transparent" />
              <p className="mt-3 text-xs font-bold text-[#7d8b81]">Calculating live rankings...</p>
            </div>
          ) : errorMessage ? (
            <div className="p-12 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
              <p className="text-xs font-bold text-red-600">{errorMessage}</p>
            </div>
          ) : !leaderboardData?.entries || leaderboardData.entries.length === 0 ? (
            <div className="p-16 text-center">
              <Trophy className="mx-auto h-10 w-10 text-[#a4b2a8] mb-3" />
              <h3 className="text-sm font-bold text-[#17201c]">No players found</h3>
              <p className="mt-1 text-xs text-[#7d8b81] max-w-sm mx-auto">
                No players match the selected filters or have completed matches in this period yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#edf1ea]">
              {leaderboardData.entries.map((entry: any) => {
                const isCurrentUser = user?.id && entry.userId === user.id;

                return (
                  <div
                    key={entry.userId}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 transition hover:bg-[#f9faf7] ${
                      isCurrentUser ? "bg-[#f2fadc]/50" : ""
                    } ${!entry.isEligible ? "opacity-60" : ""}`}
                  >
                    {/* Left: Rank & Player Profile */}
                    <div className="flex items-center gap-3.5">
                      {getRankBadge(entry.rank)}

                      {/* Avatar / Initials */}
                      <Link
                        href={`/players/${entry.userId}`}
                        className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#17201c] to-[#34483b] text-sm font-black text-[#a8e63d] shadow-sm hover:scale-105 transition"
                      >
                        {entry.displayName ? entry.displayName.slice(0, 2).toUpperCase() : "P"}
                      </Link>

                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/players/${entry.userId}`}
                            className="text-sm font-extrabold text-[#17201c] hover:underline hover:text-[#4a7217] transition flex items-center gap-1.5"
                          >
                            <span>{entry.displayName}</span>
                            <ChevronRight className="h-3 w-3 text-[#87968c]" />
                          </Link>
                          {isCurrentUser && (
                            <span className="rounded-md bg-[#a8e63d] px-1.5 py-0.5 text-[9px] font-black text-[#17201c]">
                              YOU
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#717f75]">
                          <span className="rounded-full bg-[#eef3eb] px-2 py-0.5 font-bold text-[#455c4d]">
                            {entry.skillLevel}
                          </span>
                          {entry.homeVenueName && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-[#79a92c]" />
                              {entry.homeVenueName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Scores & Stats Breakdown */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#edf1ea]">
                      {/* Secondary metrics */}
                      <div className="flex items-center gap-4 text-center text-xs">
                        <div>
                          <span className="block font-black text-[#17201c]">
                            {entry.matchesPlayed}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-[#839187]">
                            Played
                          </span>
                        </div>
                        <div>
                          <span className="block font-black text-[#487317]">
                            {entry.wins}W - {entry.losses}L
                          </span>
                          <span className="text-[10px] uppercase font-bold text-[#839187]">
                            Record
                          </span>
                        </div>
                        <div>
                          <span className="block font-black text-[#17201c]">
                            {entry.winRate}%
                          </span>
                          <span className="text-[10px] uppercase font-bold text-[#839187]">
                            Win Rate
                          </span>
                        </div>
                        {entry.ratingsCount > 0 && (
                          <div>
                            <span className="flex items-center justify-center gap-1 font-black text-amber-600">
                              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                              {entry.averageRating}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-[#839187]">
                              ({entry.ratingsCount})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Primary Ranking Metric Display */}
                      <div className="text-right min-w-[90px]">
                        <span className="block text-base sm:text-lg font-black text-[#17201c]">
                          {entry.scoreDisplay}
                        </span>
                        {!entry.isEligible && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 rounded-md px-1 py-0.5">
                            Under Threshold
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {leaderboardData?.pagination && leaderboardData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#edf1ea] px-6 py-4 bg-[#f9faf7]">
              <span className="text-xs text-[#717f75]">
                Showing page {leaderboardData.pagination.page} of {leaderboardData.pagination.totalPages} ({leaderboardData.pagination.total} players)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-xl border border-[#d8e0d6] bg-white px-3 py-1.5 text-xs font-bold text-[#17201c] disabled:opacity-40 hover:bg-[#edf1ea] transition"
                >
                  Previous
                </button>
                <button
                  disabled={page >= leaderboardData.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl border border-[#d8e0d6] bg-white px-3 py-1.5 text-xs font-bold text-[#17201c] disabled:opacity-40 hover:bg-[#edf1ea] transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DISCLAIMER & TRANSPARENCY NOTICE */}
        <div className="mt-8 rounded-2xl border border-[#e1e7df] bg-white p-4 sm:p-5 shadow-sm text-xs text-[#6e7d73] flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-[#88998d] shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-[#17201c]">About Rankings & Fair Play</h4>
            <p className="mt-0.5 leading-relaxed">
              {leaderboardData?.disclaimer ||
                "Rankings are calculated dynamically from verified community matches on BookMeBadminton and are not an official badminton federation rating."}
              {" "}Tie-breakers are resolved deterministically using win percentage, matches completed, average sportsmanship rating, and player registration age.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
