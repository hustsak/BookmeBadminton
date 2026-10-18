"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Navbar } from "@/components/Navbar";
import { LoginModal } from "@/components/LoginModal";
import { useApp } from "@/context/AppContext";
import {
  Users,
  Search,
  MapPin,
  Sparkles,
  ArrowRight,
  Award,
  Zap,
  Filter,
  RefreshCw,
  Flame,
  CheckCircle2,
  Check,
  Calendar,
  X,
  User as UserIcon,
  Layers,
} from "lucide-react";

export default function PlayersDiscoveryPage() {
  const { user, openLoginModal, venues } = useApp();

  const [players, setPlayers] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filter State
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("ALL");
  const [styleFilter, setStyleFilter] = useState("ALL");
  const [venueFilter, setVenueFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  async function loadPlayersData() {
    setIsLoading(true);
    setLoadError(null);
    try {
      // 1. Fetch general players list
      const resPlayers = await fetch("/api/players?limit=50", {
        headers: user?.id ? { "x-user-id": String(user.id) } : {},
      });
      const dataPlayers = await resPlayers.json();
      if (dataPlayers.success && Array.isArray(dataPlayers.players)) {
        setPlayers(dataPlayers.players);
      } else {
        setLoadError(dataPlayers.message || "Could not retrieve players.");
      }

      // 2. Fetch personalized recommendations if logged in
      if (user?.id) {
        const resRecs = await fetch("/api/players/recommendations?limit=6", {
          headers: { "x-user-id": String(user.id) },
        });
        const dataRecs = await resRecs.json();
        if (dataRecs.success && Array.isArray(dataRecs.recommendations)) {
          setRecommendations(dataRecs.recommendations);
        }
      } else {
        setRecommendations([]);
      }
    } catch (err) {
      console.error("Failed to load players:", err);
      setLoadError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPlayersData();
  }, [user?.id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, skillFilter, styleFilter, venueFilter]);

  // Filter players
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      // Exclude self from discovery list if desired
      if (user?.id && p.userId === user.id) return false;

      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        p.displayName.toLowerCase().includes(q) ||
        p.bio?.toLowerCase().includes(q) ||
        p.district?.toLowerCase().includes(q) ||
        p.homeVenue?.name?.toLowerCase().includes(q);

      const matchesSkill =
        skillFilter === "ALL" ||
        p.skillLevel.toLowerCase() === skillFilter.toLowerCase();

      const matchesStyle =
        styleFilter === "ALL" ||
        p.playingStyle.toLowerCase() === styleFilter.toLowerCase();

      const matchesVenue =
        venueFilter === "ALL" ||
        String(p.homeVenueId) === venueFilter ||
        (Array.isArray(p.preferredVenueIds) &&
          p.preferredVenueIds.includes(Number(venueFilter)));

      return matchesSearch && matchesSkill && matchesStyle && matchesVenue;
    });
  }, [players, search, skillFilter, styleFilter, venueFilter, user?.id]);

  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / itemsPerPage));
  const paginatedPlayers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPlayers.slice(start, start + itemsPerPage);
  }, [filteredPlayers, currentPage, itemsPerPage]);

  const clearFilters = () => {
    setSearch("");
    setSkillFilter("ALL");
    setStyleFilter("ALL");
    setVenueFilter("ALL");
    setCurrentPage(1);
  };

  const getSkillBadgeStyle = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case "PROFESSIONAL":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "ADVANCED":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "INTERMEDIATE":
        return "bg-[#f0fae1] text-[#477017] border-[#d8e8c8]";
      case "BEGINNER":
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  return (
    <main className="min-h-screen bg-[#F7F8F4] text-[#17201C] pb-32">
      <Navbar />
      <LoginModal />

      {/* HERO SECTION */}
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <div className="relative overflow-hidden rounded-[28px] sm:rounded-[36px] bg-gradient-to-br from-[#17201c] via-[#1c2c23] to-[#121c17] p-6 sm:p-12 text-white shadow-xl">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#a8e63d]/15 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-xs font-semibold backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-[#a8e63d]" />
                <span className="text-[#e2f5b8]">Smart Matchmaking Engine</span>
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl text-white">
                Badminton Players Directory<span className="text-[#a8e63d]">.</span>
              </h1>
              <p className="mt-2.5 text-xs sm:text-base leading-relaxed text-[#c6d1c9]">
                Find compatible sparring partners and doubles teammates in Hanoi.
                Our algorithm scores compatibility based on your skill tier, playing format,
                schedule overlap, and preferred home venue!
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-[#a9b7ad]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#a8e63d]" />
                  <span>Transparent 0–100 Compatibility Score</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#a8e63d]" />
                  <span>Skill Level & Hand Preferences</span>
                </div>
              </div>
            </div>

            {/* Profile Action Card */}
            <div className="flex flex-col gap-3 shrink-0">
              <Link
                href="/profile"
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#a8e63d] px-7 py-4 text-sm font-black text-[#17201c] shadow-lg transition hover:bg-[#b8ef59] hover:scale-[1.02] active:scale-95"
              >
                <UserIcon className="h-4 w-4" />
                {user ? "Edit My Player Profile" : "Set Up Your Profile"}
              </Link>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center text-xs text-[#b0beba] backdrop-blur">
                <span className="font-bold text-white">{players.length} players</span> active in Hanoi
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TOP RECOMMENDED PLAYERS (If user logged in and has recommendations) */}
      {user && recommendations.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#73a229]" />
              <h2 className="text-lg font-black text-[#17201c]">Top Recommended for You</h2>
            </div>
            <span className="text-xs text-[#717c74]">Ranked by compatibility</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                className="relative overflow-hidden rounded-[24px] border border-[#dce3d8] bg-white p-5 shadow-sm transition hover:border-[#a8e63d] hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold uppercase ${getSkillBadgeStyle(
                        rec.skillLevel
                      )}`}
                    >
                      {rec.skillLevel}
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-full bg-[#f0fae1] border border-[#a8e63d]/50 px-2.5 py-1 text-xs font-black text-[#416a15]">
                      <Sparkles className="h-3 w-3 text-[#78a72b]" />
                      {rec.compatibility?.score || 85}% Match
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#17201c] text-base font-black text-[#a8e63d] shadow-sm">
                      {rec.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-[#17201c] text-base line-clamp-1">
                        {rec.displayName}
                      </h3>
                      <p className="text-xs text-[#6e7b72] flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-[#75a52a]" />
                        {rec.homeVenue?.name || rec.district || "Hanoi"}
                      </p>
                    </div>
                  </div>

                  {/* Recommendation Reasons */}
                  {rec.compatibility?.reasons && rec.compatibility.reasons.length > 0 && (
                    <div className="mt-3.5 space-y-1 rounded-xl bg-[#f7f9f5] p-2.5 text-[11px] text-[#4b584f]">
                      {rec.compatibility.reasons.map((r: string, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 font-medium">
                          <Check className="h-3 w-3 text-[#73a229] shrink-0" />
                          <span className="truncate">{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#edf1ea] flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#7c8880]">
                    {rec.stats?.matchesPlayed || 0} matches played
                  </span>
                  <Link
                    href={`/players/${rec.id}`}
                    className="flex items-center gap-1 text-xs font-bold text-[#17201c] hover:text-[#53811c] transition"
                  >
                    View Profile
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FILTER & SEARCH CONTROLS */}
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <div className="flex flex-col gap-4 rounded-[28px] border border-[#e1e7df] bg-white p-5 shadow-sm">
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-1 items-center gap-2.5 rounded-2xl bg-[#f5f7f3] px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-[#8e9891]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search players by name, bio, venue, district..."
                className="w-full bg-transparent text-xs sm:text-sm outline-none placeholder:text-[#9ea8a0]"
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X className="h-4 w-4 text-[#8e9891]" />
                </button>
              )}
            </div>

            {/* Venue filter */}
            <div className="sm:w-64">
              <select
                value={venueFilter}
                onChange={(e) => setVenueFilter(e.target.value)}
                className="w-full rounded-2xl border border-[#e3e8e1] bg-[#f8faf7] px-4 py-3 text-xs sm:text-sm font-semibold text-[#17201c] outline-none"
              >
                <option value="ALL">All Home Venues</option>
                {venues.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Skill & Style Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#edf1eb]">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Skill Filter */}
              <select
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                className="rounded-full border border-[#e3e8e1] bg-white px-3.5 py-1.5 font-semibold text-[#3a443e] outline-none"
              >
                <option value="ALL">All Skill Tiers</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
                <option value="PROFESSIONAL">Professional</option>
              </select>

              {/* Style Filter */}
              <select
                value={styleFilter}
                onChange={(e) => setStyleFilter(e.target.value)}
                className="rounded-full border border-[#e3e8e1] bg-white px-3.5 py-1.5 font-semibold text-[#3a443e] outline-none"
              >
                <option value="ALL">All Formats</option>
                <option value="DOUBLES">Doubles Specialist</option>
                <option value="SINGLES">Singles Specialist</option>
                <option value="BOTH">Versatile (Both)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {(search || skillFilter !== "ALL" || styleFilter !== "ALL" || venueFilter !== "ALL") && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-bold text-[#7a867f] hover:text-[#17201c] underline underline-offset-4"
                >
                  Reset Filters
                </button>
              )}

              <button
                onClick={loadPlayersData}
                title="Refresh directory"
                className="rounded-full p-2 text-[#7a867f] hover:bg-[#f2f6ee] hover:text-[#17201c]"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PLAYERS LIST SECTION */}
      <section className="mx-auto max-w-7xl px-4 pt-7 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-bold text-[#869288]">
            Showing <span className="text-[#17201c] font-black">{filteredPlayers.length}</span> players
          </p>
        </div>

        {isLoading ? (
          <div className="py-20 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#a8e63d] border-t-transparent" />
            <p className="mt-4 text-xs font-bold text-[#7a867e]">Loading players directory...</p>
          </div>
        ) : loadError ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-8 text-center max-w-md mx-auto my-12">
            <p className="text-xs font-bold text-red-700">{loadError}</p>
            <button
              onClick={loadPlayersData}
              className="mt-4 rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : filteredPlayers.length > 0 ? (
          <div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginatedPlayers.map((p) => {
                const hasScore = p.compatibility && p.compatibility.score !== undefined;

                return (
                  <div
                    key={p.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-[#e1e7df] bg-white p-5 sm:p-6 shadow-sm transition hover:border-[#a8e63d] hover:shadow-md"
                  >
                    <div>
                      {/* Top Row: Skill & Style Badges */}
                      <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold uppercase ${getSkillBadgeStyle(
                              p.skillLevel
                            )}`}
                          >
                            {p.skillLevel}
                          </span>

                          <span className="rounded-full bg-[#f4f7f2] px-2.5 py-0.5 text-[11px] font-bold text-[#455248]">
                            {p.playingStyle}
                          </span>
                        </div>

                        {hasScore && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#f0fae1] border border-[#a8e63d]/50 px-2 py-0.5 text-[11px] font-black text-[#416a15]">
                            {p.compatibility.score}% Match
                          </span>
                        )}
                      </div>

                      {/* Profile Summary */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#17201c] text-sm font-black text-[#a8e63d]">
                          {p.displayName ? p.displayName.slice(0, 2).toUpperCase() : "P"}
                        </div>
                        <div>
                          <Link
                            href={`/players/${p.id}`}
                            className="font-extrabold text-[#17201c] text-base group-hover:text-[#426c15] transition line-clamp-1"
                          >
                            {p.displayName}
                          </Link>
                          <p className="text-xs text-[#717e74] flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-[#75a52a]" />
                            {p.homeVenue?.name || p.district || "Hanoi"}
                          </p>
                        </div>
                      </div>

                      {/* Bio */}
                      <p className="text-xs text-[#616e64] line-clamp-2 leading-relaxed mb-4">
                        {p.bio || "Active badminton player looking for sparring games and friendly sparring rallies."}
                      </p>

                      {/* Preferences & Schedule Pills */}
                      <div className="space-y-1.5 text-[11px] text-[#556358] bg-[#f9faf7] rounded-xl p-3 border border-[#edf1ea]">
                        <div className="flex items-center justify-between">
                          <span className="text-[#849187]">Preferred Hand:</span>
                          <span className="font-bold text-[#17201c]">{p.playHand || "Right"}-Handed</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#849187]">Experience:</span>
                          <span className="font-bold text-[#17201c]">{p.yearsExperience || 1} year(s)</span>
                        </div>
                        {p.preferredDays && p.preferredDays.length > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-[#849187]">Plays on:</span>
                            <span className="font-bold text-[#17201c] truncate max-w-[140px]">
                              {p.preferredDays.map((d: string) => d.slice(0, 3)).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer & Actions */}
                    <div className="mt-5 pt-3.5 border-t border-[#edf1ea] flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#7c8880]">
                        {p.stats?.matchesPlayed || 0} matches • {p.stats?.matchesHosted || 0} hosted
                      </span>

                      <Link
                        href={`/players/${p.id}`}
                        className="flex items-center gap-1.5 rounded-xl border border-[#d6dfd2] bg-[#f8faf7] px-3.5 py-1.5 text-xs font-bold text-[#17201c] hover:bg-[#ebf2e7] transition"
                      >
                        View Profile
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-[#e1e7df] bg-white p-4 shadow-sm">
                <span className="text-xs font-semibold text-[#66736a]">
                  Showing {(currentPage - 1) * itemsPerPage + 1}–
                  {Math.min(currentPage * itemsPerPage, filteredPlayers.length)} of{" "}
                  {filteredPlayers.length} players
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded-xl border border-[#d6dfd2] px-3 py-1.5 text-xs font-bold text-[#17201c] hover:bg-[#f2f6ee] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-8 w-8 rounded-xl text-xs font-bold transition ${
                          currentPage === pageNum
                            ? "bg-[#17201c] text-[#a8e63d]"
                            : "border border-[#d6dfd2] text-[#17201c] hover:bg-[#f2f6ee]"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-xl border border-[#d6dfd2] px-3 py-1.5 text-xs font-bold text-[#17201c] hover:bg-[#f2f6ee] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-[32px] border border-[#e1e7df] bg-white p-12 text-center my-8 shadow-sm">
            <Users className="h-10 w-10 text-[#7ca830] mx-auto mb-3" />
            <h3 className="text-base font-extrabold text-[#17201c]">No players found</h3>
            <p className="mt-1.5 text-xs text-[#717c74]">
              Try adjusting your search criteria or clear filters to see more players.
            </p>
            <button
              onClick={clearFilters}
              className="mt-5 rounded-xl border border-[#d6dfd2] bg-white px-5 py-2 text-xs font-bold text-[#17201c] hover:bg-[#f3f7f0]"
            >
              Clear Filters
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
