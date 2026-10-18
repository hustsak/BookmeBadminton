"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Navbar } from "@/components/Navbar";
import { LoginModal } from "@/components/LoginModal";
import { useApp } from "@/context/AppContext";
import {
  Users,
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  ShieldCheck,
  Check,
  CheckCircle2,
  X,
  AlertCircle,
  ArrowRight,
  Flame,
  Award,
  Filter,
  RefreshCw,
  Trophy,
  Zap,
  ChevronRight,
  UserCheck,
} from "lucide-react";

export default function FriendlyMatchesPage() {
  const {
    user,
    openLoginModal,
    venues,
    refreshMatches,
  } = useApp();

  const [matches, setMatches] = useState<any[]>([]);
  const [recommendedMatches, setRecommendedMatches] = useState<any[]>([]);
  const [recommendedPlayers, setRecommendedPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<string>("ALL");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [styleFilter, setStyleFilter] = useState<string>("ALL"); // "ALL", "Doubles", "Singles"
  const [dateFilter, setDateFilter] = useState<string>("ALL"); // "ALL", "TODAY", "TOMORROW", "CUSTOM"
  const [customDate, setCustomDate] = useState<string>("");
  const [openOnly, setOpenOnly] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchMatchesFromApi = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/matches", {
        headers: user?.id ? { "x-user-id": String(user.id) } : {},
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.matches)) {
        setMatches(data.matches);
      } else {
        setLoadError(data.message || "Could not retrieve matches.");
      }
    } catch (err) {
      console.error("Error loading matches:", err);
      setLoadError("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    if (!user?.id) {
      setRecommendedMatches([]);
      setRecommendedPlayers([]);
      return;
    }
    setLoadingRecommendations(true);
    try {
      // 1. Match recommendations
      const matchRes = await fetch("/api/matches/recommendations", {
        headers: { "x-user-id": String(user.id) },
      });
      const matchData = await matchRes.json();
      if (matchRes.ok && matchData.success) {
        setRecommendedMatches(matchData.recommendations || []);
      }

      // 2. Player recommendations
      const playerRes = await fetch("/api/players/recommendations?limit=6", {
        headers: { "x-user-id": String(user.id) },
      });
      const playerData = await playerRes.json();
      if (playerRes.ok && playerData.success) {
        setRecommendedPlayers(playerData.recommendations || []);
      }
    } catch (e) {
      console.error("Failed to load recommendations:", e);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  useEffect(() => {
    fetchMatchesFromApi();
    fetchRecommendations();
  }, [user?.id]);

  // Compute dates for quick filter
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const tomorrowStr = useMemo(
    () => new Date(Date.now() + 86400000).toISOString().split("T")[0],
    []
  );

  // Filtered Matches
  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      // 1. Text Search
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        match.title.toLowerCase().includes(searchLower) ||
        match.venue?.name?.toLowerCase().includes(searchLower) ||
        match.venue?.location?.toLowerCase().includes(searchLower) ||
        match.creator?.name?.toLowerCase().includes(searchLower);

      // 2. Venue filter
      const matchesVenue =
        selectedVenue === "ALL" ||
        String(match.venueId) === selectedVenue ||
        match.venue?.name === selectedVenue;

      // 3. Level filter
      const matchesLevel =
        levelFilter === "ALL" ||
        (match.skillLevelFormatted &&
          match.skillLevelFormatted.toLowerCase() === levelFilter.toLowerCase()) ||
        match.skillLevel.toLowerCase() === levelFilter.toLowerCase();

      // 4. Playing style / format filter
      const matchesStyle =
        styleFilter === "ALL" ||
        (match.format && match.format.toLowerCase().includes(styleFilter.toLowerCase()));

      // 5. Date filter
      const matchDateStr = match.date ? match.date.slice(0, 10) : "";
      let matchesDate = true;
      if (dateFilter === "TODAY") {
        matchesDate = matchDateStr === todayStr;
      } else if (dateFilter === "TOMORROW") {
        matchesDate = matchDateStr === tomorrowStr;
      } else if (dateFilter === "CUSTOM" && customDate) {
        matchesDate = matchDateStr === customDate;
      }

      // 6. Open spots only
      const matchesOpen =
        !openOnly || (match.status === "OPEN" && match.remainingSpots > 0);

      return (
        matchesSearch &&
        matchesVenue &&
        matchesLevel &&
        matchesStyle &&
        matchesDate &&
        matchesOpen
      );
    });
  }, [
    matches,
    search,
    selectedVenue,
    levelFilter,
    styleFilter,
    dateFilter,
    customDate,
    openOnly,
    todayStr,
    tomorrowStr,
  ]);

  // Quick Join Action
  const handleQuickJoin = async (matchId: number) => {
    if (!user) {
      openLoginModal();
      return;
    }

    setActionLoadingId(String(matchId));
    try {
      const res = await fetch(`/api/matches/${matchId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id),
        },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Spot confirmed! You have joined this match.");
        await fetchMatchesFromApi();
        await fetchRecommendations();
        await refreshMatches();
      } else {
        showToast(data.message || "Failed to join match.");
      }
    } catch (e) {
      showToast("Network error. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const clearAllFilters = () => {
    setSearch("");
    setSelectedVenue("ALL");
    setLevelFilter("ALL");
    setStyleFilter("ALL");
    setDateFilter("ALL");
    setCustomDate("");
    setOpenOnly(false);
  };

  return (
    <main className="min-h-screen bg-[#F7F8F4] text-[#17201C] pb-32">
      <Navbar />
      <LoginModal />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border border-[#d6dfd3] bg-[#17201c] px-4 py-3 text-xs font-bold text-white shadow-2xl"
          >
            <Sparkles className="h-4 w-4 text-[#a8e63d]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO SECTION */}
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <div className="relative overflow-hidden rounded-[28px] sm:rounded-[36px] bg-gradient-to-br from-[#17201c] via-[#213128] to-[#131d17] p-6 sm:p-12 text-white shadow-xl">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#a8e63d]/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-[#80b52e]/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-xs font-semibold backdrop-blur">
                <Flame className="h-3.5 w-3.5 text-[#a8e63d]" />
                <span className="text-[#e2f5b8]">Sparring & Matchmaking Hub</span>
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl text-white">
                Find a Friendly Match<span className="text-[#a8e63d]">.</span>
              </h1>
              <p className="mt-2.5 text-xs sm:text-base leading-relaxed text-[#c6d1c9]">
                Missing a 4th player for doubles or looking for singles sparring?
                Discover open games across Hanoi courts, reserve your spot instantly,
                and enjoy friendly rallies!
              </p>

              {/* Quick Perks */}
              <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-[#a9b7ad]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#a8e63d]" />
                  <span>Smart Compatibility Scoring</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#a8e63d]" />
                  <span>Confirmed Court Badges</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#a8e63d]" />
                  <span>Fair Split Costs</span>
                </div>
              </div>
            </div>

            {/* Action Box */}
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col shrink-0">
              <Link
                href="/friendly-matches/create"
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#a8e63d] px-7 py-4 text-sm font-black text-[#17201c] shadow-lg transition hover:bg-[#b8ef59] hover:scale-[1.02] active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Host an Open Match
              </Link>

              <Link
                href="/players"
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-xs font-bold text-white backdrop-blur hover:bg-white/20 transition active:scale-95"
              >
                <Users className="h-4 w-4 text-[#a8e63d]" />
                Browse Badminton Players
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* RECOMMENDED MATCHES SECTION (IF LOGGED IN) */}
      {user && (
        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#55811b]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Personalized Recommendations</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#17201c]">
                Matches Recommended For You
              </h2>
            </div>
            <Link
              href="/profile"
              className="text-xs font-bold text-[#55811b] hover:text-[#385811] flex items-center gap-1"
            >
              Update Match Preferences <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loadingRecommendations ? (
            <div className="p-8 text-center rounded-[28px] border border-[#e1e7df] bg-white">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#a8e63d] border-t-transparent mx-auto" />
              <p className="mt-2 text-xs font-semibold text-[#7d8b81]">Analyzing compatibility scores...</p>
            </div>
          ) : recommendedMatches.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommendedMatches.slice(0, 3).map((rec: any) => {
                const match = rec.match;
                const score = rec.score || 0;
                const reasons = rec.reasons || [];
                const isCreator = match.creatorId === user.id;
                const isJoined = match.participants?.some(
                  (p: any) => p.userId === user.id && p.status === "JOINED"
                );

                return (
                  <div
                    key={match.id}
                    className="relative flex flex-col justify-between rounded-[26px] border border-[#dce3d8] bg-white p-5 shadow-sm transition hover:shadow-md hover:border-[#a8e63d]"
                  >
                    <div>
                      {/* Top Match Score & Status */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#f0fae1] border border-[#a8e63d] px-2.5 py-0.5 text-xs font-black text-[#375e11]">
                          <Zap className="h-3 w-3 text-[#55811b]" />
                          {score}% Match
                        </span>

                        <span className="rounded-full bg-[#f4f7f2] px-2 py-0.5 text-[10px] font-bold text-[#647268]">
                          {match.remainingSpots} spot(s) left
                        </span>
                      </div>

                      <Link href={`/friendly-matches/${match.id}`} className="group">
                        <h3 className="text-sm font-extrabold text-[#17201c] group-hover:text-[#527d19] transition line-clamp-1">
                          {match.title}
                        </h3>
                      </Link>

                      {/* Location & Time */}
                      <div className="mt-2.5 space-y-1 text-xs text-[#626e65]">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="h-3.5 w-3.5 text-[#73a229] shrink-0" />
                          <span className="font-semibold text-[#17201c] truncate">{match.venue?.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[#556157]">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-[#73a229]" />
                            <span>{match.date ? match.date.slice(0, 10) : ""}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-[#73a229]" />
                            <span>{match.startTime}</span>
                          </div>
                        </div>
                      </div>

                      {/* Reasons tags */}
                      {reasons.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {reasons.slice(0, 2).map((r: string, idx: number) => (
                            <span
                              key={idx}
                              className="rounded-lg bg-[#f5f8f3] border border-[#e1e9dd] px-2 py-0.5 text-[10px] font-semibold text-[#446618]"
                            >
                              ✓ {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 pt-3 border-t border-[#edf1ea] flex items-center gap-2">
                      <Link
                        href={`/friendly-matches/${match.id}`}
                        className="flex-1 text-center py-2 text-xs font-bold text-[#17201c] bg-[#f8faf7] hover:bg-[#ebf2e7] rounded-xl transition border border-[#d6dfd2]"
                      >
                        Details
                      </Link>

                      {isCreator ? (
                        <span className="text-[11px] font-bold text-[#456d17] px-3 py-2 bg-[#f0fae1] rounded-xl border border-[#a8e63d]">
                          Host (You)
                        </span>
                      ) : isJoined ? (
                        <span className="text-[11px] font-bold text-emerald-800 px-3 py-2 bg-emerald-100 rounded-xl">
                          Joined
                        </span>
                      ) : (
                        <button
                          disabled={actionLoadingId === String(match.id)}
                          onClick={() => handleQuickJoin(match.id)}
                          className="flex items-center gap-1 bg-[#a8e63d] px-4 py-2 rounded-xl text-xs font-black text-[#17201c] hover:bg-[#b8ef59] transition active:scale-95 disabled:opacity-50"
                        >
                          {actionLoadingId === String(match.id) ? "Joining..." : "Quick Join"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-[28px] border border-[#e1e7df] bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f0fae1] text-[#4f7b18]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#17201c]">No direct match recommendations yet</p>
                  <p className="text-[11px] text-[#76847a]">
                    Complete your preferred venues and skill level in your profile to discover matches tailored for you!
                  </p>
                </div>
              </div>
              <Link
                href="/profile"
                className="shrink-0 rounded-xl bg-[#17201c] px-4 py-2 text-xs font-bold text-[#a8e63d] hover:bg-[#2c3a32] transition"
              >
                Set Up Profile
              </Link>
            </div>
          )}
        </section>
      )}

      {/* PLAYERS YOU MAY ENJOY PLAYING WITH */}
      {user && recommendedPlayers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#55811b]">
                <Users className="h-3.5 w-3.5" />
                <span>Compatible Sparring Partners</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#17201c]">
                Players You May Enjoy Playing With
              </h2>
            </div>
            <Link
              href="/players"
              className="text-xs font-bold text-[#55811b] hover:text-[#385811] flex items-center gap-1"
            >
              Browse All Players ({recommendedPlayers.length}+) <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendedPlayers.map((rec: any) => {
              const player = rec.player;
              const score = rec.score || 0;
              const reasons = rec.reasons || [];

              return (
                <div
                  key={player.id}
                  className="rounded-[26px] border border-[#dce3d8] bg-white p-5 shadow-sm transition hover:shadow-md hover:border-[#a8e63d] flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Avatar, Name, Compatibility Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full border-2 border-[#a8e63d] overflow-hidden bg-white/10 shrink-0">
                          {player.avatar ? (
                            <img
                              src={player.avatar}
                              alt={player.displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center font-bold text-sm bg-[#17201c] text-[#a8e63d]">
                              {(player.displayName || "P").charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <Link href={`/players/${player.userId || player.id}`} className="group">
                            <h4 className="text-sm font-extrabold text-[#17201c] group-hover:text-[#527d19] transition">
                              {player.displayName}
                            </h4>
                          </Link>
                          <span className="inline-block rounded-full bg-[#f0fae1] border border-[#a8e63d]/60 px-2 py-0.5 text-[10px] font-bold text-[#3d6715] mt-0.5">
                            {player.skillLevel}
                          </span>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 rounded-full bg-[#17201c] px-2.5 py-1 text-[11px] font-black text-[#a8e63d] shadow-sm">
                        <Zap className="h-3 w-3" />
                        {score}%
                      </span>
                    </div>

                    {/* Explanations */}
                    <div className="mt-3 space-y-1">
                      {reasons.map((r: string, idx: number) => (
                        <p key={idx} className="text-[11px] text-[#556359] flex items-center gap-1.5">
                          <Check className="h-3 w-3 text-[#55811b] shrink-0" />
                          <span className="line-clamp-1">{r}</span>
                        </p>
                      ))}
                    </div>

                    {/* Meta: Style & Home Venue */}
                    <div className="mt-3 flex items-center justify-between text-[11px] text-[#717e75] pt-2 border-t border-[#edf1ea]">
                      <span>Style: <strong className="text-[#17201c]">{player.playingStyle}</strong></span>
                      {player.homeVenue && (
                        <span className="truncate max-w-[130px] font-medium text-[#17201c]">
                          📍 {player.homeVenue.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Link to profile */}
                  <div className="mt-4 pt-3 border-t border-[#edf1ea]">
                    <Link
                      href={`/players/${player.userId || player.id}`}
                      className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-[#f5f8f3] hover:bg-[#eaf4df] py-2 text-xs font-bold text-[#17201c] transition border border-[#d6dfd2]"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-[#55811b]" />
                      <span>View Player Profile</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* FILTER & DISCOVERY CONTROLS */}
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <div className="mb-3">
          <h2 className="text-xl sm:text-2xl font-black text-[#17201c]">
            Explore All Friendly Matches
          </h2>
          <p className="text-xs text-[#717e75]">
            Filter by skill level, playing style format, or your neighborhood venue.
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-[28px] border border-[#e1e7df] bg-white p-5 shadow-sm">
          {/* Top row: Search input & Venue selection */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="flex flex-1 items-center gap-2.5 rounded-2xl bg-[#f5f7f3] px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-[#8e9891]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, venue, or host name..."
                className="w-full bg-transparent text-xs sm:text-sm outline-none placeholder:text-[#9ea8a0]"
              />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search">
                  <X className="h-4 w-4 text-[#8e9891]" />
                </button>
              )}
            </div>

            {/* Venue Dropdown */}
            <div className="sm:w-64">
              <select
                value={selectedVenue}
                onChange={(e) => setSelectedVenue(e.target.value)}
                className="w-full rounded-2xl border border-[#e3e8e1] bg-[#f8faf7] px-4 py-3 text-xs sm:text-sm font-semibold text-[#17201c] outline-none"
              >
                <option value="ALL">All Venues</option>
                {venues.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bottom row: Date Filters, Skill Level, Playing Style, Spots Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#edf1eb]">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Date Filters */}
              <div className="flex rounded-full border border-[#e3e8e1] bg-[#f7f8f4] p-1 font-semibold text-[#667269]">
                <button
                  onClick={() => setDateFilter("ALL")}
                  className={`rounded-full px-3 py-1 transition ${
                    dateFilter === "ALL"
                      ? "bg-[#17201c] text-white shadow-sm"
                      : "hover:text-[#17201c]"
                  }`}
                >
                  Any Date
                </button>
                <button
                  onClick={() => setDateFilter("TODAY")}
                  className={`rounded-full px-3 py-1 transition ${
                    dateFilter === "TODAY"
                      ? "bg-[#17201c] text-white shadow-sm"
                      : "hover:text-[#17201c]"
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setDateFilter("TOMORROW")}
                  className={`rounded-full px-3 py-1 transition ${
                    dateFilter === "TOMORROW"
                      ? "bg-[#17201c] text-white shadow-sm"
                      : "hover:text-[#17201c]"
                  }`}
                >
                  Tomorrow
                </button>
              </div>

              {/* Custom Date Input */}
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  if (e.target.value) setDateFilter("CUSTOM");
                }}
                className="rounded-full border border-[#e3e8e1] bg-white px-3 py-1.5 text-xs font-semibold text-[#3a443e] outline-none"
              />

              {/* Skill Level Dropdown */}
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="rounded-full border border-[#e3e8e1] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#3a443e] outline-none"
              >
                <option value="ALL">All Skill Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>

              {/* Playing Style Format Dropdown */}
              <select
                value={styleFilter}
                onChange={(e) => setStyleFilter(e.target.value)}
                className="rounded-full border border-[#e3e8e1] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#3a443e] outline-none"
              >
                <option value="ALL">All Styles / Formats</option>
                <option value="Doubles">Doubles</option>
                <option value="Singles">Singles</option>
              </select>

              {/* Available Spots Toggle */}
              <button
                onClick={() => setOpenOnly(!openOnly)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-bold transition ${
                  openOnly
                    ? "border-[#a8e63d] bg-[#f0fae1] text-[#487317]"
                    : "border-[#e3e8e1] bg-white text-[#69746c]"
                }`}
              >
                <span
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                    openOnly ? "bg-[#a8e63d]" : "border border-[#bdc6be]"
                  }`}
                >
                  {openOnly && <Check className="h-2.5 w-2.5 text-[#17201c]" />}
                </span>
                Spots Available Only
              </button>
            </div>

            {/* Refresh / Clear Button */}
            <div className="flex items-center gap-2">
              {(search ||
                selectedVenue !== "ALL" ||
                levelFilter !== "ALL" ||
                styleFilter !== "ALL" ||
                dateFilter !== "ALL" ||
                openOnly) && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-bold text-[#7a867f] hover:text-[#17201c] underline underline-offset-4 transition"
                >
                  Reset Filters
                </button>
              )}

              <button
                onClick={() => {
                  fetchMatchesFromApi();
                  fetchRecommendations();
                }}
                title="Refresh matches"
                className="rounded-full p-2 text-[#7a867f] hover:bg-[#f2f6ee] hover:text-[#17201c] transition"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MATCHES GRID */}
      <section className="mx-auto max-w-7xl px-4 pt-7 sm:px-6">
        {/* Results Counter */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-bold text-[#869288]">
            Showing <span className="text-[#17201c] font-black">{filteredMatches.length}</span> open matches
          </p>

          <span className="text-xs text-[#869288] hidden sm:inline">
            Click &ldquo;Join&rdquo; to lock your spot or view match details
          </span>
        </div>

        {/* LOADING STATE */}
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#a8e63d] border-t-transparent" />
            <p className="mt-4 text-xs font-bold text-[#7a867e]">
              Finding open badminton matches...
            </p>
          </div>
        ) : loadError ? (
          /* ERROR STATE */
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-8 text-center max-w-md mx-auto my-12">
            <AlertCircle className="h-10 w-10 text-red-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-red-800">Unable to load matches</h3>
            <p className="text-xs text-red-600 mt-1">{loadError}</p>
            <button
              onClick={fetchMatchesFromApi}
              className="mt-4 rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        ) : filteredMatches.length > 0 ? (
          /* MATCHES LIST */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
            {filteredMatches.map((match) => {
              const currentUserId = user?.id;
              const isCreator = currentUserId && match.creatorId === currentUserId;
              const isJoined =
                currentUserId &&
                match.participants?.some(
                  (p: any) => p.userId === currentUserId && p.status === "JOINED"
                );
              const isFull = match.status === "FULL" || match.remainingSpots === 0;
              const isCancelled = match.status === "CANCELLED";

              return (
                <div
                  key={match.id}
                  className="relative flex flex-col justify-between rounded-[28px] border border-[#e1e7df] bg-white p-6 shadow-sm transition hover:shadow-md hover:border-[#a8e63d]/80"
                >
                  <div>
                    {/* Header: Skill level tag & Format badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#f0fae1] border border-[#a8e63d] px-3 py-1 text-xs font-black text-[#446d17]">
                          {match.skillLevelFormatted || match.skillLevel}
                        </span>

                        <span className="rounded-full bg-[#f4f7f2] px-2.5 py-1 text-xs font-semibold text-[#5d6a61]">
                          {match.format || "Doubles"}
                        </span>
                      </div>

                      {/* Court Verified Badge */}
                      {match.court ? (
                        <div className="flex items-center gap-1 rounded-full bg-[#17201c] px-2.5 py-1 text-[11px] font-bold text-[#a8e63d]">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Court #{match.court.courtNumber} Locked</span>
                        </div>
                      ) : (
                        <div className="text-[11px] font-semibold text-[#8a968d]">
                          Venue reserved
                        </div>
                      )}
                    </div>

                    {/* Match Title */}
                    <Link href={`/friendly-matches/${match.id}`} className="group block mt-3">
                      <h3 className="text-base sm:text-lg font-extrabold text-[#17201c] group-hover:text-[#5e8e20] transition">
                        {match.title}
                      </h3>
                    </Link>

                    {/* Schedule & Venue Meta */}
                    <div className="mt-3 space-y-1.5 text-xs text-[#626e65]">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-[#73a229] shrink-0" />
                        <span className="font-semibold text-[#17201c]">
                          {match.venue?.name}
                        </span>
                        <span className="truncate text-[#808d84]">
                          • {match.venue?.location}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-[#556157]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[#73a229] shrink-0" />
                          <span>{match.date ? match.date.slice(0, 10) : ""}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-[#73a229] shrink-0" />
                          <span>
                            {match.startTime} - {match.endTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description preview */}
                    <p className="mt-3 text-xs text-[#738076] line-clamp-2">
                      {match.description || "Friendly open session for badminton sparring & rallies."}
                    </p>
                  </div>

                  {/* Footer Info & Actions */}
                  <div className="mt-5 pt-4 border-t border-[#edf1ea]">
                    {/* Spots & Host summary */}
                    <div className="flex items-center justify-between text-xs mb-3">
                      {/* Host */}
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#17201c] text-[10px] font-extrabold text-[#a8e63d]">
                          {match.creator?.name ? match.creator.name.slice(0, 2).toUpperCase() : "H"}
                        </div>
                        <span className="text-[#647067] font-medium">
                          Host: <span className="font-bold text-[#17201c]">{match.creator?.name || "Player"}</span>
                        </span>
                      </div>

                      {/* Player Limit & Remaining Spots */}
                      <div className="text-right">
                        <span className="font-extrabold text-[#17201c]">
                          {match.currentPlayers} / {match.maxPlayers}
                        </span>{" "}
                        <span className="text-[#7d8880]">players</span>
                        <span
                          className={`ml-1.5 font-bold ${
                            match.remainingSpots === 0 ? "text-amber-600" : "text-[#55811b]"
                          }`}
                        >
                          ({match.remainingSpots === 0 ? "FULL" : `${match.remainingSpots} spot(s) left`})
                        </span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/friendly-matches/${match.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#d6dfd2] bg-[#f8faf7] py-2.5 text-xs font-bold text-[#17201c] hover:bg-[#ebf2e7] transition"
                      >
                        View Details
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>

                      {/* Join / Status Button */}
                      {isCancelled ? (
                        <span className="rounded-xl bg-red-100 px-4 py-2.5 text-xs font-bold text-red-700">
                          Cancelled
                        </span>
                      ) : isCreator ? (
                        <span className="rounded-xl border border-[#d6dfd2] bg-[#f0fae1] px-4 py-2.5 text-xs font-bold text-[#456d17]">
                          Host (You)
                        </span>
                      ) : isJoined ? (
                        <span className="rounded-xl bg-emerald-100 px-4 py-2.5 text-xs font-bold text-emerald-800">
                          Joined
                        </span>
                      ) : isFull ? (
                        <span className="rounded-xl bg-[#f0f3ed] px-4 py-2.5 text-xs font-bold text-[#869288]">
                          Full
                        </span>
                      ) : (
                        <button
                          disabled={actionLoadingId === String(match.id)}
                          onClick={() => handleQuickJoin(match.id)}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-[#a8e63d] px-5 py-2.5 text-xs font-black text-[#17201c] shadow transition hover:bg-[#b8ef59] active:scale-95 disabled:opacity-50"
                        >
                          {actionLoadingId === String(match.id) ? "Joining..." : "Join"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="rounded-[32px] border border-[#e1e7df] bg-white p-12 text-center my-8 shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0fae1] text-[#4f7a19] mb-4">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="text-base font-extrabold text-[#17201c]">No matches found</h3>
            <p className="mt-1.5 text-xs text-[#717c74] max-w-sm mx-auto leading-relaxed">
              We couldn&apos;t find any open sessions matching your current search or filters.
              Try adjusting your filters or be the first to host one!
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={clearAllFilters}
                className="rounded-xl border border-[#d6ded4] bg-white px-5 py-2.5 text-xs font-bold text-[#17201c] hover:bg-[#f3f7f0] transition"
              >
                Clear All Filters
              </button>
              <Link
                href="/friendly-matches/create"
                className="flex items-center gap-1.5 rounded-xl bg-[#a8e63d] px-5 py-2.5 text-xs font-black text-[#17201c] hover:bg-[#b8ef59] shadow transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Host a Match
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
