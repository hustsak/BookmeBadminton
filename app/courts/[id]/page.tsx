"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Clock3,
  Copy,
  Info,
  LayoutGrid,
  Lock,
  MapPin,
  Minus,
  Phone,
  Plus,
  Printer,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Table,
  User,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { LoginModal } from "@/components/LoginModal";
import { CalendarModal } from "@/components/CalendarModal";
import { PaymentQRModal } from "@/components/PaymentQRModal";
import { useApp } from "@/context/AppContext";

type Court = {
  id: number;
  name: string;
  priceHour: number;
  image?: string;
  surface?: string;
};

type Venue = {
  id: number;
  name: string;
  location: string;
  address?: string;
  rating: number;
  reviewCount: number;
  description: string;
  imageUrl: string;
  openTime?: string;
  closeTime?: string;
  courts: Court[];
};

type SlotDetail = {
  time: string;
  endTime: string;
  status: "AVAILABLE" | "BOOKED" | "MAINTENANCE" | "PAST";
  available: boolean;
  reason?: string;
  allowedDurations: number[];
};

const FALLBACK_VENUES: Record<string, Venue> = {
  "1": {
    id: 4,
    name: "Smash Arena",
    location: "Thanh Xuan, Hanoi",
    address: "125 Nguyen Trai, Thanh Xuan, Hanoi",
    rating: 4.9,
    reviewCount: 128,
    description:
      "Premium badminton venue with professional courts, clean facilities, LED lighting, and a comfortable player-first environment.",
    imageUrl: "/court_image/c1.jpeg",
    openTime: "06:00",
    closeTime: "23:00",
    courts: [
      { id: 11, name: "Court 01", priceHour: 100000, image: "/court_image/c1.jpeg", surface: "Taraflex Pro Turf" },
      { id: 12, name: "Court 02", priceHour: 100000, image: "/court_image/c2.jpeg", surface: "Tournament Blue Mat" },
      { id: 13, name: "Court 03", priceHour: 120000, image: "/court_image/c3.jpeg", surface: "Center Court Stadium" },
      { id: 14, name: "Court 04", priceHour: 120000, image: "/court_image/c4.jpg", surface: "Training Arena" },
    ],
  },
  "2": {
    id: 5,
    name: "Victory Badminton Club",
    location: "Cau Giay, Hanoi",
    address: "88 Xuan Thuy, Cau Giay, Hanoi",
    rating: 4.8,
    reviewCount: 96,
    description:
      "Spacious badminton club designed for casual games, training sessions, and competitive players.",
    imageUrl: "/court_image/c2.jpeg",
    openTime: "06:30",
    closeTime: "22:30",
    courts: [
      { id: 15, name: "Court 01", priceHour: 110000, image: "/court_image/c2.jpeg", surface: "Taraflex Mat" },
      { id: 16, name: "Court 02", priceHour: 110000, image: "/court_image/c5.webp", surface: "Pro Wooden Floor" },
      { id: 17, name: "Court 03", priceHour: 130000, image: "/court_image/c6.webp", surface: "Tournament Arena" },
    ],
  },
  "3": {
    id: 6,
    name: "Pro Court",
    location: "Dong Da, Hanoi",
    address: "45 Chua Boc, Dong Da, Hanoi",
    rating: 4.7,
    reviewCount: 74,
    description:
      "Professional-grade badminton facility with high-quality flooring and tournament-ready courts.",
    imageUrl: "/court_image/c3.jpeg",
    openTime: "06:00",
    closeTime: "23:00",
    courts: [
      { id: 18, name: "Court 01", priceHour: 130000, image: "/court_image/c3.jpeg", surface: "Tournament Green" },
      { id: 19, name: "Court 02", priceHour: 130000, image: "/court_image/c1.jpeg", surface: "Taraflex Pro" },
      { id: 20, name: "Court 03", priceHour: 150000, image: "/court_image/c4.jpg", surface: "Olympic Standard" },
    ],
  },
};

function formatPrice(value: number) {
  return `${value.toLocaleString("en-US")}₫`;
}

function getDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function CourtPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const dateFromQuery = searchParams?.get("date");
  const router = useRouter();
  const { user, addBooking, refreshBookings, getVenueById } = useApp();

  const rawVenueId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  // 1. Venue Data Loading from API or fallback
  const [venue, setVenue] = useState<Venue>(() => {
    const fallback = FALLBACK_VENUES[String(rawVenueId)] || FALLBACK_VENUES["1"];
    const dynamic = getVenueById(String(rawVenueId));
    if (dynamic) {
      return {
        id: dynamic.id,
        name: dynamic.name,
        location: dynamic.location,
        address: dynamic.address || dynamic.location,
        rating: dynamic.rating,
        reviewCount: dynamic.reviews,
        description: dynamic.description,
        imageUrl: dynamic.image,
        openTime: dynamic.openingHours?.split(" - ")[0] || "06:00",
        closeTime: dynamic.openingHours?.split(" - ")[1] || "23:00",
        courts: dynamic.courtsList && dynamic.courtsList.length > 0
          ? dynamic.courtsList
          : fallback.courts,
      };
    }
    return fallback;
  });

  // Fetch full venue details from API
  useEffect(() => {
    let isMounted = true;
    async function loadVenue() {
      try {
        const res = await fetch(`/api/venues/${rawVenueId}`);
        const data = await res.json();
        if (isMounted && data.success && data.venue) {
          const v = data.venue;
          setVenue({
            id: v.id,
            name: v.name,
            location: v.location,
            address: v.address || v.location,
            rating: v.rating || 4.9,
            reviewCount: v.reviewCount || 100,
            description: v.description || "Premium badminton venue.",
            imageUrl: v.imageUrl || "/court_image/c1.jpeg",
            openTime: v.openTime || "06:00",
            closeTime: v.closeTime || "23:00",
            courts: v.courts?.map((c: any) => ({
              id: c.id,
              name: c.name,
              priceHour: c.priceHour,
              image: v.imageUrl || "/court_image/c1.jpeg",
              surface: c.surface || "Taraflex Pro Turf",
            })) || [],
          });
        }
      } catch (e) {
        console.warn("Failed to load venue from API, using cached venue:", e);
      }
    }
    loadVenue();
    return () => {
      isMounted = false;
    };
  }, [rawVenueId]);

  // Selected Court
  const [selectedCourt, setSelectedCourt] = useState<Court>(venue.courts[0] || {
    id: 11,
    name: "Court 01",
    priceHour: 100000,
    surface: "Taraflex Pro Turf",
  });

  // Keep selected court in sync when venue courts load
  useEffect(() => {
    if (venue.courts && venue.courts.length > 0) {
      const exists = venue.courts.find((c) => c.id === selectedCourt.id);
      if (!exists) {
        setSelectedCourt(venue.courts[0]);
      }
    }
  }, [venue.courts]);

  // Date selection (Disable past dates)
  const todayStr = useMemo(() => getDateString(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(() => {
    if (dateFromQuery && /^\d{4}-\d{2}-\d{2}$/.test(dateFromQuery)) {
      if (dateFromQuery >= todayStr) return dateFromQuery;
    }
    return todayStr;
  });

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Time & Duration Selection
  const [selectedTime, setSelectedTime] = useState("18:00");
  const [duration, setDuration] = useState(1);
  const [scheduleView, setScheduleView] = useState<"slots" | "timetable">("slots");
  const [slotPeriod, setSlotPeriod] = useState<"all" | "morning" | "afternoon" | "evening">("all");

  // Customer Contact Info State
  const [customerName, setCustomerName] = useState(user?.name || "Alex Nguyen");
  const [customerEmail, setCustomerEmail] = useState(user?.email || "alex.nguyen@example.com");
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "0912 345 678");
  const [bookingNotes, setBookingNotes] = useState("");

  // Sync customer details when user changes
  useEffect(() => {
    if (user) {
      if (user.name) setCustomerName(user.name);
      if (user.email) setCustomerEmail(user.email);
      if (user.phone) setCustomerPhone(user.phone);
    }
  }, [user]);

  // Server-Backed Availability State
  const [slots, setSlots] = useState<SlotDetail[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const [availabilityStats, setAvailabilityStats] = useState({
    total: 0,
    available: 0,
    booked: 0,
    maintenance: 0,
  });

  // Booking Flow States
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [serverCreatedBooking, setServerCreatedBooking] = useState<any | null>(null);

  // Idempotency key per user interaction session
  const idempotencyKeyRef = useRef<string>(`IDEM-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

  // Fetch Database-Backed Availability
  const fetchAvailability = useCallback(async () => {
    if (!selectedCourt?.id || !selectedDate) return;
    setIsLoadingAvailability(true);
    try {
      const res = await fetch(`/api/availability?courtId=${selectedCourt.id}&date=${selectedDate}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSlots(json.data.slots || []);
        setAvailabilityStats({
          total: json.data.totalSlots || 0,
          available: json.data.availableSlotsCount || 0,
          booked: json.data.bookedSlotsCount || 0,
          maintenance: json.data.maintenanceSlotsCount || 0,
        });

        // Ensure currently selected time is valid; if not, pick first available slot
        const currentSlot = json.data.slots.find((s: SlotDetail) => s.time === selectedTime);
        if (!currentSlot || !currentSlot.available) {
          const firstAvailable = json.data.slots.find((s: SlotDetail) => s.available);
          if (firstAvailable) {
            setSelectedTime(firstAvailable.time);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch availability:", err);
    } finally {
      setIsLoadingAvailability(false);
    }
  }, [selectedCourt?.id, selectedDate]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Consecutive slot conflict calculation for selected start time + duration
  const conflictDetails = useMemo(() => {
    if (slots.length === 0) return { hasConflict: false, conflicts: [] };

    const selectedIndex = slots.findIndex((s) => s.time === selectedTime);
    if (selectedIndex === -1) {
      return { hasConflict: true, conflicts: [`${selectedTime} is not an operating slot`] };
    }

    const conflicts: string[] = [];
    for (let i = 0; i < duration; i++) {
      const targetSlot = slots[selectedIndex + i];
      if (!targetSlot) {
        conflicts.push(`Slot +${i}h exceeds venue operating hours`);
      } else if (!targetSlot.available) {
        conflicts.push(`${targetSlot.time} (${targetSlot.reason || targetSlot.status})`);
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }, [slots, selectedTime, duration]);

  // Allowed durations for selected start time
  const currentSlotDetail = useMemo(() => {
    return slots.find((s) => s.time === selectedTime);
  }, [slots, selectedTime]);

  // Filter slots for period (Morning / Afternoon / Evening)
  const displayedSlots = useMemo(() => {
    if (slotPeriod === "morning") {
      return slots.filter((s) => {
        const h = parseInt(s.time.split(":")[0], 10);
        return h >= 5 && h <= 11;
      });
    }
    if (slotPeriod === "afternoon") {
      return slots.filter((s) => {
        const h = parseInt(s.time.split(":")[0], 10);
        return h >= 12 && h <= 17;
      });
    }
    if (slotPeriod === "evening") {
      return slots.filter((s) => {
        const h = parseInt(s.time.split(":")[0], 10);
        return h >= 18 && h <= 23;
      });
    }
    return slots;
  }, [slots, slotPeriod]);

  // 7-day quick date picker items
  const dates = useMemo(() => {
    const list = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + index);

      return {
        value: getDateString(date),
        label: formatDate(date),
      };
    });

    const exists = list.some((d) => d.value === selectedDate);
    if (!exists && selectedDate) {
      const customDate = new Date(selectedDate + "T00:00:00");
      list.push({
        value: selectedDate,
        label: formatDate(customDate),
      });
    }

    return list;
  }, [selectedDate]);

  const totalPrice = selectedCourt.priceHour * duration;

  // Step 8: Confirm Booking Server-side with Concurrency Protection
  async function handleReserve() {
    if (isBooking) return;

    if (conflictDetails.hasConflict) {
      setErrorMessage(
        `Time conflict: ${conflictDetails.conflicts.join(", ")}. Please choose an available consecutive slot.`
      );
      return;
    }

    if (!customerName.trim() || !customerEmail.trim()) {
      setErrorMessage("Please enter customer name and email address below.");
      if (typeof document !== "undefined") {
        document.getElementById("customer-details-section")?.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    setIsBooking(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId: selectedCourt.id,
          bookingDate: selectedDate,
          startTime: selectedTime,
          duration,
          userId: user?.id,
          customerName,
          customerEmail,
          customerPhone,
          notes: bookingNotes,
          paymentMethod: "VIETQR",
          idempotencyKey: idempotencyKeyRef.current,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 409) {
          setErrorMessage(
            data.message || "This court slot was just reserved by another player. Please select another slot."
          );
          // Immediately refresh availability to show newly occupied slot
          await fetchAvailability();
        } else {
          setErrorMessage(data.message || "Unable to confirm booking. Please review your details.");
        }
        setIsBooking(false);
        return;
      }

      // Successful server-side reservation
      const createdBooking = data.booking;
      setServerCreatedBooking(createdBooking);
      setIsBooking(false);

      // Open VietQR payment modal to proceed with official payment
      setIsPaymentModalOpen(true);
    } catch (err: any) {
      console.error("Booking error:", err);
      setErrorMessage("Network error occurred. Please check your connection and retry.");
      setIsBooking(false);
    }
  }

  // Step 9 & 10: Payment Success and Confirmation Pass
  function handlePaymentSuccess() {
    setIsPaymentModalOpen(false);

    if (serverCreatedBooking) {
      // Synchronize into AppContext for instant reflection across My Bookings
      addBooking({
        venueId: venue.id,
        venueName: venue.name,
        venueImage: venue.imageUrl,
        courtName: selectedCourt.name,
        location: venue.address || venue.location,
        date: selectedDate,
        timeSlot: `${selectedTime} - ${serverCreatedBooking.endTime || ""}`,
        duration,
        totalPrice: selectedCourt.priceHour * duration,
        customerName,
        customerEmail,
        customerPhone,
      });

      refreshBookings();

      // Show confirmation pass
      setBookingSuccessData(serverCreatedBooking);
      // Generate new idempotency key for next booking
      idempotencyKeyRef.current = `IDEM-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F8F4] text-[#17201C] pb-36 lg:pb-12 w-full max-w-full overflow-x-hidden">
      <Navbar />
      <LoginModal />

      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-[#A8E63D]/10 blur-3xl" />
        <div className="absolute -right-40 top-[40%] h-96 w-96 rounded-full bg-[#62D9C3]/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-12 w-full min-w-0">
        {/* BREADCRUMB NAVIGATION */}
        <div className="mb-3 flex items-center gap-2 text-xs text-[#7c877f]">
          <Link href="/" className="hover:text-[#17201c] flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> All Venues
          </Link>
          <span>/</span>
          <span className="font-semibold text-[#17201c] truncate">{venue.name}</span>
        </div>

        {/* VENUE HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-5 sm:mb-8"
        >
          <div className="mb-2.5 sm:mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="rounded-full bg-[#DFF7F0] px-3 py-1 text-[11px] sm:text-xs font-bold text-[#276B5C]">
              BWF CERTIFIED VENUE
            </span>

            <span className="flex items-center gap-1 text-xs sm:text-sm font-semibold">
              <Star size={14} fill="currentColor" className="text-[#F0B429]" />
              {venue.rating}
              <span className="font-normal text-[#68736C]">
                ({venue.reviewCount} reviews)
              </span>
            </span>

            <span className="rounded-full bg-[#F2FBE7] px-2.5 py-1 text-[11px] font-bold text-[#426a17] border border-[#a8e63d]/30">
              Hours: {venue.openTime || "06:00"} - {venue.closeTime || "23:00"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-5xl lg:text-6xl font-black tracking-[-0.04em] text-[#17201C] break-words">
            {venue.name}
          </h1>

          <div className="mt-2 sm:mt-3 flex items-center gap-2 text-xs sm:text-sm text-[#68736C]">
            <MapPin size={15} className="text-[#78a72b] shrink-0" />
            <span className="truncate">{venue.address || venue.location}</span>
          </div>
        </motion.div>

        {/* HERO IMAGE & COURT PHOTO SWITCHER */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mb-6 sm:mb-10 h-[220px] sm:h-[420px] overflow-hidden rounded-[24px] sm:rounded-[32px] bg-[#17201C] shadow-[0_15px_50px_rgba(23,32,28,0.10)] w-full"
        >
          <img
            key={selectedCourt.id}
            src={selectedCourt.image || venue.imageUrl}
            alt={selectedCourt.name}
            className="h-full w-full object-cover opacity-90 transition-opacity duration-300"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#17201C]/85 via-black/20 to-black/30 pointer-events-none" />

          {/* Top badges on hero image */}
          <div className="absolute top-3 left-3 right-3 sm:top-5 sm:left-5 sm:right-5 flex items-center justify-between gap-2 z-10 flex-wrap">
            <span className="rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold text-white border border-white/25 truncate max-w-[70%]">
              {selectedCourt.name} · {selectedCourt.surface || "Taraflex Pro Mat"}
            </span>
            <span className="rounded-full bg-[#A8E63D] px-2.5 py-1 text-[11px] font-black text-[#17201C] shrink-0 shadow-sm">
              {formatPrice(selectedCourt.priceHour)}/h
            </span>
          </div>

          {/* Bottom Interactive Court Photo Chooser */}
          <div className="absolute bottom-3 left-3 right-3 sm:bottom-5 sm:left-5 sm:right-5 flex items-end justify-between gap-2 z-10">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 max-w-full">
              {venue.courts.map((court) => {
                const isCurrent = selectedCourt.id === court.id;
                return (
                  <button
                    key={court.id}
                    onClick={() => {
                      setSelectedCourt(court);
                      setErrorMessage("");
                    }}
                    className={`group relative shrink-0 overflow-hidden rounded-xl border-2 transition-all active:scale-95 ${
                      isCurrent
                        ? "border-[#A8E63D] ring-2 ring-[#A8E63D]/50 scale-105 shadow-md"
                        : "border-white/40 opacity-75 hover:opacity-100"
                    } h-12 w-16 sm:h-16 sm:w-22`}
                    title={`Choose ${court.name}`}
                  >
                    <img
                      src={court.image || venue.imageUrl}
                      alt={court.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    <span className="absolute bottom-0.5 left-1 text-[9px] font-black text-white truncate max-w-[90%]">
                      {court.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="hidden sm:flex rounded-2xl border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-xl shrink-0 text-white text-xs font-bold">
              Tap court to select
            </div>
          </div>
        </motion.div>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr_390px] w-full min-w-0">
          {/* LEFT COLUMN: BOOKING FLOW STEPS */}
          <section className="space-y-6 sm:space-y-8 min-w-0 w-full">
            {/* ABOUT VENUE */}
            <div className="rounded-[24px] sm:rounded-[28px] border border-[#E3E8E1] bg-white p-4 sm:p-7 min-w-0">
              <h2 className="text-base sm:text-lg font-black text-[#17201c]">About this venue</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#68736C] break-words">
                {venue.description}
              </p>
            </div>

            {/* STEP 1: CHOOSE COURT */}
            <div className="rounded-[24px] sm:rounded-[28px] border border-[#E3E8E1] bg-white p-3.5 sm:p-7 shadow-sm min-w-0 w-full">
              <div className="flex flex-col gap-3 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-[#17201c] flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#17201c] text-[10px] font-black text-[#a8e63d]">1</span>
                      Select Court
                    </h2>
                    <p className="text-[11px] text-[#6b776f] mt-0.5">Real-time availability depends on the specific court</p>
                  </div>
                  <span className="text-xs font-semibold text-[#487519] bg-[#F2FBE7] px-2.5 py-1 rounded-full border border-[#a8e63d]/30 shrink-0">
                    {formatPrice(selectedCourt.priceHour)} / hr
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-2.5 sm:grid-cols-4 w-full min-w-0">
                  {venue.courts.map((court) => {
                    const selected = selectedCourt.id === court.id;

                    return (
                      <button
                        key={court.id}
                        onClick={() => {
                          setSelectedCourt(court);
                          setErrorMessage("");
                        }}
                        className={`group flex items-center gap-2 p-2 rounded-2xl border text-left transition-all active:scale-95 min-w-0 w-full ${
                          selected
                            ? "border-[#17201C] bg-[#17201C] text-white shadow-md ring-2 ring-[#a8e63d]/40"
                            : "border-[#E3E8E1] bg-[#F7F8F4] text-[#17201C] hover:bg-white hover:border-[#CCD5CA]"
                        }`}
                      >
                        <div className="relative h-11 w-11 sm:h-13 sm:w-13 shrink-0 overflow-hidden rounded-xl bg-black/10">
                          <img
                            src={court.image || venue.imageUrl}
                            alt={court.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          {selected && (
                            <div className="absolute inset-0 bg-[#a8e63d]/25 flex items-center justify-center">
                              <span className="h-2 w-2 rounded-full bg-[#a8e63d]" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <span className="text-xs font-black truncate block">{court.name}</span>
                          <p className={`text-[10px] truncate ${selected ? "text-[#a8e63d]" : "text-[#7a857e]"}`}>
                            {court.surface || "Taraflex"}
                          </p>
                          <p className={`text-[10.5px] font-bold truncate ${selected ? "text-white" : "text-[#456e17]"}`}>
                            {formatPrice(court.priceHour)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* STEP 2: SELECT DATE, DURATION & TIME SLOT */}
            <div className="rounded-[24px] sm:rounded-[28px] border border-[#E3E8E1] bg-white p-3.5 sm:p-7 shadow-sm min-w-0 w-full">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#17201c] text-[10px] font-black text-[#a8e63d]">2</span>
                    <h2 className="text-base sm:text-xl font-black text-[#17201c]">
                      Date & Play Time
                    </h2>
                    <span className="rounded-full bg-[#DFF7F0] px-2.5 py-0.5 text-[11px] font-bold text-[#276B5C]">
                      {availabilityStats.available} Available
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#68736C]">
                    Availability is dynamically verified with the database for {selectedCourt.name}.
                  </p>
                </div>

                {/* View switcher */}
                <div className="inline-flex rounded-xl border border-[#E3E8E1] bg-[#F7F8F4] p-1 self-start sm:self-auto shrink-0">
                  <button
                    onClick={() => setScheduleView("slots")}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-bold transition ${
                      scheduleView === "slots"
                        ? "bg-white text-[#17201C] shadow-sm"
                        : "text-[#68736C] hover:text-[#17201C]"
                    }`}
                  >
                    <LayoutGrid size={13} />
                    Slot View
                  </button>
                  <button
                    onClick={() => setScheduleView("timetable")}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-bold transition ${
                      scheduleView === "timetable"
                        ? "bg-white text-[#17201C] shadow-sm"
                        : "text-[#68736C] hover:text-[#17201C]"
                    }`}
                  >
                    <Table size={13} />
                    All Courts Matrix
                  </button>
                </div>
              </div>

              {/* DATE PICKER & DURATION BAR */}
              <div className="mt-4 rounded-2xl border border-[#e1e7df] bg-[#f9faf7] p-3 sm:p-4 min-w-0 w-full overflow-hidden">
                <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#eaf7d5] text-[#4f781a] shrink-0">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#79857d] block">
                        Selected Date
                      </span>
                      <p className="text-xs sm:text-sm font-black text-[#17201c] leading-tight truncate">
                        {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(true)}
                    className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-[#d2dcd0] bg-white px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-black text-[#17201c] hover:border-[#a8e63d] hover:bg-[#f2fbe7] shadow-xs active:scale-95 transition shrink-0"
                  >
                    <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#5b871c]" />
                    <span>Choose Date ▾</span>
                  </button>
                </div>

                {/* Quick Date Buttons (Disable past dates) */}
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-1 w-full max-w-full select-none">
                  {dates.map((date) => {
                    const selected = selectedDate === date.value;
                    const dateObj = new Date(date.value + "T00:00:00");
                    const isToday = date.value === todayStr;
                    const weekdayStr = isToday
                      ? "Today"
                      : dateObj.toLocaleDateString("en-US", { weekday: "short" });
                    const dayStr = dateObj.getDate();
                    const monthStr = dateObj.toLocaleDateString("en-US", { month: "short" });

                    return (
                      <button
                        key={date.value}
                        onClick={() => {
                          setSelectedDate(date.value);
                          setErrorMessage("");
                        }}
                        className={`shrink-0 flex flex-col items-center justify-center min-w-[50px] sm:min-w-[62px] py-1.5 px-1.5 sm:px-2 rounded-xl border transition-all active:scale-95 ${
                          selected
                            ? "border-[#A8E63D] bg-[#A8E63D] text-[#17201C] shadow-sm font-black scale-[1.02]"
                            : "border-[#E3E8E1] bg-white text-[#68736C] hover:text-[#17201C]"
                        }`}
                      >
                        <span className={`text-[9px] uppercase font-bold ${selected ? "text-[#24450a]" : "text-[#8a948c]"}`}>
                          {weekdayStr}
                        </span>
                        <span className="text-sm sm:text-base font-black leading-tight my-0.5">
                          {dayStr}
                        </span>
                        <span className={`text-[9px] font-semibold ${selected ? "text-[#24450a]" : "text-[#8a948c]"}`}>
                          {monthStr}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(true)}
                    className="shrink-0 flex flex-col items-center justify-center min-w-[50px] sm:min-w-[62px] py-1.5 px-1.5 sm:px-2 rounded-xl border border-dashed border-[#CCD5CA] bg-white text-[#17201c] hover:border-[#A8E63D] hover:bg-[#F2FBE7] shadow-xs active:scale-95 transition"
                    title="Choose from full calendar"
                  >
                    <Calendar className="h-3.5 w-3.5 text-[#5b871c] mb-0.5" />
                    <span className="text-[9.5px] font-black leading-tight">More</span>
                    <span className="text-[8px] text-[#8a948c]">▾</span>
                  </button>
                </div>

                {/* Duration Selector */}
                <div className="mt-2.5 pt-2 border-t border-[#edf1ea] flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-[#68736C]">Duration:</span>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3].map((h) => {
                      const isAllowed = currentSlotDetail ? currentSlotDetail.allowedDurations.includes(h) : true;
                      return (
                        <button
                          key={h}
                          onClick={() => {
                            setDuration(h);
                            setErrorMessage("");
                          }}
                          className={`rounded-xl px-2.5 sm:px-3 py-1 text-xs font-black transition active:scale-95 ${
                            duration === h
                              ? "bg-[#17201C] text-[#A8E63D] shadow-xs"
                              : !isAllowed
                              ? "border border-dashed border-red-200 bg-red-50/50 text-red-500 hover:bg-red-50"
                              : "border border-[#E3E8E1] bg-white text-[#556358] hover:bg-[#F7F8F4]"
                          }`}
                        >
                          {h} {h === 1 ? "Hour" : "Hours"}
                          {!isAllowed && <span className="ml-1 text-[9px] text-red-500 font-normal">!</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Status Legend */}
              <div className="mt-3 flex flex-wrap items-center gap-2.5 sm:gap-3 border-t border-[#F0F3EE] pt-2.5 text-[11px]">
                <span className="font-semibold text-[#8B958E]">Slot Status:</span>
                <span className="inline-flex items-center gap-1.5 text-[#547926]">
                  <span className="h-2 w-2 rounded-full bg-[#8DCF36]" />
                  Available
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#17201C] font-semibold">
                  <span className="h-2 w-2 rounded-full bg-[#A8E63D]" />
                  Selected
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#727B74]">
                  <span className="h-2 w-2 rounded-full bg-[#B2BDB5]" />
                  Booked
                </span>
                <span className="inline-flex items-center gap-1.5 text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Maintenance
                </span>
                <span className="inline-flex items-center gap-1.5 text-gray-400">
                  <span className="h-2 w-2 rounded-full bg-gray-300" />
                  Past
                </span>
              </div>

              {/* 1. SLOTS GRID VIEW */}
              {scheduleView === "slots" ? (
                <div className="mt-4">
                  {isLoadingAvailability ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#17201c]/20 border-t-[#78a72b]" />
                      <p className="text-xs text-[#7d8780]">Checking database court availability...</p>
                    </div>
                  ) : displayedSlots.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#7d8780]">
                      No operating time slots for this venue.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5 sm:grid-cols-3 md:grid-cols-4 w-full min-w-0">
                      {displayedSlots.map((slot) => {
                        const isSelected = selectedTime === slot.time;
                        const isAvailable = slot.available;

                        return (
                          <motion.button
                            key={slot.time}
                            disabled={!isAvailable}
                            whileTap={isAvailable ? { scale: 0.96 } : undefined}
                            onClick={() => {
                              if (isAvailable) {
                                setSelectedTime(slot.time);
                                setErrorMessage("");
                              }
                            }}
                            className={`group relative flex flex-col items-center justify-center rounded-xl sm:rounded-2xl border p-2.5 sm:p-3.5 transition-all duration-200 active:scale-95 min-w-0 w-full ${
                              !isAvailable
                                ? "border-[#E4E8E1] bg-[#F2F4EF] text-[#8E9790] cursor-not-allowed opacity-75"
                                : isSelected
                                ? "border-[#A8E63D] bg-[#A8E63D] text-[#17201C] shadow-[0_6px_20px_rgba(168,230,61,0.28)] font-black"
                                : "border-[#E3E8E1] bg-white text-[#17201C] hover:-translate-y-0.5 hover:border-[#BFC9BD] hover:shadow-sm font-bold"
                            }`}
                          >
                            <span className={`text-sm sm:text-base font-extrabold ${!isAvailable ? "line-through text-[#848E87]" : ""}`}>
                              {slot.time}
                            </span>

                            {slot.status === "BOOKED" ? (
                              <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-[#E1E6DE] px-1.5 py-0.5 text-[9px] font-bold text-[#636C65]">
                                <Lock size={9} />
                                Booked
                              </span>
                            ) : slot.status === "MAINTENANCE" ? (
                              <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                                <Wrench size={9} />
                                Maintenance
                              </span>
                            ) : slot.status === "PAST" ? (
                              <span className="mt-1 text-[9px] font-semibold text-gray-400">
                                Past
                              </span>
                            ) : isSelected ? (
                              <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-[#17201C] px-1.5 py-0.5 text-[9px] font-bold text-white">
                                <Check size={9} />
                                Selected
                              </span>
                            ) : (
                              <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-[#4e751f]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#8dcf36]" />
                                Available
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* 2. ALL COURTS TIMETABLE MATRIX */
                <div className="mt-5 overflow-hidden rounded-2xl border border-[#E3E8E1] bg-white shadow-sm w-full">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full min-w-[460px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E3E8E1] bg-[#F7F8F4]">
                          <th className="sticky left-0 bg-[#F7F8F4] px-3 sm:px-4 py-3 font-bold text-[#68736C]">
                            Time
                          </th>
                          {venue.courts.map((c) => (
                            <th
                              key={c.id}
                              className={`px-3 sm:px-4 py-3 font-black ${
                                selectedCourt.id === c.id
                                  ? "text-[#437517] bg-[#F2FBE7]"
                                  : "text-[#17201C]"
                              }`}
                            >
                              {c.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EDF1EA]">
                        {slots.map((slot) => (
                          <tr key={slot.time} className="hover:bg-[#FAFAF7] transition">
                            <td className="sticky left-0 bg-white px-3 sm:px-4 py-2.5 font-bold text-[#68736C]">
                              {slot.time}
                            </td>
                            {venue.courts.map((c) => {
                              const isCurrentCourt = selectedCourt.id === c.id;
                              const isCurrentSelection = isCurrentCourt && selectedTime === slot.time;
                              const isSlotAvailable = isCurrentCourt ? slot.available : true;

                              return (
                                <td key={c.id} className="px-2.5 sm:px-3 py-2">
                                  {isCurrentSelection ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-[#A8E63D] px-2 py-1 text-[10.5px] font-black text-[#17201C] shadow-sm">
                                      <Check size={10} />
                                      Selected
                                    </span>
                                  ) : isCurrentCourt && !slot.available ? (
                                    <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                                      {slot.status === "BOOKED" && <Lock size={9} />}
                                      {slot.status === "MAINTENANCE" && <Wrench size={9} />}
                                      {slot.status}
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setSelectedCourt(c);
                                        setSelectedTime(slot.time);
                                        setErrorMessage("");
                                      }}
                                      className="inline-flex items-center gap-1 rounded-md border border-[#D5DDD3] bg-white px-2 py-1 text-[10.5px] font-semibold text-[#456B1E] transition hover:border-[#A8E63D] hover:bg-[#F2FBE7]"
                                    >
                                      Select
                                    </button>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 3: CUSTOMER CONTACT DETAILS */}
            <div id="customer-details-section" className="rounded-[24px] sm:rounded-[28px] border border-[#E3E8E1] bg-white p-3.5 sm:p-7 shadow-sm min-w-0 w-full scroll-mt-20">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#17201c] text-[10px] font-black text-[#a8e63d]">3</span>
                <h2 className="text-base sm:text-lg font-black text-[#17201c]">Customer Contact Details</h2>
              </div>
              <p className="text-xs text-[#717c74] mb-4">
                Booking reference pass and check-in QR code will be registered under this contact.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-[11px] font-bold text-[#5c665f] uppercase tracking-wider block mb-1">
                    Player Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-[#8a958d]" />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Alex Nguyen"
                      className="w-full rounded-xl border border-[#dce3da] bg-[#fafbf9] pl-9 pr-3 py-2 text-xs font-semibold text-[#17201c] focus:border-[#a8e63d] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#5c665f] uppercase tracking-wider block mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="player@example.com"
                    className="w-full rounded-xl border border-[#dce3da] bg-[#fafbf9] px-3 py-2 text-xs font-semibold text-[#17201c] focus:border-[#a8e63d] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#5c665f] uppercase tracking-wider block mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-[#8a958d]" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0912 345 678"
                      className="w-full rounded-xl border border-[#dce3da] bg-[#fafbf9] pl-9 pr-3 py-2 text-xs font-semibold text-[#17201c] focus:border-[#a8e63d] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-[11px] font-bold text-[#5c665f] uppercase tracking-wider block mb-1">
                  Special Notes / Requests (Optional)
                </label>
                <input
                  type="text"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="e.g. Rent 2 Victor racquets at counter, warmup at 17:50"
                  className="w-full rounded-xl border border-[#dce3da] bg-[#fafbf9] px-3 py-2 text-xs font-semibold text-[#17201c] focus:border-[#a8e63d] focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>
          </section>

          {/* RIGHT ASIDE: PERSISTENT PRICE & BOOKING SUMMARY */}
          <aside className="lg:sticky lg:top-20 lg:self-start min-w-0 w-full">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="overflow-hidden rounded-[24px] sm:rounded-[30px] border border-[#DDE5DB] bg-white shadow-[0_20px_60px_rgba(23,32,28,0.08)] w-full"
            >
              <div className="bg-[#17201C] p-5 sm:p-6 text-white">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#A8E63D]">
                  <Sparkles size={16} />
                  YOUR COURT RESERVATION
                </div>
                <h2 className="mt-1 text-xl sm:text-2xl font-black">
                  Ready to play?
                </h2>
              </div>

              <div className="space-y-4 sm:space-y-5 p-4 sm:p-6 text-xs">
                {/* Court info */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#79857d]">Court & Surface</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-base font-black text-[#17201c]">{selectedCourt.name}</p>
                    <span className="text-[11px] font-semibold text-[#547e1f] bg-[#f0fae1] px-2 py-0.5 rounded-md">
                      {selectedCourt.surface || "Taraflex Pro Turf"}
                    </span>
                  </div>
                </div>

                {/* Date / Time summary */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl bg-[#F7F8F4] p-3">
                    <span className="text-[10px] font-bold text-[#7d8780] block">Date</span>
                    <p className="mt-0.5 font-black text-[#17201c] truncate">{selectedDate}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F7F8F4] p-3">
                    <span className="text-[10px] font-bold text-[#7d8780] block">Time Slot</span>
                    <p className="mt-0.5 font-black text-[#17201c]">
                      {selectedTime} ({duration}h)
                    </p>
                  </div>
                </div>

                {/* Duration controls */}
                <div className="flex items-center justify-between rounded-2xl border border-[#E3E8E1] p-2">
                  <div className="pl-1">
                    <span className="text-[10px] text-[#7d8780] block">Duration</span>
                    <span className="font-black text-[#17201c] text-sm">{duration} {duration === 1 ? "Hour" : "Hours"}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      disabled={duration <= 1}
                      onClick={() => setDuration((v) => Math.max(1, v - 1))}
                      className="h-8 w-8 rounded-lg border border-[#e1e7df] bg-white flex items-center justify-center hover:bg-[#f2f5f0] disabled:opacity-30 active:scale-95"
                    >
                      <Minus size={13} />
                    </button>
                    <button
                      disabled={duration >= 3}
                      onClick={() => setDuration((v) => Math.min(3, v + 1))}
                      className="h-8 w-8 rounded-lg border border-[#e1e7df] bg-white flex items-center justify-center hover:bg-[#f2f5f0] disabled:opacity-30 active:scale-95"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                {/* Conflict warning */}
                {conflictDetails.hasConflict && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-red-700 leading-relaxed font-semibold">
                    <div className="flex items-center gap-1.5 font-black mb-1">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>Slot Conflict Detected</span>
                    </div>
                    <p className="text-[11px]">{conflictDetails.conflicts.join(", ")}</p>
                  </div>
                )}

                {/* Live Price Breakdown */}
                <div className="border-t border-[#E3E8E1] pt-3 space-y-1.5">
                  <div className="flex justify-between text-[#68736C]">
                    <span>Rate per hour</span>
                    <span>{formatPrice(selectedCourt.priceHour)}</span>
                  </div>
                  <div className="flex justify-between text-[#68736C]">
                    <span>Duration</span>
                    <span>{duration} hour{duration > 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex justify-between text-[#68736C]">
                    <span>Facility fee / taxes</span>
                    <span className="text-[#3a6814] font-semibold">Included</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-[#edf1ea]">
                    <span className="text-sm font-black text-[#17201c]">Final Total</span>
                    <span className="text-2xl font-black text-[#17201c]">{formatPrice(totalPrice)}</span>
                  </div>
                </div>

                {/* Error Banner */}
                <AnimatePresence>
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700"
                    >
                      {errorMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* RESERVE BUTTON */}
                <button
                  disabled={isBooking || conflictDetails.hasConflict}
                  onClick={handleReserve}
                  className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-black text-sm transition shadow-md active:scale-95 ${
                    conflictDetails.hasConflict
                      ? "bg-red-100 text-red-700 cursor-not-allowed"
                      : "bg-[#A8E63D] text-[#17201C] hover:bg-[#b5ef4f] disabled:opacity-60"
                  }`}
                >
                  {isBooking ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#17201c]/30 border-t-[#17201c]" />
                      <span>Revalidating & Reserving...</span>
                    </>
                  ) : conflictDetails.hasConflict ? (
                    <>
                      <Lock size={15} />
                      <span>Slot Unavailable</span>
                    </>
                  ) : (
                    <>
                      <span>Reserve Court</span>
                      <ArrowLeft className="rotate-180 h-4 w-4" />
                    </>
                  )}
                </button>

                {/* Cancellation policy guarantee */}
                <div className="rounded-xl bg-[#F7F8F4] p-3 text-[10.5px] text-[#69746c] flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#4f9d39] shrink-0 mt-0.5" />
                  <span>
                    <strong>Cancellation Policy:</strong> Free cancellation up to 6 hours before match. Instantly releases availability for other players.
                  </span>
                </div>
              </div>
            </motion.div>
          </aside>
        </div>
      </div>

      {/* MOBILE PERSISTENT FLOATING BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#DDE5DB] bg-white/95 px-3 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden shadow-[0_-8px_30px_rgba(23,32,28,0.12)]">
        {errorMessage && (
          <div className="mx-auto max-w-md mb-2 flex items-center justify-between gap-2 rounded-xl bg-red-50 p-2 text-xs font-semibold text-red-700 border border-red-200 animate-in fade-in slide-in-from-bottom-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span className="truncate">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage("")}
              className="shrink-0 text-red-600 hover:text-red-800 p-0.5"
              aria-label="Dismiss error"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="mx-auto flex max-w-md items-center justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#68736C] truncate">
              <span className="truncate">{selectedCourt.name}</span>
              <span>·</span>
              <span className="text-[#17201c] font-black">{selectedTime}</span>
              <span>·</span>
              <span>{duration}h</span>
            </div>
            <p className="text-lg font-black text-[#17201c]">{formatPrice(totalPrice)}</p>
          </div>

          <button
            onClick={handleReserve}
            disabled={isBooking || conflictDetails.hasConflict}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-black transition active:scale-95 shadow-md ${
              conflictDetails.hasConflict
                ? "bg-red-100 text-red-700 cursor-not-allowed"
                : isBooking
                ? "bg-[#17201c] text-[#a8e63d] cursor-wait"
                : "bg-[#A8E63D] text-[#17201C]"
            }`}
          >
            {isBooking ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-[#a8e63d]" />
                <span>Reserving...</span>
              </>
            ) : conflictDetails.hasConflict ? (
              "Slot Booked"
            ) : (
              <>
                <span>Reserve Court</span>
                <ArrowLeft className="rotate-180 h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* STEP 10: CONFIRMATION & QR CHECK-IN PASS MODAL */}
      <AnimatePresence>
        {bookingSuccessData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17201c]/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              className="relative w-full max-w-md rounded-[32px] bg-white p-6 shadow-2xl text-center select-none"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#A8E63D] shadow-lg mb-3">
                <Check size={32} strokeWidth={3} className="text-[#17201c]" />
              </div>

              <span className="rounded-full bg-[#DFF7F0] px-3 py-1 text-[11px] font-black text-[#276B5C]">
                BOOKING CONFIRMED & PAID
              </span>

              <h3 className="mt-2 text-2xl font-black text-[#17201c]">You're Ready to Play!</h3>
              <p className="text-xs text-[#717c74]">
                Your court reservation is locked in. Show this check-in match pass at venue front desk.
              </p>

              {/* QR Pass Card */}
              <div className="my-4 rounded-2xl border-2 border-dashed border-[#d8e0d6] bg-[#f8faf7] p-4 text-center">
                <div className="inline-block bg-white p-3 rounded-xl shadow-md border border-[#e1e7df]">
                  <svg className="w-32 h-32 mx-auto" viewBox="0 0 100 100" fill="none">
                    <rect x="5" y="5" width="30" height="30" fill="#17201c" rx="4" />
                    <rect x="10" y="10" width="20" height="20" fill="white" rx="2" />
                    <rect x="14" y="14" width="12" height="12" fill="#17201c" rx="1" />
                    <rect x="65" y="5" width="30" height="30" fill="#17201c" rx="4" />
                    <rect x="70" y="10" width="20" height="20" fill="white" rx="2" />
                    <rect x="74" y="14" width="12" height="12" fill="#17201c" rx="1" />
                    <rect x="5" y="65" width="30" height="30" fill="#17201c" rx="4" />
                    <rect x="10" y="70" width="20" height="20" fill="white" rx="2" />
                    <rect x="14" y="74" width="12" height="12" fill="#17201c" rx="1" />
                    <rect x="42" y="12" width="16" height="16" fill="#a8e63d" rx="2" />
                    <rect x="42" y="42" width="16" height="16" fill="#17201c" rx="2" />
                    <rect x="65" y="45" width="12" height="12" fill="#a8e63d" />
                    <rect x="75" y="65" width="15" height="12" fill="#17201c" />
                    <rect x="45" y="75" width="12" height="12" fill="#a8e63d" />
                  </svg>
                </div>
                <p className="mt-2 font-mono text-sm font-black text-[#17201c]">
                  {bookingSuccessData.bookingCode || `BK-${bookingSuccessData.id}`}
                </p>
                <span className="text-[10px] text-[#7d8780]">Official Match Check-in Pass</span>
              </div>

              {/* Booking Summary details */}
              <div className="space-y-1.5 text-xs text-left bg-[#f7f8f4] p-3.5 rounded-xl border border-[#e1e7df]">
                <div className="flex justify-between">
                  <span className="text-[#68736C]">Venue:</span>
                  <span className="font-bold text-[#17201c]">{venue.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68736C]">Court:</span>
                  <span className="font-bold text-[#17201c]">{selectedCourt.name} ({selectedCourt.surface || "Taraflex"})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68736C]">Date & Time:</span>
                  <span className="font-bold text-[#17201c]">{selectedDate} · {selectedTime} ({duration}h)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68736C]">Total Paid:</span>
                  <span className="font-black text-[#3b6315]">{formatPrice(totalPrice)}</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#d2dcd0] bg-white py-2.5 text-xs font-bold text-[#17201c] hover:bg-[#f7f8f4]"
                >
                  <Printer size={13} />
                  Print Pass
                </button>
                <Link
                  href="/bookings"
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#17201c] py-2.5 text-xs font-bold text-white hover:bg-[#2c3a32]"
                >
                  View My Bookings
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CALENDAR MODAL */}
      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={(newDate) => {
          setSelectedDate(newDate);
          setErrorMessage("");
        }}
        title={`Select Date for ${venue.name}`}
      />

      {/* PAYMENT VIETQR MODAL */}
      <PaymentQRModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentSuccess={handlePaymentSuccess}
        venueName={venue.name}
        courtName={selectedCourt.name}
        date={selectedDate}
        timeSlot={`${selectedTime} (${duration}h)`}
        totalPrice={totalPrice}
        bookingId={serverCreatedBooking?.id}
        bookingCode={serverCreatedBooking?.bookingCode}
      />
    </main>
  );
}