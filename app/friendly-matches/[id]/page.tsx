"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Navbar } from "@/components/Navbar";
import { LoginModal } from "@/components/LoginModal";
import { useApp } from "@/context/AppContext";
import {
  Users,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Info,
  DollarSign,
  Award,
  Share2,
  Check,
  X,
  Edit3,
  Trash2,
  Lock,
  UserCheck,
  UserPlus,
  Send,
  Trophy,
  Star,
  Flag,
  AlertTriangle,
} from "lucide-react";

export default function MatchDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(props.params);
  const { user, openLoginModal, refreshMatches } = useApp();

  const [match, setMatch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Invite players state
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [inviteNotes, setInviteNotes] = useState("");
  const [invitedPlayerIds, setInvitedPlayerIds] = useState<number[]>([]);
  const [invitingId, setInvitingId] = useState<number | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editMaxPlayers, setEditMaxPlayers] = useState<number>(4);
  const [editSkillLevel, setEditSkillLevel] = useState("Intermediate");
  const [editStartTime, setEditStartTime] = useState("18:00");
  const [editEndTime, setEditEndTime] = useState("20:00");
  const [editFee, setEditFee] = useState<number>(0);
  const [editDescription, setEditDescription] = useState("");
  const [editShuttlecock, setEditShuttlecock] = useState(true);

  // Match Result & Score state
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [resultScore, setResultScore] = useState("21-19, 18-21, 21-17");
  const [set1T1, setSet1T1] = useState("21");
  const [set1T2, setSet1T2] = useState("19");
  const [set2T1, setSet2T1] = useState("18");
  const [set2T2, setSet2T2] = useState("21");
  const [set3T1, setSet3T1] = useState("21");
  const [set3T2, setSet3T2] = useState("17");
  const [useSetScores, setUseSetScores] = useState(true);
  const [winnerTeamChoice, setWinnerTeamChoice] = useState<1 | 2 | null>(1);
  const [team1Players, setTeam1Players] = useState<number[]>([]);
  const [team2Players, setTeam2Players] = useState<number[]>([]);
  const [disputeReason, setDisputeReason] = useState("");

  // Post-match player rating state
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [ratingRecipient, setRatingRecipient] = useState<{ id: number; name: string } | null>(null);
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  async function loadMatch() {
    setIsLoading(true);
    try {
      const numericId = parseInt(id.replace(/\D/g, ""), 10);
      const res = await fetch(`/api/matches/${numericId}`, {
        headers: user?.id ? { "x-user-id": String(user.id) } : {},
      });
      const data = await res.json();
      if (res.ok && data.success && data.match) {
        setMatch(data.match);
        // Prepopulate edit form
        setEditTitle(data.match.title);
        setEditMaxPlayers(data.match.maxPlayers);
        setEditSkillLevel(data.match.skillLevelFormatted || "Intermediate");
        setEditStartTime(data.match.startTime);
        setEditEndTime(data.match.endTime);
        setEditFee(data.match.feePerPerson || 0);
        setEditDescription(data.match.description || "");
        setEditShuttlecock(data.match.shuttlecockProvided ?? true);
      } else {
        setErrorMessage(data.message || "Match not found.");
      }
    } catch (err: any) {
      console.error("Failed to load match:", err);
      setErrorMessage("Network error occurred while fetching match details.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMatch();
  }, [id, user?.id]);

  // Keyboard accessibility: Escape key to close open modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsEditModalOpen(false);
        setIsCancelModalOpen(false);
        setIsLeaveModalOpen(false);
        setIsInviteModalOpen(false);
        setIsResultModalOpen(false);
        setIsDisputeModalOpen(false);
        setIsRatingModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle Join Match
  const handleJoin = async () => {
    if (!user) {
      openLoginModal();
      return;
    }

    setIsActionLoading(true);
    try {
      const numericId = parseInt(id.replace(/\D/g, ""), 10);
      const res = await fetch(`/api/matches/${numericId}/join`, {
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
        await loadMatch();
        await refreshMatches();
      } else {
        showToast(data.message || "Failed to join match.");
      }
    } catch (err) {
      showToast("Network error. Please try again.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Leave Match
  const handleLeave = async () => {
    if (!user) return;
    setIsActionLoading(true);
    try {
      const numericId = parseInt(id.replace(/\D/g, ""), 10);
      const res = await fetch(`/api/matches/${numericId}/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id),
        },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("You have left the match. Spot reopened.");
        setIsLeaveModalOpen(false);
        await loadMatch();
        await refreshMatches();
      } else {
        showToast(data.message || "Failed to leave match.");
      }
    } catch (err) {
      showToast("Network error. Please try again.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Cancel Match (Creator only)
  const handleCancelMatch = async () => {
    if (!user) return;
    setIsActionLoading(true);
    try {
      const numericId = parseInt(id.replace(/\D/g, ""), 10);
      const res = await fetch(`/api/matches/${numericId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id),
        },
        body: JSON.stringify({ userId: user.id, reason: "Host cancelled open match" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Match cancelled successfully.");
        setIsCancelModalOpen(false);
        await loadMatch();
        await refreshMatches();
      } else {
        showToast(data.message || "Failed to cancel match.");
      }
    } catch (err) {
      showToast("Network error. Please try again.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Edit Match (Creator only)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsActionLoading(true);
    try {
      const numericId = parseInt(id.replace(/\D/g, ""), 10);
      const res = await fetch(`/api/matches/${numericId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id),
        },
        body: JSON.stringify({
          userId: user.id,
          title: editTitle.trim(),
          maxPlayers: Number(editMaxPlayers),
          skillLevel: editSkillLevel,
          startTime: editStartTime,
          endTime: editEndTime,
          feePerPerson: Number(editFee),
          shuttlecockProvided: editShuttlecock,
          description: editDescription.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Match details updated successfully.");
        setIsEditModalOpen(false);
        await loadMatch();
        await refreshMatches();
      } else {
        showToast(data.message || "Failed to update match.");
      }
    } catch (err) {
      showToast("Network error. Please try again.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const openInviteModal = async () => {
    setIsInviteModalOpen(true);
    setLoadingPlayers(true);
    try {
      const res = await fetch("/api/players?limit=25", {
        headers: user?.id ? { "x-user-id": String(user.id) } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.players)) {
          const joinedIds = new Set(match.participants?.map((p: any) => p.userId) || []);
          const eligible = data.players.filter(
            (p: any) => p.userId !== user?.id && !joinedIds.has(p.userId)
          );
          setAvailablePlayers(eligible);
        }
      }
    } catch (e) {
      console.warn("Failed to load players for invite:", e);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleSendInvite = async (recipientId: number) => {
    if (!user) return;
    setInvitingId(recipientId);
    try {
      const numericId = parseInt(id.replace(/\D/g, ""), 10);
      const res = await fetch(`/api/matches/${numericId}/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id),
        },
        body: JSON.stringify({
          recipientId,
          notes: inviteNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInvitedPlayerIds((prev) => [...prev, recipientId]);
        showToast("Invitation sent!");
      } else {
        showToast(data.message || "Failed to send invitation.");
      }
    } catch {
      showToast("Network error. Please try again.");
    } finally {
      setInvitingId(null);
    }
  };

  const handleOpenResultModal = () => {
    if (!match) return;
    const activeIds = (match.participants || [])
      .filter((p: any) => p.status === "JOINED")
      .map((p: any) => p.userId);

    if (activeIds.length >= 2) {
      const half = Math.ceil(activeIds.length / 2);
      setTeam1Players(activeIds.slice(0, half));
      setTeam2Players(activeIds.slice(half));
    } else if (activeIds.length === 1) {
      setTeam1Players([activeIds[0]]);
      setTeam2Players([]);
    }
    setResultScore("21-19, 18-21, 21-17");
    setIsResultModalOpen(true);
  };

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !match) return;

    if (team1Players.length === 0 || team2Players.length === 0) {
      alert("Both Team 1 and Team 2 must have at least one assigned player.");
      return;
    }

    setIsActionLoading(true);
    try {
      let finalScore = resultScore.trim();
      let setScoresList: any[] = [];
      if (useSetScores) {
        setScoresList = [
          { set: 1, team1: parseInt(set1T1, 10) || 0, team2: parseInt(set1T2, 10) || 0 },
          { set: 2, team1: parseInt(set2T1, 10) || 0, team2: parseInt(set2T2, 10) || 0 },
        ];
        if (set3T1 && set3T2) {
          setScoresList.push({
            set: 3,
            team1: parseInt(set3T1, 10) || 0,
            team2: parseInt(set3T2, 10) || 0,
          });
        }
        finalScore = setScoresList.map((s) => `${s.team1}-${s.team2}`).join(", ");
      }

      const res = await fetch(`/api/matches/${match.id}/result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id),
        },
        body: JSON.stringify({
          score: finalScore,
          setScores: useSetScores ? setScoresList : undefined,
          winnerTeam: winnerTeamChoice,
          team1PlayerIds: team1Players,
          team2PlayerIds: team2Players,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsResultModalOpen(false);
        showToast("Match result submitted successfully!");
        loadMatch();
      } else {
        alert(data.message || "Failed to submit match result.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmResult = async () => {
    if (!user || !match) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/matches/${match.id}/result/confirm`, {
        method: "POST",
        headers: { "x-user-id": String(user.id) },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Match result confirmed! Match marked as Completed.");
        loadMatch();
      } else {
        alert(data.message || "Failed to confirm match result.");
      }
    } catch {
      alert("Network error confirming result.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDisputeResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !match || !disputeReason.trim()) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/matches/${match.id}/result/dispute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id),
        },
        body: JSON.stringify({ reason: disputeReason.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsDisputeModalOpen(false);
        showToast("Match result disputed.");
        loadMatch();
      } else {
        alert(data.message || "Failed to dispute result.");
      }
    } catch {
      alert("Network error disputing result.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOpenRating = (recipientId: number, recipientName: string) => {
    if (!user) {
      openLoginModal();
      return;
    }
    setRatingRecipient({ id: recipientId, name: recipientName });
    setRatingStars(5);
    setRatingComment("");
    setIsRatingModalOpen(true);
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !match || !ratingRecipient) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/matches/${match.id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id),
        },
        body: JSON.stringify({
          recipientId: ratingRecipient.id,
          rating: ratingStars,
          comment: ratingComment.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsRatingModalOpen(false);
        showToast(`Review for ${ratingRecipient.name} submitted!`);
        loadMatch();
      } else {
        alert(data.message || "Failed to submit review.");
      }
    } catch {
      alert("Network error submitting review.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const copyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      showToast("Match link copied to clipboard!");
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#F7F8F4] text-[#17201C] pb-24">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-16 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#a8e63d] border-t-transparent" />
          <p className="mt-4 text-xs font-bold text-[#7a867e]">Loading match details...</p>
        </div>
      </main>
    );
  }

  if (errorMessage || !match) {
    return (
      <main className="min-h-screen bg-[#F7F8F4] text-[#17201C] pb-24">
        <Navbar />
        <div className="mx-auto max-w-md px-4 pt-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-4">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-extrabold text-[#17201c]">Match Not Found</h1>
          <p className="mt-2 text-xs text-[#717b73]">
            {errorMessage || "The match you requested does not exist or has been removed."}
          </p>
          <Link
            href="/friendly-matches"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#17201c] px-6 py-3 text-xs font-bold text-white transition hover:bg-[#2c3830]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Friendly Matches
          </Link>
        </div>
      </main>
    );
  }

  const isCreator = user?.id && match.creatorId === user.id;
  const isJoined = user?.id && match.participants?.some((p: any) => p.userId === user.id && p.status === "JOINED");
  const isParticipant = isJoined || isCreator;
  const isCancelled = match.status === "CANCELLED";
  const isCompleted = match.status === "COMPLETED";
  const isFull = match.currentPlayers >= match.maxPlayers || match.status === "FULL";
  const activeParticipants = (match.participants || []).filter((p: any) => p.status === "JOINED");

  const matchEnd = new Date(match.date);
  const [endH, endM] = (match.endTime || "23:59").split(":").map(Number);
  matchEnd.setHours(endH || 0, endM || 0, 0, 0);
  const isMatchEnded = Date.now() >= matchEnd.getTime() || isCompleted || !!match.result;
  const matchResult = match.result;
  const isResultPending = matchResult?.status === "PENDING_CONFIRMATION";
  const isResultDisputed = matchResult?.status === "DISPUTED";
  const isResultConfirmed = matchResult?.status === "CONFIRMED";
  const canConfirm = isParticipant && isResultPending && matchResult.submittedById !== user?.id;
  const canDispute = isParticipant && isResultPending;
  const canSubmitResult = isParticipant && !isCancelled && isMatchEnded && (!matchResult || isResultDisputed);

  return (
    <main className="min-h-screen bg-[#F7F8F4] text-[#17201C] pb-36 sm:pb-32 w-full max-w-full overflow-x-hidden">
      <Navbar />
      <LoginModal />

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 rounded-2xl border border-[#d6dfd3] bg-[#17201c] px-4 py-3 text-xs font-bold text-white shadow-2xl"
          >
            <Sparkles className="h-4 w-4 text-[#a8e63d]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-6 sm:pt-10">
        {/* Breadcrumb & Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#7c867f]">
            <Link
              href="/friendly-matches"
              className="flex items-center gap-1.5 font-semibold hover:text-[#17201c] transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All Open Matches
            </Link>
            <span>/</span>
            <span className="text-[#17201c] font-bold truncate max-w-[200px] sm:max-w-none">
              {match.title}
            </span>
          </div>

          <button
            onClick={copyShareLink}
            className="flex items-center gap-1.5 rounded-full border border-[#dce2d9] bg-white px-3.5 py-1.5 text-xs font-bold text-[#556158] hover:bg-[#f2f6ef] transition"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
        </div>

        {/* Cancelled Banner */}
        {isCancelled && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="font-bold">This match has been cancelled by the host.</p>
              <p className="text-[11px] text-red-600 mt-0.5">
                No further players can join, and any linked court bookings have been released.
              </p>
            </div>
          </div>
        )}

        {/* HERO CARD */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#17201c] via-[#203028] to-[#121c17] p-6 sm:p-10 text-white shadow-xl mb-6">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#a8e63d]/15 blur-3xl" />

          <div className="relative z-10">
            {/* Top Badges */}
            <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
              <span
                className={`rounded-full px-3 py-1 text-xs font-extrabold tracking-wide uppercase ${
                  isCancelled
                    ? "bg-red-500/20 text-red-300 border border-red-400/30"
                    : isFull
                    ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                    : "bg-[#a8e63d]/20 text-[#c8f57f] border border-[#a8e63d]/40"
                }`}
              >
                {match.status}
              </span>

              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur text-[#dce4de]">
                {match.format || "Doubles"}
              </span>

              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur text-[#dce4de]">
                {match.skillLevelFormatted}
              </span>

              {/* Court Confirmation Distinction Badge */}
              {match.bookingId && match.booking?.status === "CONFIRMED" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 px-3 py-1 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Court Confirmed ({match.court?.name || "Booked"})
                </span>
              ) : match.courtId && match.court ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 px-3 py-1 text-xs font-bold text-amber-200">
                  <Clock className="h-3.5 w-3.5 text-amber-300" />
                  Court Requested: {match.court.name} (Unreserved)
                </span>
              ) : (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#b8c2ba]">
                  Court TBD / Venue Walk-in
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {match.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs sm:text-sm text-[#cbd6ce]">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#a8e63d] shrink-0" />
                <span className="font-semibold text-white">{match.venue?.name}</span>
                <span className="text-[#98a49c]">({match.venue?.location})</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#a8e63d] shrink-0" />
                <span>{match.date ? match.date.slice(0, 10) : ""}</span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#a8e63d] shrink-0" />
                <span>
                  {match.startTime} - {match.endTime}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* DETAILS GRID */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Info Column (2 cols) */}
          <div className="md:col-span-2 space-y-6">
            {/* Description & Rules */}
            <div className="rounded-[24px] border border-[#e1e7df] bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#57645b] mb-3">
                About this Friendly Match
              </h2>
              <p className="text-xs sm:text-sm text-[#434e47] leading-relaxed whitespace-pre-line">
                {match.description ||
                  "Friendly badminton sparring session. Looking for competitive rallies and good sportsmanship. All players welcome!"}
              </p>

              <div className="mt-5 pt-4 border-t border-[#edf1eb] grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-[#7f8a82] font-medium">Shuttlecock</span>
                  <span className="font-bold text-[#17201c]">
                    {match.shuttlecockProvided ? "🏸 Feather Provided by Host" : "BYO / Share Cost"}
                  </span>
                </div>
                <div>
                  <span className="block text-[#7f8a82] font-medium">Split Cost</span>
                  <span className="font-bold text-[#17201c]">
                    {match.feePerPerson ? `${match.feePerPerson.toLocaleString()} VND / player` : "Free / Included"}
                  </span>
                </div>
              </div>
            </div>

            {/* MATCH RESULT & SCORECARD CARD */}
            <div className="rounded-[24px] border border-[#e1e7df] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-[#75a62b]" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#57645b]">
                    Match Result & Scorecard
                  </h2>
                </div>

                {matchResult ? (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                      isResultConfirmed
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : isResultPending
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-red-100 text-red-800 border border-red-300"
                    }`}
                  >
                    {isResultConfirmed
                      ? "Confirmed & Final"
                      : isResultPending
                      ? "Pending Confirmation"
                      : "Result Disputed"}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-[#7e8b82]">
                    {isMatchEnded ? "Finished • Awaiting Score" : "Scheduled"}
                  </span>
                )}
              </div>

              {matchResult ? (
                <div className="space-y-4">
                  {/* Scoreboard Display */}
                  <div className="rounded-2xl border border-[#edf1ea] bg-[#f9faf7] p-4 text-center">
                    <span className="text-xs font-bold text-[#717e75] uppercase block mb-1">
                      Final Score
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-[#17201c] tracking-tight">
                      {matchResult.score}
                    </span>

                    {/* Team Players Breakdown */}
                    <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-[#e8eee6] text-xs">
                      <div className={`p-2.5 rounded-xl border ${matchResult.winnerTeam === 1 ? "bg-[#eaf7d5] border-[#a8e63d]/60 font-bold" : "bg-white border-[#edf1ea]"}`}>
                        <div className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider text-[#68766c] mb-1">
                          {matchResult.winnerTeam === 1 && <Trophy className="h-3 w-3 text-[#4b7a16]" />}
                          <span>Team 1 {matchResult.winnerTeam === 1 && "(Winner)"}</span>
                        </div>
                        <p className="font-extrabold text-[#17201c]">
                          {(match.participants || [])
                            .filter((p: any) => matchResult.team1PlayerIds?.includes(p.userId))
                            .map((p: any) => p.user?.name || `Player #${p.userId}`)
                            .join(" & ") || "Team 1"}
                        </p>
                      </div>

                      <div className={`p-2.5 rounded-xl border ${matchResult.winnerTeam === 2 ? "bg-[#eaf7d5] border-[#a8e63d]/60 font-bold" : "bg-white border-[#edf1ea]"}`}>
                        <div className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider text-[#68766c] mb-1">
                          {matchResult.winnerTeam === 2 && <Trophy className="h-3 w-3 text-[#4b7a16]" />}
                          <span>Team 2 {matchResult.winnerTeam === 2 && "(Winner)"}</span>
                        </div>
                        <p className="font-extrabold text-[#17201c]">
                          {(match.participants || [])
                            .filter((p: any) => matchResult.team2PlayerIds?.includes(p.userId))
                            .map((p: any) => p.user?.name || `Player #${p.userId}`)
                            .join(" & ") || "Team 2"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pending Confirmation Status / Action bar */}
                  {isResultPending && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-amber-900">
                            Result submitted by {matchResult.submittedBy?.profile?.displayName || matchResult.submittedBy?.name || "a player"}.
                          </p>
                          <p className="text-[11px] text-amber-800/80 mt-0.5">
                            Opposing participants must confirm or dispute this score before it affects official leaderboards and win rates.
                          </p>
                        </div>
                      </div>

                      {canConfirm && (
                        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-amber-200/60">
                          <button
                            disabled={isActionLoading}
                            onClick={handleConfirmResult}
                            className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow"
                          >
                            Confirm Score ✓
                          </button>
                          <button
                            disabled={isActionLoading}
                            onClick={() => setIsDisputeModalOpen(true)}
                            className="rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition"
                          >
                            Dispute Score
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Disputed Result Status */}
                  {isResultDisputed && (
                    <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-red-900">
                            Result Disputed by {matchResult.disputedBy?.profile?.displayName || matchResult.disputedBy?.name || "a participant"}:
                          </p>
                          <p className="text-xs text-red-800 italic mt-0.5">
                            "{matchResult.disputeReason || "Score discrepancy"}"
                          </p>
                          <p className="text-[11px] text-red-700/80 mt-1">
                            Disputed scores are excluded from player rankings until an agreed result is resubmitted.
                          </p>
                        </div>
                      </div>

                      {isParticipant && (
                        <button
                          onClick={handleOpenResultModal}
                          className="mt-3 w-full rounded-xl bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-700 transition shadow"
                        >
                          Resubmit Agreed Score
                        </button>
                      )}
                    </div>
                  )}

                  {/* Confirmed Result info */}
                  {isResultConfirmed && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 flex items-center gap-2.5 text-xs text-emerald-900 font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>
                        Result verified and finalized. Statistics have been updated on player profiles and leaderboards.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-xs text-[#67756c] mb-3">
                    {isMatchEnded
                      ? "This match has reached its scheduled time. Any active participant can submit the final score."
                      : "Scores can be submitted once this match finishes playing."}
                  </p>

                  {canSubmitResult && (
                    <button
                      onClick={handleOpenResultModal}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#17201c] px-4 py-2 text-xs font-bold text-[#a8e63d] hover:bg-[#2b3a30] transition shadow-sm"
                    >
                      <Trophy className="h-3.5 w-3.5" />
                      Submit Final Match Result
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* POST-MATCH RATINGS & REVIEWS CARD (When match result is confirmed) */}
            {isResultConfirmed && (
              <div className="rounded-[24px] border border-[#e1e7df] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-[#57645b]">
                      Player Ratings & Sportsmanship
                    </h2>
                  </div>
                  <span className="text-xs text-[#7d8a80]">
                    Verified Participants
                  </span>
                </div>

                {/* Rating fellow players roster */}
                {isParticipant && (
                  <div className="mb-4 space-y-2.5">
                    <p className="text-xs text-[#637168] mb-2 font-medium">
                      Rate your fellow players on sportsmanship and court conduct:
                    </p>
                    {activeParticipants
                      .filter((p: any) => p.userId !== user?.id)
                      .map((p: any) => {
                        const existingReview = (match.reviews || []).find(
                          (r: any) => r.reviewerId === user?.id && r.recipientId === p.userId
                        );

                        return (
                          <div
                            key={p.userId}
                            className="flex items-center justify-between rounded-2xl border border-[#edf1ea] bg-[#f9faf7] p-3 text-xs"
                          >
                            <span className="font-bold text-[#17201c]">
                              {p.user?.name || `Player #${p.userId}`}
                            </span>

                            {existingReview ? (
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  <Star className="h-3 w-3 fill-amber-500" />
                                  {existingReview.rating} ★ Rated
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenRating(p.userId, p.user?.name || `Player #${p.userId}`)}
                                className="inline-flex items-center gap-1 rounded-xl bg-[#17201c] px-3 py-1.5 text-xs font-bold text-[#a8e63d] hover:bg-[#2b3a30] transition"
                              >
                                <Star className="h-3 w-3" />
                                Rate Player
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Reviews submitted for this match */}
                {match.reviews && match.reviews.length > 0 ? (
                  <div className="pt-3 border-t border-[#edf1ea] space-y-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#79867c] block">
                      Submitted Match Reviews
                    </span>
                    {match.reviews.map((rev: any) => (
                      <div key={rev.id} className="rounded-xl bg-[#fbfcfb] border border-[#edf1ea] p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#17201c]">
                            {rev.reviewer?.name || "Player"} → {rev.recipient?.name || "Player"}
                          </span>
                          <span className="flex items-center gap-1 text-amber-600 font-black">
                            <Star className="h-3 w-3 fill-amber-500" />
                            {rev.rating} ★
                          </span>
                        </div>
                        {rev.comment && (
                          <p className="mt-1.5 text-[#515e55] italic">"{rev.comment}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {/* Participants Card */}
            <div className="rounded-[24px] border border-[#e1e7df] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#57645b]">
                    Players Roster
                  </h2>
                  <p className="text-xs text-[#7e8a81] mt-0.5">
                    {activeParticipants.length} of {match.maxPlayers} players confirmed
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                      match.remainingSpots === 0
                        ? "bg-amber-100 text-amber-800"
                        : "bg-[#f0fae1] text-[#487317]"
                    }`}
                  >
                    {match.remainingSpots === 0 ? "Full House" : `${match.remainingSpots} spot(s) remaining`}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full rounded-full bg-[#f0f3ee] overflow-hidden mb-6">
                <div
                  className="h-full bg-[#a8e63d] transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (activeParticipants.length / match.maxPlayers) * 100)}%`,
                  }}
                />
              </div>

              {/* Player Avatars & Details */}
              <div className="space-y-3">
                {activeParticipants.map((p: any, idx: number) => {
                  const isHost = p.role === "HOST" || p.userId === match.creatorId;
                  const isCurrent = user?.id && p.userId === user.id;

                  return (
                    <div
                      key={p.id || idx}
                      className="flex items-center justify-between rounded-2xl border border-[#edf1ea] bg-[#f9faf7] p-3.5 transition hover:bg-[#f4f7f2]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#17201c] to-[#34463a] text-sm font-extrabold text-[#a8e63d] shadow-sm">
                          {p.user?.name ? p.user.name.slice(0, 2).toUpperCase() : `P${idx + 1}`}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-[#17201c]">
                              {p.user?.name || `Player #${p.userId}`}
                            </span>
                            {isCurrent && (
                              <span className="rounded-md bg-[#eef8dd] px-1.5 py-0.5 text-[10px] font-bold text-[#55831e]">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#7d8880]">
                            Joined {p.joinedAt ? p.joinedAt.slice(0, 10) : "recently"}
                          </span>
                        </div>
                      </div>

                      <div>
                        {isHost ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#d8e4d2] bg-[#f0fae1] px-2.5 py-1 text-[11px] font-bold text-[#456f17]">
                            <Award className="h-3 w-3" />
                            Host
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#eef1eb] px-2.5 py-1 text-[11px] font-semibold text-[#667268]">
                            Player
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Empty spot slots placeholders */}
                {Array.from({ length: match.remainingSpots }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-dashed border-[#d9e1d7] p-3.5 text-xs text-[#8d9890]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-[#ccd4ca] text-xs font-semibold text-[#a1aca3]">
                        +
                      </div>
                      <span className="font-semibold text-[#7e8a81]">Open spot available</span>
                    </div>
                    <span className="font-bold text-[#76a32a]">Ready for you</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar / Action Column (1 col) */}
          <div className="space-y-6">
            {/* Action Box */}
            <div className="rounded-[24px] border border-[#e1e7df] bg-white p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5f6a62] mb-3">
                Match Status & Actions
              </h3>

              {isCancelled ? (
                <div className="text-center py-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-2">
                    <X className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-red-700">Match Cancelled</p>
                  <p className="text-[11px] text-[#717b73] mt-1">This open session has been called off.</p>
                </div>
              ) : !user ? (
                <div className="space-y-3">
                  <p className="text-xs text-[#6e7972]">Sign in with your account to reserve a spot in this match.</p>
                  <button
                    onClick={openLoginModal}
                    className="w-full rounded-2xl bg-[#a8e63d] py-3.5 text-xs font-extrabold text-[#17201c] shadow transition hover:bg-[#b8ef59]"
                  >
                    Sign In to Join Match
                  </button>
                </div>
              ) : isCreator ? (
                <div className="space-y-2.5">
                  <div className="rounded-xl bg-[#f0fae1] p-3 text-xs font-semibold text-[#406815]">
                    🏸 You are the Host / Creator of this match.
                  </div>
                  {!isFull && (
                    <button
                      onClick={openInviteModal}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#17201c] py-2.5 text-xs font-bold text-[#a8e63d] hover:bg-[#2c3a32] transition shadow-sm"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Invite Players ({match.remainingSpots} open)
                    </button>
                  )}
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#d6dfd3] bg-[#f8faf7] py-2.5 text-xs font-bold text-[#17201c] hover:bg-[#eef3eb] transition"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit Match Details
                  </button>
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Cancel Match
                  </button>
                </div>
              ) : isJoined ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Your spot is confirmed!</span>
                  </div>
                  {!isFull && (
                    <button
                      onClick={openInviteModal}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#17201c] py-2.5 text-xs font-bold text-[#a8e63d] hover:bg-[#2c3a32] transition shadow-sm"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Invite Friends ({match.remainingSpots} spots left)
                    </button>
                  )}
                  <button
                    disabled={isActionLoading}
                    onClick={() => setIsLeaveModalOpen(true)}
                    className="w-full rounded-xl border border-red-200 bg-white py-3 text-xs font-bold text-red-600 hover:bg-red-50 transition"
                  >
                    Leave Match
                  </button>
                </div>
              ) : isFull ? (
                <div className="text-center py-4 space-y-2">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <Lock className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-[#17201c]">This match is currently full</p>
                  <p className="text-[11px] text-[#748077]">Check back if someone leaves, or host another session.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-[#5f6a62]">
                    <span className="font-bold text-[#17201c]">{match.remainingSpots} spot(s)</span> available. Ready to smash?
                  </div>
                  <button
                    disabled={isActionLoading}
                    onClick={handleJoin}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#a8e63d] py-3.5 text-xs font-extrabold text-[#17201c] shadow-md transition hover:bg-[#b8ef59] active:scale-95 disabled:opacity-50"
                  >
                    {isActionLoading ? "Reserving..." : "Join this Match"}
                  </button>
                </div>
              )}
            </div>

            {/* Host Profile Card */}
            <div className="rounded-[24px] border border-[#e1e7df] bg-white p-5 shadow-sm text-xs space-y-2.5">
              <span className="font-bold uppercase tracking-wider text-[#636f66] block text-[11px]">
                Organized by Host
              </span>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#17201c] text-sm font-extrabold text-[#a8e63d]">
                  {match.creator?.name ? match.creator.name.slice(0, 2).toUpperCase() : "H"}
                </div>
                <div>
                  <h4 className="font-bold text-[#17201c] text-sm">{match.creator?.name || "Host Player"}</h4>
                  <p className="text-[#7c8780]">{match.creator?.email || "Community Member"}</p>
                </div>
              </div>
            </div>

            {/* Venue Location Info Card */}
            <div className="rounded-[24px] border border-[#e1e7df] bg-white p-5 shadow-sm text-xs space-y-2">
              <span className="font-bold uppercase tracking-wider text-[#636f66] block text-[11px]">
                Venue Details
              </span>
              <h4 className="font-bold text-[#17201c] text-sm">{match.venue?.name}</h4>
              <p className="text-[#657168]">{match.venue?.address || match.venue?.location}</p>
              {match.court && (
                <div className="mt-2 pt-2 border-t border-[#edf1ea] text-[#4f5c53]">
                  <span className="font-semibold">Court:</span> {match.court.name}{" "}
                  {match.court.surface ? `(${match.court.surface})` : ""}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MATCH MODAL (Creator Only) */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg rounded-[28px] border border-[#e1e7df] bg-white p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#edf1ea]">
                <h3 className="text-base font-extrabold text-[#17201c]">Edit Match Details</h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-full p-1.5 text-[#737e76] hover:bg-[#f0f3ed]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="font-bold text-[#445047] block mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-xl border border-[#dbe3d8] bg-[#f8faf7] px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#a8e63d] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#445047] block mb-1">Max Players (2 - 16)</label>
                    <input
                      type="number"
                      required
                      min={activeParticipants.length}
                      max={16}
                      value={editMaxPlayers}
                      onChange={(e) => setEditMaxPlayers(parseInt(e.target.value, 10) || 2)}
                      className="w-full rounded-xl border border-[#dbe3d8] bg-[#f8faf7] px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#a8e63d] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#445047] block mb-1">Skill Level</label>
                    <select
                      value={editSkillLevel}
                      onChange={(e) => setEditSkillLevel(e.target.value)}
                      className="w-full rounded-xl border border-[#dbe3d8] bg-[#f8faf7] px-3 py-2.5 text-xs font-semibold outline-none focus:border-[#a8e63d] focus:bg-white"
                    >
                      <option value="All Levels">All Levels</option>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#445047] block mb-1">Start Time</label>
                    <input
                      type="time"
                      required
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      className="w-full rounded-xl border border-[#dbe3d8] bg-[#f8faf7] px-3 py-2 text-xs font-semibold outline-none focus:border-[#a8e63d]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#445047] block mb-1">End Time</label>
                    <input
                      type="time"
                      required
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      className="w-full rounded-xl border border-[#dbe3d8] bg-[#f8faf7] px-3 py-2 text-xs font-semibold outline-none focus:border-[#a8e63d]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#445047] block mb-1">Fee Per Player (VND)</label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={editFee}
                    onChange={(e) => setEditFee(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-xl border border-[#dbe3d8] bg-[#f8faf7] px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#a8e63d]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#445047] block mb-1">Description / Guidelines</label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full rounded-xl border border-[#dbe3d8] bg-[#f8faf7] p-3 text-xs outline-none focus:border-[#a8e63d] resize-none"
                  />
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 rounded-xl border border-[#d9e1d7] py-2.5 font-bold text-[#556259] hover:bg-[#f4f7f2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="flex-1 rounded-xl bg-[#a8e63d] py-2.5 font-extrabold text-[#17201c] hover:bg-[#b8ef59] shadow"
                  >
                    {isActionLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CANCEL MATCH MODAL (Creator Only) */}
      <AnimatePresence>
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCancelModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-[24px] border border-[#e1e7df] bg-white p-6 shadow-2xl z-10 text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-[#17201c]">Cancel this Match?</h3>
              <p className="mt-1.5 text-xs text-[#717b73] leading-relaxed">
                This will mark the match as cancelled. If this match was linked to a confirmed court booking,
                the booking will also be cancelled consistently.
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="flex-1 rounded-xl border border-[#d9e1d7] py-2.5 text-xs font-bold text-[#556259]"
                >
                  Keep Match
                </button>
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={handleCancelMatch}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-extrabold text-white hover:bg-red-700 shadow"
                >
                  {isActionLoading ? "Cancelling..." : "Yes, Cancel"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LEAVE MATCH MODAL */}
      <AnimatePresence>
        {isLeaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLeaveModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-[24px] border border-[#e1e7df] bg-white p-6 shadow-2xl z-10 text-center"
            >
              <h3 className="text-base font-extrabold text-[#17201c]">Leave Match?</h3>
              <p className="mt-1.5 text-xs text-[#717b73] leading-relaxed">
                Your spot will be released immediately so another player can join.
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="flex-1 rounded-xl border border-[#d9e1d7] py-2.5 text-xs font-bold text-[#556259]"
                >
                  Stay
                </button>
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={handleLeave}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-extrabold text-white hover:bg-red-700 shadow"
                >
                  {isActionLoading ? "Leaving..." : "Confirm Leave"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INVITE PLAYERS MODAL */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg rounded-[28px] border border-[#e1e7df] bg-white p-6 sm:p-7 shadow-2xl z-10 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#edf1eb]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0fae1] text-[#456e18]">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#17201c]">Invite Players</h3>
                    <p className="text-xs text-[#7c867f]">
                      Send an in-app invite to join &ldquo;{match.title}&rdquo;
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="rounded-full p-1.5 text-[#7c867f] hover:bg-[#f7f8f4] hover:text-[#17201c]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Optional note input */}
              <div className="py-3">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#525f57] mb-1">
                  Invitation Note (Optional)
                </label>
                <input
                  type="text"
                  value={inviteNotes}
                  onChange={(e) => setInviteNotes(e.target.value)}
                  placeholder="e.g., We need one more player for doubles! Looking forward to playing."
                  className="w-full rounded-xl border border-[#d9e1d7] bg-[#f9faf7] px-3.5 py-2 text-xs text-[#17201c] placeholder:text-[#9ea8a1] focus:border-[#a8e63d] focus:outline-none"
                />
              </div>

              {/* Player list */}
              <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
                {loadingPlayers ? (
                  <div className="py-10 text-center text-xs text-[#7c867f]">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#a8e63d] border-t-transparent mb-2" />
                    <p>Finding eligible badminton players...</p>
                  </div>
                ) : availablePlayers.length === 0 ? (
                  <div className="py-10 text-center text-xs text-[#7c867f]">
                    <p className="font-semibold text-[#17201c]">No other active players available</p>
                    <p className="mt-1">All registered players may already be part of this match.</p>
                  </div>
                ) : (
                  availablePlayers.map((player) => {
                    const isInvited = invitedPlayerIds.includes(player.userId);
                    const isInviting = invitingId === player.userId;

                    return (
                      <div
                        key={player.id}
                        className="flex items-center justify-between rounded-2xl border border-[#edf1eb] p-3 hover:border-[#a8e63d]/70 transition"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={player.avatar || "/avatar-placeholder.png"}
                            alt={player.displayName}
                            className="h-10 w-10 rounded-full object-cover ring-2 ring-[#a8e63d]/60"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#17201c]">
                                {player.displayName}
                              </span>
                              <span className="rounded-full bg-[#f0fae1] px-2 py-0.5 text-[10px] font-bold text-[#3d6514]">
                                {player.skillLevel}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#7c867f] line-clamp-1">
                              {player.bio || `${player.playingPreference} • ${player.yearsOfExperience || 1} yrs exp`}
                            </p>
                          </div>
                        </div>

                        <button
                          disabled={isInvited || isInviting}
                          onClick={() => handleSendInvite(player.userId)}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                            isInvited
                              ? "bg-[#eaf7d5] text-[#365711] border border-[#a8e63d]/60 cursor-default"
                              : "bg-[#17201c] text-[#a8e63d] hover:bg-[#2c3a32] active:scale-95 shadow-sm"
                          }`}
                        >
                          {isInviting ? "Sending..." : isInvited ? "Invited ✓" : "Invite"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-3 border-t border-[#edf1eb] flex justify-end">
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="rounded-full bg-[#17201c] px-5 py-2 text-xs font-bold text-white hover:bg-[#2c3a32]"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUBMIT MATCH RESULT MODAL */}
      <AnimatePresence>
        {isResultModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsResultModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg rounded-[28px] border border-[#e1e7df] bg-white p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#edf1ea]">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-[#4e7d18]" />
                  <h3 className="text-base font-extrabold text-[#17201c]">Submit Match Score</h3>
                </div>
                <button
                  onClick={() => setIsResultModalOpen(false)}
                  className="rounded-full p-1 text-[#839187] hover:bg-[#edf1ea]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitResult} className="space-y-4 text-xs">
                {/* Team Assignment */}
                <div>
                  <label className="font-bold text-[#17201c] block mb-1.5">
                    Assign Participants to Teams:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Team 1 box */}
                    <div className="rounded-2xl border border-[#a8e63d]/60 bg-[#f4faec] p-3">
                      <span className="font-black text-[#3f6714] block mb-2">Team 1</span>
                      <div className="space-y-1.5">
                        {activeParticipants.map((p: any) => {
                          const inT1 = team1Players.includes(p.userId);
                          return (
                            <button
                              type="button"
                              key={p.userId}
                              onClick={() => {
                                if (inT1) {
                                  setTeam1Players(team1Players.filter((id) => id !== p.userId));
                                } else {
                                  setTeam1Players([...team1Players, p.userId]);
                                  setTeam2Players(team2Players.filter((id) => id !== p.userId));
                                }
                              }}
                              className={`w-full rounded-xl px-2.5 py-1.5 text-left font-bold transition flex items-center justify-between ${
                                inT1
                                  ? "bg-[#17201c] text-[#a8e63d]"
                                  : "bg-white border border-[#dce3d9] text-[#556258] hover:bg-[#edf2ea]"
                              }`}
                            >
                              <span className="truncate">{p.user?.name || `Player #${p.userId}`}</span>
                              <span>{inT1 ? "✓ T1" : "+ Add"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Team 2 box */}
                    <div className="rounded-2xl border border-[#dce3d9] bg-[#f9faf7] p-3">
                      <span className="font-black text-[#515e55] block mb-2">Team 2</span>
                      <div className="space-y-1.5">
                        {activeParticipants.map((p: any) => {
                          const inT2 = team2Players.includes(p.userId);
                          return (
                            <button
                              type="button"
                              key={p.userId}
                              onClick={() => {
                                if (inT2) {
                                  setTeam2Players(team2Players.filter((id) => id !== p.userId));
                                } else {
                                  setTeam2Players([...team2Players, p.userId]);
                                  setTeam1Players(team1Players.filter((id) => id !== p.userId));
                                }
                              }}
                              className={`w-full rounded-xl px-2.5 py-1.5 text-left font-bold transition flex items-center justify-between ${
                                inT2
                                  ? "bg-[#17201c] text-[#a8e63d]"
                                  : "bg-white border border-[#dce3d9] text-[#556258] hover:bg-[#edf2ea]"
                              }`}
                            >
                              <span className="truncate">{p.user?.name || `Player #${p.userId}`}</span>
                              <span>{inT2 ? "✓ T2" : "+ Add"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Set Scores Input */}
                <div className="pt-2 border-t border-[#edf1ea]">
                  <label className="font-bold text-[#17201c] block mb-2">Set-by-Set Scores:</label>
                  <div className="space-y-2">
                    {/* Set 1 */}
                    <div className="flex items-center gap-3 bg-[#f9faf7] p-2.5 rounded-xl border border-[#edf1ea]">
                      <span className="font-bold text-[#627066] w-14">Set 1:</span>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={set1T1}
                        onChange={(e) => setSet1T1(e.target.value)}
                        className="w-16 rounded-lg border border-[#d9e1d6] bg-white p-1.5 text-center font-bold text-sm focus:ring-2 focus:ring-[#a8e63d] focus:outline-none"
                      />
                      <span className="font-bold text-[#849287]">-</span>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={set1T2}
                        onChange={(e) => setSet1T2(e.target.value)}
                        className="w-16 rounded-lg border border-[#d9e1d6] bg-white p-1.5 text-center font-bold text-sm focus:ring-2 focus:ring-[#a8e63d] focus:outline-none"
                      />
                    </div>

                    {/* Set 2 */}
                    <div className="flex items-center gap-3 bg-[#f9faf7] p-2.5 rounded-xl border border-[#edf1ea]">
                      <span className="font-bold text-[#627066] w-14">Set 2:</span>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={set2T1}
                        onChange={(e) => setSet2T1(e.target.value)}
                        className="w-16 rounded-lg border border-[#d9e1d6] bg-white p-1.5 text-center font-bold text-sm focus:ring-2 focus:ring-[#a8e63d] focus:outline-none"
                      />
                      <span className="font-bold text-[#849287]">-</span>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={set2T2}
                        onChange={(e) => setSet2T2(e.target.value)}
                        className="w-16 rounded-lg border border-[#d9e1d6] bg-white p-1.5 text-center font-bold text-sm focus:ring-2 focus:ring-[#a8e63d] focus:outline-none"
                      />
                    </div>

                    {/* Set 3 (Optional) */}
                    <div className="flex items-center gap-3 bg-[#f9faf7] p-2.5 rounded-xl border border-[#edf1ea]">
                      <span className="font-bold text-[#627066] w-14">Set 3:</span>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        placeholder="opt"
                        value={set3T1}
                        onChange={(e) => setSet3T1(e.target.value)}
                        className="w-16 rounded-lg border border-[#d9e1d6] bg-white p-1.5 text-center font-bold text-sm focus:ring-2 focus:ring-[#a8e63d] focus:outline-none"
                      />
                      <span className="font-bold text-[#849287]">-</span>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        placeholder="opt"
                        value={set3T2}
                        onChange={(e) => setSet3T2(e.target.value)}
                        className="w-16 rounded-lg border border-[#d9e1d6] bg-white p-1.5 text-center font-bold text-sm focus:ring-2 focus:ring-[#a8e63d] focus:outline-none"
                      />
                      <span className="text-[10px] text-[#86948a] italic">(optional tie-break)</span>
                    </div>
                  </div>
                </div>

                {/* Match Winner Selection */}
                <div className="pt-2 border-t border-[#edf1ea]">
                  <label className="font-bold text-[#17201c] block mb-1.5">Match Winner:</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setWinnerTeamChoice(1)}
                      className={`flex-1 rounded-xl py-2 font-black transition ${
                        winnerTeamChoice === 1
                          ? "bg-[#17201c] text-[#a8e63d] shadow-sm"
                          : "bg-[#edf1ea] text-[#5b685f]"
                      }`}
                    >
                      Team 1 Won
                    </button>
                    <button
                      type="button"
                      onClick={() => setWinnerTeamChoice(2)}
                      className={`flex-1 rounded-xl py-2 font-black transition ${
                        winnerTeamChoice === 2
                          ? "bg-[#17201c] text-[#a8e63d] shadow-sm"
                          : "bg-[#edf1ea] text-[#5b685f]"
                      }`}
                    >
                      Team 2 Won
                    </button>
                    <button
                      type="button"
                      onClick={() => setWinnerTeamChoice(null)}
                      className={`rounded-xl px-3 py-2 font-bold transition ${
                        winnerTeamChoice === null
                          ? "bg-[#17201c] text-white"
                          : "bg-[#edf1ea] text-[#5b685f]"
                      }`}
                    >
                      Draw
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsResultModalOpen(false)}
                    className="flex-1 rounded-xl border border-[#d8e0d6] py-2.5 font-bold text-[#556258] hover:bg-[#edf1ea]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActionLoading || team1Players.length === 0 || team2Players.length === 0}
                    className="flex-1 rounded-xl bg-[#a8e63d] py-2.5 font-extrabold text-[#17201c] hover:bg-[#b8ef59] transition shadow disabled:opacity-50"
                  >
                    {isActionLoading ? "Submitting..." : "Submit Score"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DISPUTE MODAL */}
      <AnimatePresence>
        {isDisputeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDisputeModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-[24px] border border-[#e1e7df] bg-white p-6 shadow-2xl z-10"
            >
              <div className="flex items-center gap-2 text-red-600 mb-3">
                <AlertCircle className="h-5 w-5" />
                <h3 className="text-base font-extrabold text-[#17201c]">Dispute Match Score</h3>
              </div>
              <p className="text-xs text-[#6e7b72] mb-4">
                Please state the reason for disputing this score. Disputing stops this result from affecting official rankings until resolved.
              </p>

              <form onSubmit={handleDisputeResult} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#17201c] block mb-1">
                    Dispute Reason *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="e.g. In Set 2 the score was 21-19, not 21-15, and Team 2 won..."
                    className="w-full rounded-xl border border-[#d8e0d6] bg-[#f9faf7] p-2.5 focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDisputeModalOpen(false)}
                    className="flex-1 rounded-xl border border-[#d8e0d6] py-2 font-bold text-[#556258] hover:bg-[#edf1ea]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActionLoading || !disputeReason.trim()}
                    className="flex-1 rounded-xl bg-red-600 py-2 font-bold text-white hover:bg-red-700 transition shadow disabled:opacity-50"
                  >
                    {isActionLoading ? "Submitting..." : "Dispute Score"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POST-MATCH PLAYER RATING MODAL */}
      <AnimatePresence>
        {isRatingModalOpen && ratingRecipient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRatingModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-[24px] border border-[#e1e7df] bg-white p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                  <h3 className="text-base font-extrabold text-[#17201c]">Rate {ratingRecipient.name}</h3>
                </div>
                <button
                  onClick={() => setIsRatingModalOpen(false)}
                  className="rounded-full p-1 text-[#839187] hover:bg-[#edf1ea]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-[#6e7b72] mb-4">
                Share constructive sportsmanship feedback for your fellow player.
              </p>

              <form onSubmit={handleSubmitRating} className="space-y-3.5 text-xs">
                {/* 1-5 Star Picker */}
                <div className="text-center py-2">
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRatingStars(s)}
                        className="p-1 hover:scale-125 transition"
                      >
                        <Star
                          className={`h-7 w-7 ${
                            s <= ratingStars
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="block mt-1 font-bold text-xs text-[#526056]">
                    {ratingStars === 5
                      ? "5 Stars - Excellent sportsmanship!"
                      : ratingStars === 4
                      ? "4 Stars - Great partner/opponent"
                      : ratingStars === 3
                      ? "3 Stars - Good game"
                      : ratingStars === 2
                      ? "2 Stars - Fair play issues"
                      : "1 Star - Poor court conduct"}
                  </span>
                </div>

                <div>
                  <label className="font-bold text-[#17201c] block mb-1">
                    Optional Comment (max 500 chars)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="e.g. Great rallies, punctual and respectful on court!"
                    className="w-full rounded-xl border border-[#d8e0d6] bg-[#f9faf7] p-2.5 focus:outline-none focus:ring-2 focus:ring-[#a8e63d]"
                  />
                  <span className="text-[10px] text-[#849287] block text-right">
                    {ratingComment.length}/500
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRatingModalOpen(false)}
                    className="flex-1 rounded-xl border border-[#d8e0d6] py-2.5 font-bold text-[#556258] hover:bg-[#edf1ea]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="flex-1 rounded-xl bg-[#a8e63d] py-2.5 font-extrabold text-[#17201c] hover:bg-[#b8ef59] transition shadow"
                  >
                    {isActionLoading ? "Submitting..." : "Submit Rating"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile persistent floating join bar */}
      {!isCancelled && !isJoined && !isCreator && !isFull && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#DDE5DB] bg-white/95 px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden shadow-[0_-8px_30px_rgba(23,32,28,0.12)]">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-[#17201c] truncate">{match.title}</p>
              <span className="text-[11px] font-bold text-[#55811b]">{match.remainingSpots} spot(s) open</span>
            </div>
            <button
              onClick={handleJoin}
              disabled={isActionLoading}
              className="rounded-full bg-[#a8e63d] px-5 py-2.5 text-xs font-black text-[#17201c] shadow transition hover:bg-[#b8ef59] active:scale-95 disabled:opacity-50 shrink-0"
            >
              {isActionLoading ? "Reserving..." : "Join Match"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
