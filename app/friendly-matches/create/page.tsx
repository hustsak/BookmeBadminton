"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
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
  Layers,
} from "lucide-react";

export default function CreateMatchPage() {
  const router = useRouter();
  const { user, openLoginModal, refreshMatches } = useApp();

  const [venues, setVenues] = useState<any[]>([]);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [isLoadingVenues, setIsLoadingVenues] = useState(true);

  // Form State
  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const [title, setTitle] = useState("");
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [selectedCourtId, setSelectedCourtId] = useState<string>("none");
  const [selectedBookingId, setSelectedBookingId] = useState<string>("none");
  const [date, setDate] = useState(tomorrowStr);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [skillLevel, setSkillLevel] = useState<"All Levels" | "Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [format, setFormat] = useState<"Doubles" | "Singles">("Doubles");
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [feePerPerson, setFeePerPerson] = useState<number>(50000);
  const [shuttlecockProvided, setShuttlecockProvided] = useState(true);
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load venues and existing user bookings from API
  useEffect(() => {
    async function loadData() {
      setIsLoadingVenues(true);
      try {
        const resVenues = await fetch("/api/venues");
        const venuesData = await resVenues.json();
        if (venuesData.success && Array.isArray(venuesData.venues)) {
          setVenues(venuesData.venues);
          if (venuesData.venues.length > 0) {
            setSelectedVenueId(venuesData.venues[0].id);
          }
        }

        if (user?.id) {
          const resBookings = await fetch(`/api/bookings?userId=${user.id}&status=CONFIRMED`);
          const bookingsData = await resBookings.json();
          if (bookingsData.success && Array.isArray(bookingsData.bookings)) {
            setUserBookings(bookingsData.bookings);
          }
        }
      } catch (err) {
        console.error("Error loading create-match data:", err);
      } finally {
        setIsLoadingVenues(false);
      }
    }
    loadData();
  }, [user?.id]);

  // Adjust max players when format toggles if user hasn't customized it
  const handleFormatChange = (newFormat: "Doubles" | "Singles") => {
    setFormat(newFormat);
    if (newFormat === "Singles") {
      setMaxPlayers(2);
    } else {
      setMaxPlayers(4);
    }
  };

  const selectedVenue = venues.find((v) => v.id === selectedVenueId);
  const courtsList = selectedVenue?.courts || [];

  // When linking an existing booking, auto-fill venue, court, date, and times
  const handleBookingLink = (bookingIdStr: string) => {
    setSelectedBookingId(bookingIdStr);
    if (bookingIdStr !== "none") {
      const b = userBookings.find((bk) => String(bk.id) === bookingIdStr);
      if (b) {
        if (b.court?.venueId) {
          setSelectedVenueId(b.court.venueId);
        }
        if (b.courtId) {
          setSelectedCourtId(String(b.courtId));
        }
        if (b.bookingDate) {
          setDate(b.bookingDate.slice(0, 10));
        }
        if (b.startTime) {
          setStartTime(b.startTime);
        }
        if (b.endTime) {
          setEndTime(b.endTime);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!user) {
      openLoginModal();
      return;
    }

    if (!title.trim() || title.trim().length < 3) {
      setErrorMessage("Please enter a match title of at least 3 characters.");
      return;
    }

    if (!selectedVenueId) {
      setErrorMessage("Please select a badminton venue.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (date < todayStr) {
      setErrorMessage("Match date cannot be in the past.");
      return;
    }

    if (startTime >= endTime) {
      setErrorMessage("End time must be later than start time.");
      return;
    }

    if (maxPlayers < 2 || maxPlayers > 16) {
      setErrorMessage("Player limit must be between 2 and 16 players.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        userId: user.id,
        title: title.trim(),
        venueId: selectedVenueId,
        date,
        startTime,
        endTime,
        skillLevel,
        maxPlayers: Number(maxPlayers),
        format,
        feePerPerson: Number(feePerPerson) || 0,
        shuttlecockProvided,
        description: description.trim() || undefined,
      };

      if (selectedCourtId && selectedCourtId !== "none") {
        payload.courtId = parseInt(selectedCourtId, 10);
      }

      if (selectedBookingId && selectedBookingId !== "none") {
        payload.bookingId = parseInt(selectedBookingId, 10);
      }

      const res = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Failed to create open match.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage("Open match created successfully! Redirecting...");
      await refreshMatches();

      setTimeout(() => {
        router.push(`/friendly-matches/${data.match.id}`);
      }, 1200);
    } catch (err: any) {
      console.error("Match creation error:", err);
      setErrorMessage("Network error occurred while creating match.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F7F8F4] text-[#17201C] pb-24">
      <Navbar />
      <LoginModal />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-6 sm:pt-10">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs text-[#7c867f]">
          <Link
            href="/friendly-matches"
            className="flex items-center gap-1.5 font-semibold hover:text-[#17201c] transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Friendly Matches
          </Link>
          <span>/</span>
          <span className="text-[#17201c] font-bold">Host New Open Match</span>
        </div>

        {/* Page Header Card */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#17201c] via-[#1d2b24] to-[#121c17] p-6 sm:p-10 text-white shadow-xl mb-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#a8e63d]/15 blur-3xl" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-xs font-semibold backdrop-blur mb-3">
              <Sparkles className="h-3.5 w-3.5 text-[#a8e63d]" />
              <span className="text-[#e2f5b8]">Match Maker</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Host an Open Match<span className="text-[#a8e63d]">.</span>
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-[#c6d1c9] max-w-2xl leading-relaxed">
              Organize a casual game, practice drills, or doubles sparring session. Fill your court,
              meet fellow badminton enthusiasts, and split court expenses transparently.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="rounded-[28px] border border-[#e1e7df] bg-white p-6 sm:p-10 shadow-sm">
          {errorMessage && (
            <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Match Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#546057] mb-2">
                Match Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Weekend Doubles Sparring (Need 1 more player!)"
                className="w-full rounded-2xl border border-[#e1e7df] bg-[#f8faf7] px-4 py-3.5 text-sm font-medium text-[#17201c] outline-none transition focus:border-[#a8e63d] focus:bg-white"
              />
            </div>

            {/* Section 2: Venue & Optional Court Selection */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#546057] mb-2">
                  Venue Location *
                </label>
                <select
                  required
                  value={selectedVenueId || ""}
                  onChange={(e) => {
                    setSelectedVenueId(Number(e.target.value));
                    setSelectedCourtId("none");
                  }}
                  className="w-full rounded-2xl border border-[#e1e7df] bg-[#f8faf7] px-4 py-3.5 text-sm font-semibold text-[#17201c] outline-none transition focus:border-[#a8e63d] focus:bg-white"
                >
                  {isLoadingVenues ? (
                    <option>Loading venues...</option>
                  ) : (
                    venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.location})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#546057] mb-2">
                  Court Preference (Optional)
                </label>
                <select
                  value={selectedCourtId}
                  onChange={(e) => setSelectedCourtId(e.target.value)}
                  className="w-full rounded-2xl border border-[#e1e7df] bg-[#f8faf7] px-4 py-3.5 text-sm font-semibold text-[#17201c] outline-none transition focus:border-[#a8e63d] focus:bg-white"
                >
                  <option value="none">No court selected yet (Casual / Venue Walk-in)</option>
                  {courtsList.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.surface ? `(${c.surface})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Booking Integration Notice & Link */}
            <div className="rounded-2xl border border-[#e5ebe3] bg-[#f6f9f4] p-4 text-xs text-[#526056]">
              <div className="flex items-start gap-2.5">
                <Info className="h-4 w-4 shrink-0 text-[#71a129] mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-[#17201c]">
                    Court Booking Status & Distinction
                  </p>
                  <p>
                    Selecting a court preference does <span className="font-bold text-[#222]">not</span> reserve a court automatically. A court is only confirmed if linked to a valid booking pass.
                  </p>
                  {userBookings.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-[#e2e8df]">
                      <span className="block font-bold text-[#354339] mb-1.5">
                        Link one of your active bookings to guarantee this match:
                      </span>
                      <select
                        value={selectedBookingId}
                        onChange={(e) => handleBookingLink(e.target.value)}
                        className="rounded-xl border border-[#d6dfd3] bg-white px-3 py-1.5 text-xs font-semibold text-[#17201c] outline-none"
                      >
                        <option value="none">None (Match without confirmed booking)</option>
                        {userBookings.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bookingCode || `BK-${b.id}`} — {b.court?.venue?.name} ({b.court?.name}) on{" "}
                            {b.bookingDate?.slice(0, 10)} @ {b.startTime}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Date and Time Schedule */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#546057] mb-2">
                  Match Date *
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-2xl border border-[#e1e7df] bg-[#f8faf7] px-4 py-3 text-sm font-semibold text-[#17201c] outline-none transition focus:border-[#a8e63d] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#546057] mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-2xl border border-[#e1e7df] bg-[#f8faf7] px-4 py-3 text-sm font-semibold text-[#17201c] outline-none transition focus:border-[#a8e63d] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#546057] mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-2xl border border-[#e1e7df] bg-[#f8faf7] px-4 py-3 text-sm font-semibold text-[#17201c] outline-none transition focus:border-[#a8e63d] focus:bg-white"
                />
              </div>
            </div>

            {/* Section 4: Skill Level, Format & Player Limit */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#546057] mb-2">
                  Skill Level
                </label>
                <select
                  value={skillLevel}
                  onChange={(e: any) => setSkillLevel(e.target.value)}
                  className="w-full rounded-2xl border border-[#e1e7df] bg-[#f8faf7] px-4 py-3.5 text-sm font-semibold text-[#17201c] outline-none transition focus:border-[#a8e63d] focus:bg-white"
                >
                  <option value="All Levels">All Levels Welcome</option>
                  <option value="Beginner">Beginner (1 - 2 yrs)</option>
                  <option value="Intermediate">Intermediate (Sparring)</option>
                  <option value="Advanced">Advanced (Tournament)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#546057] mb-2">
                  Format
                </label>
                <div className="flex rounded-2xl border border-[#e1e7df] bg-[#f8faf7] p-1 font-bold text-xs">
                  <button
                    type="button"
                    onClick={() => handleFormatChange("Doubles")}
                    className={`flex-1 rounded-xl py-2.5 transition ${
                      format === "Doubles"
                        ? "bg-white text-[#17201c] shadow-sm"
                        : "text-[#7c867f] hover:text-[#17201c]"
                    }`}
                  >
                    Doubles
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFormatChange("Singles")}
                    className={`flex-1 rounded-xl py-2.5 transition ${
                      format === "Singles"
                        ? "bg-white text-[#17201c] shadow-sm"
                        : "text-[#7c867f] hover:text-[#17201c]"
                    }`}
                  >
                    Singles
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#546057] mb-2">
                  Player Limit (2 - 16) *
                </label>
                <input
                  type="number"
                  required
                  min={2}
                  max={16}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10) || 2)}
                  className="w-full rounded-2xl border border-[#e1e7df] bg-[#f8faf7] px-4 py-3 text-sm font-bold text-[#17201c] outline-none transition focus:border-[#a8e63d] focus:bg-white"
                />
              </div>
            </div>

            {/* Section 5: Cost Sharing & Shuttlecocks */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#546057] mb-2">
                  Split Fee Per Player (VND)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={feePerPerson}
                    onChange={(e) => setFeePerPerson(parseInt(e.target.value, 10) || 0)}
                    placeholder="50000"
                    className="w-full rounded-2xl border border-[#e1e7df] bg-[#f8faf7] px-4 py-3 text-sm font-bold text-[#17201c] outline-none transition focus:border-[#a8e63d] focus:bg-white"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#828d85]">
                    VND
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#546057] mb-2">
                  Shuttlecock Provided?
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShuttlecockProvided(true)}
                    className={`flex-1 rounded-2xl border py-3 text-xs font-bold transition ${
                      shuttlecockProvided
                        ? "border-[#a8e63d] bg-[#f0fae1] text-[#4f781a]"
                        : "border-[#e1e7df] bg-[#f8faf7] text-[#717b74]"
                    }`}
                  >
                    🏸 Yes, Feather Shuttles
                  </button>
                  <button
                    type="button"
                    onClick={() => setShuttlecockProvided(false)}
                    className={`flex-1 rounded-2xl border py-3 text-xs font-bold transition ${
                      !shuttlecockProvided
                        ? "border-[#a8e63d] bg-[#f0fae1] text-[#4f781a]"
                        : "border-[#e1e7df] bg-[#f8faf7] text-[#717b74]"
                    }`}
                  >
                    BYO / Shared Purchase
                  </button>
                </div>
              </div>
            </div>

            {/* Section 6: Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#546057] mb-2">
                Session Description & Guidelines
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share rally style, warm-up routine, level expectations, or any house rules..."
                className="w-full rounded-2xl border border-[#e1e7df] bg-[#f8faf7] p-4 text-xs sm:text-sm font-medium text-[#17201c] outline-none transition focus:border-[#a8e63d] focus:bg-white resize-none"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#edf1ea]">
              <Link
                href="/friendly-matches"
                className="text-xs font-bold text-[#68736b] hover:text-[#17201c] transition"
              >
                Cancel and Return
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-[#a8e63d] px-8 py-4 text-sm font-extrabold text-[#17201c] shadow-lg transition hover:bg-[#b8ef59] hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Publishing Match...</span>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    Publish Open Match
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
