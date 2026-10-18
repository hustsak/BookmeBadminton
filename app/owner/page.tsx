"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Navbar } from "@/components/Navbar";
import { LoginModal } from "@/components/LoginModal";
import { useApp } from "@/context/AppContext";
import {
  Building2,
  Calendar,
  Clock,
  DollarSign,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  Search,
  ChevronDown,
  Plus,
  Trash2,
  Save,
  Lock,
  Layers,
  ArrowRight,
  ShieldAlert,
  Edit2,
  RefreshCw,
  Table,
  Check,
  User as UserIcon,
} from "lucide-react";

import { DateFilterPreset, OwnerOverviewKPIs } from "@/lib/owner-analytics";
import { OwnerDateFilter } from "@/components/owner/OwnerDateFilter";
import { OwnerBookingsSection } from "@/components/owner/OwnerBookingsSection";

function formatPrice(value: number) {
  return `${value.toLocaleString("en-US")}₫`;
}

type MainTab = "overview" | "courts" | "bookings" | "profile";

function OwnerPortalInner() {
  const { user, openLoginModal } = useApp();
  const searchParams = useSearchParams();

  // Tab State
  const tabParam = searchParams?.get("tab") as MainTab | null;
  const [activeTab, setActiveTab] = useState<MainTab>("overview");

  useEffect(() => {
    if (tabParam && ["overview", "courts", "bookings", "profile"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Venues State
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [isLoadingVenues, setIsLoadingVenues] = useState(true);

  // New Club Form State (if owner has 0 venues)
  const [isCreatingFirstClub, setIsCreatingFirstClub] = useState(false);
  const [newClubName, setNewClubName] = useState("");
  const [newClubLocation, setNewClubLocation] = useState("");
  const [isSubmittingClub, setIsSubmittingClub] = useState(false);

  // Date Filter State for Overview
  const [preset, setPreset] = useState<DateFilterPreset>("last30days");
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Overview KPIs & Upcoming Bookings
  const [kpis, setKpis] = useState<OwnerOverviewKPIs | null>(null);
  const [overviewBookings, setOverviewBookings] = useState<any[]>([]);
  const [isLoadingKpis, setIsLoadingKpis] = useState(false);

  // Add Court Form State
  const [isAddingCourt, setIsAddingCourt] = useState(false);
  const [newCourtName, setNewCourtName] = useState("");
  const [newCourtPrice, setNewCourtPrice] = useState(100000);
  const [newCourtSurface, setNewCourtSurface] = useState("Taraflex Pro Turf");
  const [isSubmittingCourt, setIsSubmittingCourt] = useState(false);

  // Edit Court Price/Surface State
  const [editingCourtId, setEditingCourtId] = useState<number | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(100000);
  const [editingSurface, setEditingSurface] = useState<string>("");
  const [isSavingCourt, setIsSavingCourt] = useState(false);

  // Maintenance Form State
  const [mCourtId, setMCourtId] = useState<number>(0);
  const [mDate, setMDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [mStartTime, setMStartTime] = useState<string>("12:00");
  const [mEndTime, setMEndTime] = useState<string>("14:00");
  const [mReason, setMReason] = useState<string>("Court Surface Cleaning & Net Tensioning");
  const [isSubmittingMaintenance, setIsSubmittingMaintenance] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);

  // Venue Settings & Club Profile Form State
  const [venueName, setVenueName] = useState("");
  const [venueOpenTime, setVenueOpenTime] = useState("06:00");
  const [venueCloseTime, setVenueCloseTime] = useState("23:00");
  const [venueAddress, setVenueAddress] = useState("");
  const [venueDescription, setVenueDescription] = useState("");
  const [isSavingVenue, setIsSavingVenue] = useState(false);
  const [venueSaveMessage, setVenueSaveMessage] = useState("");

  // Schedule Matrix State
  const [scheduleDate, setScheduleDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [matrixData, setMatrixData] = useState<Record<number, any>>({});
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(false);

  // Load Venues owned strictly by the authenticated user
  async function loadOwnerVenues() {
    if (!user) return;
    setIsLoadingVenues(true);
    try {
      const res = await fetch("/api/owner/venues", {
        headers: { "x-user-id": String(user.id) },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.venues)) {
        setVenues(data.venues);
        if (data.venues.length > 0) {
          const stillValid = data.venues.some((v: any) => v.id === selectedVenueId);
          if (!stillValid) {
            setSelectedVenueId(data.venues[0].id);
          }
        } else {
          setSelectedVenueId(null);
        }
      }
    } catch (err) {
      console.error("Failed to load owner venues:", err);
    } finally {
      setIsLoadingVenues(false);
    }
  }

  useEffect(() => {
    if (user && (user.role === "OWNER" || user.role === "ADMIN")) {
      loadOwnerVenues();
    }
  }, [user]);

  // Selected Venue Object
  const selectedVenue = useMemo(() => {
    return venues.find((v) => v.id === selectedVenueId) || venues[0] || null;
  }, [venues, selectedVenueId]);

  // Populate venue settings form when selected venue changes
  useEffect(() => {
    if (selectedVenue) {
      setVenueName(selectedVenue.name || "");
      setVenueOpenTime(selectedVenue.openTime || "06:00");
      setVenueCloseTime(selectedVenue.closeTime || "23:00");
      setVenueAddress(selectedVenue.address || selectedVenue.location || "");
      setVenueDescription(selectedVenue.description || "");
      if (selectedVenue.courts && selectedVenue.courts.length > 0) {
        setMCourtId(selectedVenue.courts[0].id);
      }
    }
  }, [selectedVenue]);

  // Load Overview KPIs & Bookings
  async function loadOverviewData() {
    if (!user || !selectedVenueId) return;
    setIsLoadingKpis(true);
    try {
      let url = `/api/owner/analytics/overview?preset=${preset}&venueId=${selectedVenueId}`;
      if (preset === "custom" && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }

      const [kpiRes, bookingsRes] = await Promise.all([
        fetch(url, { headers: { "x-user-id": String(user.id) } }),
        fetch(`/api/owner/bookings?venueId=${selectedVenueId}&limit=6&sortBy=bookingDate&sortOrder=asc`, {
          headers: { "x-user-id": String(user.id) },
        }),
      ]);

      const kpiData = await kpiRes.json();
      if (kpiData.success && kpiData.data) {
        setKpis(kpiData.data);
      }

      const bookingsData = await bookingsRes.json();
      if (bookingsData.success && Array.isArray(bookingsData.bookings)) {
        setOverviewBookings(bookingsData.bookings);
      }
    } catch (err) {
      console.error("Failed to load overview data:", err);
    } finally {
      setIsLoadingKpis(false);
    }
  }

  useEffect(() => {
    if (activeTab === "overview" && selectedVenueId && user) {
      loadOverviewData();
    }
  }, [activeTab, selectedVenueId, preset, customStart, customEnd, user]);

  // Load Schedule Matrix
  async function loadScheduleMatrix() {
    if (!selectedVenue?.courts || selectedVenue.courts.length === 0) return;
    setIsLoadingMatrix(true);
    try {
      const results: Record<number, any> = {};
      await Promise.all(
        selectedVenue.courts.map(async (c: any) => {
          const res = await fetch(`/api/availability?courtId=${c.id}&date=${scheduleDate}`);
          const json = await res.json();
          if (json.success && json.data) {
            results[c.id] = json.data.slots || [];
          }
        })
      );
      setMatrixData(results);
    } catch (e) {
      console.error("Failed to load schedule matrix:", e);
    } finally {
      setIsLoadingMatrix(false);
    }
  }

  useEffect(() => {
    if (activeTab === "courts" && selectedVenue) {
      loadScheduleMatrix();
    }
  }, [activeTab, selectedVenueId, scheduleDate]);

  // Action: Create First Club (if 0 venues)
  async function handleCreateFirstClub(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setIsSubmittingClub(true);
    try {
      const res = await fetch("/api/owner/venues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id),
        },
        body: JSON.stringify({
          name: newClubName || `${user.name}'s Badminton Club`,
          location: newClubLocation || "Hanoi",
        }),
      });
      const data = await res.json();
      if (data.success && data.venue) {
        setIsCreatingFirstClub(false);
        await loadOwnerVenues();
      }
    } catch (err) {
      console.error("Failed to create venue:", err);
    } finally {
      setIsSubmittingClub(false);
    }
  }

  // Action: Add Court
  async function handleAddCourt(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVenueId || !newCourtName.trim() || !user) return;
    setIsSubmittingCourt(true);

    try {
      const res = await fetch("/api/owner/courts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id),
        },
        body: JSON.stringify({
          venueId: selectedVenueId,
          name: newCourtName.trim(),
          priceHour: newCourtPrice,
          surface: newCourtSurface,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsAddingCourt(false);
        setNewCourtName("");
        await loadOwnerVenues();
      }
    } catch (err) {
      console.error("Failed to add court:", err);
    } finally {
      setIsSubmittingCourt(false);
    }
  }

  // Action: Save Court Price & Surface
  async function handleSaveCourtPrice(courtId: number) {
    if (!user) return;
    setIsSavingCourt(true);
    try {
      const res = await fetch(`/api/owner/courts/${courtId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id),
        },
        body: JSON.stringify({
          priceHour: editingPrice,
          surface: editingSurface || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingCourtId(null);
        await loadOwnerVenues();
      }
    } catch (err) {
      console.error("Failed to update court:", err);
    } finally {
      setIsSavingCourt(false);
    }
  }

  // Action: Delete Court
  async function handleDeleteCourt(courtId: number) {
    if (!user || !confirm("Are you sure you want to remove this court?")) return;
    try {
      const res = await fetch(`/api/owner/courts/${courtId}`, {
        method: "DELETE",
        headers: { "x-user-id": String(user.id) },
      });
      const data = await res.json();
      if (data.success) {
        await loadOwnerVenues();
      }
    } catch (err) {
      console.error("Failed to delete court:", err);
    }
  }

  // Action: Save Venue Profile Details
  async function handleSaveVenueSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVenueId || !user) return;
    setIsSavingVenue(true);
    setVenueSaveMessage("");

    try {
      const res = await fetch(`/api/owner/venues/${selectedVenueId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id),
        },
        body: JSON.stringify({
          name: venueName,
          openTime: venueOpenTime,
          closeTime: venueCloseTime,
          address: venueAddress,
          description: venueDescription,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setVenueSaveMessage("Club details and operating hours updated successfully!");
        await loadOwnerVenues();
      } else {
        setVenueSaveMessage(data.message || "Failed to update venue.");
      }
    } catch (err) {
      setVenueSaveMessage("Failed to update venue.");
    } finally {
      setIsSavingVenue(false);
    }
  }

  // Action: Add Maintenance Block
  async function handleAddMaintenance(e: React.FormEvent) {
    e.preventDefault();
    if (!mCourtId || !user) return;
    setIsSubmittingMaintenance(true);
    setMaintenanceError(null);

    try {
      const res = await fetch("/api/owner/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id),
        },
        body: JSON.stringify({
          courtId: mCourtId,
          date: mDate,
          startTime: mStartTime,
          endTime: mEndTime,
          reason: mReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await loadOwnerVenues();
        if (activeTab === "courts") {
          loadScheduleMatrix();
        }
      } else {
        setMaintenanceError(data.message || "Failed to schedule maintenance.");
      }
    } catch (err: any) {
      setMaintenanceError(err.message || "Failed to schedule maintenance block.");
    } finally {
      setIsSubmittingMaintenance(false);
    }
  }

  // Action: Delete Maintenance Block
  async function handleDeleteMaintenance(blockId: number) {
    if (!user) return;
    try {
      const res = await fetch(`/api/owner/maintenance/${blockId}`, {
        method: "DELETE",
        headers: { "x-user-id": String(user.id) },
      });
      const data = await res.json();
      if (data.success) {
        await loadOwnerVenues();
        if (activeTab === "courts") {
          loadScheduleMatrix();
        }
      }
    } catch (err) {
      console.error("Failed to delete maintenance block:", err);
    }
  }

  // -------------------------------------------------------------
  // GUARD: 1. Unauthenticated Guest
  // -------------------------------------------------------------
  if (!user) {
    return (
      <main className="min-h-screen bg-[#f7f8f4] text-[#17201c]">
        <Navbar />
        <LoginModal />
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#f0fae1] border border-[#d2e3be] text-[#4f781a] shadow-xs mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#17201c] tracking-tight">
            Court Owner Dashboard
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#6f7b73] max-w-md mx-auto">
            Please log in with your verified Court Owner account to manage your club facilities, view real-time court schedules, and oversee reservations.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={openLoginModal}
              className="rounded-2xl bg-[#a8e63d] px-6 py-3 text-xs font-black text-[#17201c] shadow-md hover:bg-[#b8ef59] active:scale-95 transition"
            >
              Log In as Court Owner
            </button>
            <Link
              href="/register"
              className="rounded-2xl border border-[#d2dcd0] bg-white px-6 py-3 text-xs font-bold text-[#17201c] hover:bg-gray-50 active:scale-95 transition"
            >
              Register New Club
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------
  // GUARD: 2. Player (CUSTOMER) Restricted Access
  // -------------------------------------------------------------
  if (user.role === "CUSTOMER") {
    return (
      <main className="min-h-screen bg-[#f7f8f4] text-[#17201c]">
        <Navbar />
        <LoginModal />
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 border border-amber-200 text-amber-700 shadow-xs mb-4">
            <ShieldAlert size={32} />
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase text-amber-900 tracking-wider">
            Access Restricted
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black text-[#17201c] tracking-tight">
            Court Owner Portal
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#6f7b73] max-w-md mx-auto">
            You are currently logged in as a <strong>Player</strong> ({user.name}). This dashboard is reserved exclusively for court and facility owners.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="rounded-2xl bg-[#17201c] px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-black active:scale-95 transition"
            >
              ← Back to Explore Courts
            </Link>
            <Link
              href="/register"
              className="rounded-2xl border border-[#d2dcd0] bg-white px-6 py-3 text-xs font-bold text-[#17201c] hover:bg-gray-50 active:scale-95 transition"
            >
              Register as Club Owner
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------
  // 3. COURT OWNER DASHBOARD (OWNER or ADMIN)
  // -------------------------------------------------------------
  return (
    <main className="min-h-screen bg-[#f7f8f4] text-[#17201c] pb-24 md:pb-16">
      <Navbar />
      <LoginModal />

      {/* DASHBOARD HEADER */}
      <section className="border-b border-[#e1e7df] bg-white px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#17201c] px-2.5 py-0.5 text-[10px] font-black uppercase text-[#a8e63d]">
                  Court Owner Dashboard
                </span>
                <span className="text-xs text-[#717d75] font-semibold">
                  {user.name} ({user.email})
                </span>
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-black text-[#17201c] tracking-tight">
                {selectedVenue ? selectedVenue.name : "My Club Operations"}
                <span className="text-[#a8e63d]">.</span>
              </h1>
              <p className="text-xs text-[#717c74] mt-0.5">
                Manage your courts, monitor bookings, configure hours, and keep your facilities running smoothly.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="flex items-center gap-1.5 rounded-2xl border border-[#d2dcd0] bg-[#fafbf9] px-3.5 py-2 text-xs font-bold text-[#17201c] hover:bg-white active:scale-95 transition"
              >
                <span>View Public Page</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* VENUE SELECTOR (If owner has multiple venues) */}
          {venues.length > 1 && (
            <div className="mt-4 flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 border-t border-[#edf1eb] pt-3">
              <span className="text-xs font-bold text-[#7a867e] shrink-0">Your Venues:</span>
              {venues.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVenueId(v.id)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                    selectedVenueId === v.id
                      ? "bg-[#17201c] text-white shadow-xs"
                      : "bg-[#f2f4ef] text-[#5c6860] hover:bg-[#e6eae2]"
                  }`}
                >
                  <Building2 size={13} className={selectedVenueId === v.id ? "text-[#a8e63d]" : ""} />
                  <span>{v.name}</span>
                  <span className="text-[10px] opacity-75">({v.courts?.length || 0} courts)</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* NO VENUES EMPTY STATE */}
      {venues.length === 0 && !isLoadingVenues && (
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf7d5] text-[#3d6e11] mb-3">
            <Building2 size={28} />
          </div>
          <h2 className="text-xl font-black text-[#17201c]">No Club Registered Yet</h2>
          <p className="mt-1 text-xs text-[#717c74]">
            Register your badminton club venue to start adding courts and accepting bookings.
          </p>

          {isCreatingFirstClub ? (
            <form onSubmit={handleCreateFirstClub} className="mt-5 space-y-3 text-left bg-white p-5 rounded-2xl border border-[#e1e7df]">
              <div>
                <label className="text-xs font-bold text-[#5c6760] block mb-1">Club / Facility Name</label>
                <input
                  type="text"
                  required
                  value={newClubName}
                  onChange={(e) => setNewClubName(e.target.value)}
                  placeholder="e.g. Apex Arena"
                  className="w-full rounded-xl border border-[#d2dcd0] p-2.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#5c6760] block mb-1">Location / Address</label>
                <input
                  type="text"
                  required
                  value={newClubLocation}
                  onChange={(e) => setNewClubLocation(e.target.value)}
                  placeholder="e.g. 15 Duy Tan, Cau Giay, Hanoi"
                  className="w-full rounded-xl border border-[#d2dcd0] p-2.5 text-xs font-bold"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingClub}
                  className="flex-1 rounded-xl bg-[#a8e63d] py-2.5 text-xs font-bold text-[#17201c]"
                >
                  {isSubmittingClub ? "Creating..." : "Create Club"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingFirstClub(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreatingFirstClub(true)}
              className="mt-5 rounded-2xl bg-[#a8e63d] px-6 py-3 text-xs font-black text-[#17201c] shadow-sm hover:bg-[#b8ef59] active:scale-95 transition inline-flex items-center gap-1.5"
            >
              <Plus size={15} /> Create Your Club
            </button>
          )}
        </div>
      )}

      {/* DASHBOARD BODY (When Venue Exists) */}
      {selectedVenue && (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
          {/* THE 4 REQUIRED ROLE NAVIGATION TABS */}
          <div className="flex border-b border-[#e1e7df] gap-1 overflow-x-auto scrollbar-none">
            {/* Tab 1: Overview */}
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap ${
                activeTab === "overview"
                  ? "border-[#17201c] text-[#17201c]"
                  : "border-transparent text-[#7c867f] hover:text-[#17201c]"
              }`}
            >
              <Layers size={15} className={activeTab === "overview" ? "text-[#54801b]" : ""} />
              Overview
            </button>

            {/* Tab 2: My Courts */}
            <button
              onClick={() => setActiveTab("courts")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap ${
                activeTab === "courts"
                  ? "border-[#17201c] text-[#17201c]"
                  : "border-transparent text-[#7c867f] hover:text-[#17201c]"
              }`}
            >
              <Building2 size={15} className={activeTab === "courts" ? "text-[#54801b]" : ""} />
              My Courts
              <span className="rounded-full bg-[#f0fae1] px-1.5 py-0.5 text-[10px] font-black text-[#446d17]">
                {selectedVenue.courts?.length || 0}
              </span>
            </button>

            {/* Tab 3: Bookings */}
            <button
              onClick={() => setActiveTab("bookings")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap ${
                activeTab === "bookings"
                  ? "border-[#17201c] text-[#17201c]"
                  : "border-transparent text-[#7c867f] hover:text-[#17201c]"
              }`}
            >
              <Calendar size={15} className={activeTab === "bookings" ? "text-[#54801b]" : ""} />
              Bookings
            </button>

            {/* Tab 4: Profile / Club Information */}
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap ${
                activeTab === "profile"
                  ? "border-[#17201c] text-[#17201c]"
                  : "border-transparent text-[#7c867f] hover:text-[#17201c]"
              }`}
            >
              <UserIcon size={15} className={activeTab === "profile" ? "text-[#54801b]" : ""} />
              Club Profile & Hours
            </button>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: OVERVIEW */}
          {/* ========================================================= */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="rounded-2xl border border-[#e1e7df] bg-white p-4 shadow-xs">
                  <span className="text-[11px] font-bold text-[#717c74] block uppercase">Total Courts</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#17201c]">{selectedVenue.courts?.length || 0}</span>
                    <span className="text-[11px] font-semibold text-[#527e1f]">
                      ({selectedVenue.courts?.filter((c: any) => c.isActive).length || 0} active)
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e1e7df] bg-white p-4 shadow-xs">
                  <span className="text-[11px] font-bold text-[#717c74] block uppercase">Confirmed Bookings</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#17201c]">
                      {kpis?.confirmedBookings?.value ?? overviewBookings.length}
                    </span>
                    <span className="text-[11px] font-semibold text-[#527e1f]">confirmed</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e1e7df] bg-white p-4 shadow-xs">
                  <span className="text-[11px] font-bold text-[#717c74] block uppercase">Total Bookings</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#17201c]">
                      {kpis?.totalBookings?.value ?? overviewBookings.length}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-400">recorded</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e1e7df] bg-white p-4 shadow-xs">
                  <span className="text-[11px] font-bold text-[#717c74] block uppercase">Operating Hours</span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-base sm:text-lg font-black text-[#17201c]">
                      {selectedVenue.openTime} - {selectedVenue.closeTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Today's & Upcoming Bookings Schedule */}
              <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#edf1eb]">
                  <div>
                    <h3 className="text-sm font-black text-[#17201c]">Upcoming & Recent Bookings</h3>
                    <p className="text-xs text-[#717c74]">
                      Recent reservations made specifically for courts in {selectedVenue.name}.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("bookings")}
                    className="text-xs font-bold text-[#3d6e11] hover:underline flex items-center gap-1"
                  >
                    View All Bookings <ArrowRight size={13} />
                  </button>
                </div>

                {overviewBookings.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400">
                    No bookings found for this venue. As players reserve courts, they will appear here.
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f7f8f4] text-[#69756c] font-black border-b border-[#edf1eb]">
                        <tr>
                          <th className="px-3.5 py-2.5">Booking Code</th>
                          <th className="px-3.5 py-2.5">Court</th>
                          <th className="px-3.5 py-2.5">Customer</th>
                          <th className="px-3.5 py-2.5">Date & Time</th>
                          <th className="px-3.5 py-2.5">Status</th>
                          <th className="px-3.5 py-2.5">Payment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0f3ec]">
                        {overviewBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-[#fafbf9]">
                            <td className="px-3.5 py-3 font-mono font-bold text-[#17201c]">
                              {b.bookingCode || `BK-${b.id}`}
                            </td>
                            <td className="px-3.5 py-3 font-bold text-[#17201c]">{b.court?.name}</td>
                            <td className="px-3.5 py-3">
                              <p className="font-bold text-[#17201c]">{b.customerDisplayName || b.user?.name || "Player"}</p>
                              {b.customerDisplayPhone && (
                                <p className="text-[10px] text-gray-400">{b.customerDisplayPhone}</p>
                              )}
                            </td>
                            <td className="px-3.5 py-3">
                              <p className="font-bold text-[#17201c]">{b.bookingDate ? b.bookingDate.slice(0, 10) : ""}</p>
                              <p className="text-[10px] text-[#54801b] font-semibold">{b.startTime} - {b.endTime}</p>
                            </td>
                            <td className="px-3.5 py-3">
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-black ${
                                  b.status === "CONFIRMED"
                                    ? "bg-[#eaf7d5] text-[#3c6b12]"
                                    : b.status === "COMPLETED"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                            <td className="px-3.5 py-3">
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                  b.paymentStatus === "PAID"
                                    ? "bg-[#eaf7d5] text-[#3c6b12]"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {b.paymentStatus || "PENDING"} ({formatPrice(b.totalPrice)})
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: MY COURTS */}
          {/* ========================================================= */}
          {activeTab === "courts" && (
            <div className="space-y-6">
              {/* Header with Add Court Button */}
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#e1e7df]">
                <div>
                  <h3 className="text-base font-black text-[#17201c]">Manage Courts for {selectedVenue.name}</h3>
                  <p className="text-xs text-[#717c74]">
                    Add, edit hourly rates, customize surface materials, and inspect court schedules.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingCourt(true)}
                  className="rounded-xl bg-[#17201c] text-white px-4 py-2 text-xs font-black flex items-center gap-1.5 hover:bg-black active:scale-95 transition"
                >
                  <Plus size={14} className="text-[#a8e63d]" /> Add Court
                </button>
              </div>

              {/* Inline Add Court Modal / Form */}
              {isAddingCourt && (
                <form
                  onSubmit={handleAddCourt}
                  className="bg-white p-5 rounded-2xl border-2 border-[#17201c] shadow-sm space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#edf1eb]">
                    <h4 className="font-black text-sm text-[#17201c]">Add New Court</h4>
                    <button
                      type="button"
                      onClick={() => setIsAddingCourt(false)}
                      className="text-gray-400 hover:text-black font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-[#5c6760] block mb-1">Court Name</label>
                      <input
                        type="text"
                        required
                        value={newCourtName}
                        onChange={(e) => setNewCourtName(e.target.value)}
                        placeholder="e.g. Court 03"
                        className="w-full rounded-xl border border-[#d2dcd0] p-2 font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[#5c6760] block mb-1">Price / Hour (VND)</label>
                      <input
                        type="number"
                        step={10000}
                        required
                        value={newCourtPrice}
                        onChange={(e) => setNewCourtPrice(parseInt(e.target.value, 10))}
                        className="w-full rounded-xl border border-[#d2dcd0] p-2 font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[#5c6760] block mb-1">Surface Type</label>
                      <input
                        type="text"
                        value={newCourtSurface}
                        onChange={(e) => setNewCourtSurface(e.target.value)}
                        placeholder="Taraflex Pro Turf"
                        className="w-full rounded-xl border border-[#d2dcd0] p-2 font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingCourt(false)}
                      className="rounded-xl border border-gray-300 px-4 py-1.5 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingCourt}
                      className="rounded-xl bg-[#a8e63d] px-5 py-1.5 font-black text-[#17201c]"
                    >
                      {isSubmittingCourt ? "Adding..." : "Save Court"}
                    </button>
                  </div>
                </form>
              )}

              {/* Courts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedVenue.courts?.map((court: any) => {
                  const isEditing = editingCourtId === court.id;

                  return (
                    <div
                      key={court.id}
                      className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-[#edf1eb]">
                          <div>
                            <h4 className="text-base font-black text-[#17201c]">{court.name}</h4>
                            <span className="text-[11px] font-bold text-[#54801b]">{court.surface || "Taraflex Pro Turf"}</span>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                              court.isActive ? "bg-[#eaf7d5] text-[#3c6b12]" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {court.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>

                        {/* Pricing details */}
                        {isEditing ? (
                          <div className="mt-3 space-y-2 text-xs">
                            <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Hourly Price (VND)</label>
                              <input
                                type="number"
                                step={10000}
                                value={editingPrice}
                                onChange={(e) => setEditingPrice(parseInt(e.target.value, 10))}
                                className="w-full rounded-xl border border-gray-300 p-2 font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Surface</label>
                              <input
                                type="text"
                                value={editingSurface}
                                onChange={(e) => setEditingSurface(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 p-2 font-bold"
                              />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => handleSaveCourtPrice(court.id)}
                                disabled={isSavingCourt}
                                className="flex-1 rounded-xl bg-[#17201c] text-white py-1.5 font-bold text-xs"
                              >
                                {isSavingCourt ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={() => setEditingCourtId(null)}
                                className="rounded-xl border border-gray-300 px-3 py-1.5 font-bold text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 flex items-baseline justify-between">
                            <span className="text-xs text-gray-500">Hourly Rate:</span>
                            <span className="text-lg font-black text-[#17201c]">{formatPrice(court.priceHour)}/h</span>
                          </div>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="mt-4 pt-3 border-t border-[#edf1eb] flex items-center justify-between">
                          <button
                            onClick={() => {
                              setEditingCourtId(court.id);
                              setEditingPrice(court.priceHour);
                              setEditingSurface(court.surface || "Taraflex Pro Turf");
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#17201c] hover:text-[#52811a]"
                          >
                            <Edit2 size={12} /> Edit Details
                          </button>
                          <button
                            onClick={() => handleDeleteCourt(court.id)}
                            className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Schedule Matrix View */}
              <div className="bg-white p-5 rounded-2xl border border-[#e1e7df] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-[#17201c]">Daily Court Availability Matrix</h3>
                    <p className="text-xs text-[#717c74]">Inspect booked vs available slots for any date.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="rounded-xl border border-[#d2dcd0] bg-[#fafbf9] px-3 py-1.5 text-xs font-bold"
                    />
                    <button
                      onClick={loadScheduleMatrix}
                      className="rounded-xl bg-[#17201c] text-white px-3 py-1.5 text-xs font-bold flex items-center gap-1"
                    >
                      <RefreshCw size={12} /> Refresh
                    </button>
                  </div>
                </div>

                {isLoadingMatrix ? (
                  <div className="p-8 text-center text-xs text-gray-400">Loading court timetable...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[500px]">
                      <thead className="bg-[#f7f8f4] border-b border-[#e1e7df]">
                        <tr>
                          <th className="px-4 py-2.5 font-black text-[#68736c]">Time Slot</th>
                          {selectedVenue.courts?.map((c: any) => (
                            <th key={c.id} className="px-4 py-2.5 font-black text-[#17201c]">
                              {c.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#edf1ea]">
                        {(matrixData[selectedVenue.courts?.[0]?.id] || []).map((slot: any) => (
                          <tr key={slot.time} className="hover:bg-[#fafbf9]">
                            <td className="px-4 py-2 font-bold text-[#68736c]">{slot.time}</td>
                            {selectedVenue.courts?.map((c: any) => {
                              const courtSlots = matrixData[c.id] || [];
                              const targetSlot = courtSlots.find((s: any) => s.time === slot.time);

                              return (
                                <td key={c.id} className="px-3 py-2">
                                  {!targetSlot || targetSlot.available ? (
                                    <span className="inline-block rounded-md bg-[#eaf7d5] px-2 py-0.5 text-[10.5px] font-bold text-[#456e18]">
                                      Available
                                    </span>
                                  ) : targetSlot.status === "BOOKED" ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-gray-200 px-2 py-0.5 text-[10.5px] font-bold text-gray-700">
                                      <Lock size={10} /> Booked
                                    </span>
                                  ) : targetSlot.status === "MAINTENANCE" ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold text-amber-800">
                                      <Wrench size={10} /> Maintenance
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-gray-400">Past</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Maintenance Blocks Management */}
              <div className="grid gap-6 md:grid-cols-[1fr_360px]">
                {/* Active blocks */}
                <div className="bg-white p-5 rounded-2xl border border-[#e1e7df] shadow-xs">
                  <h4 className="text-sm font-black text-[#17201c] mb-1">Scheduled Maintenance Blocks</h4>
                  <p className="text-xs text-[#717c74] mb-4">
                    Courts under maintenance are locked so players cannot book during these hours.
                  </p>

                  {(() => {
                    const allBlocks: any[] = [];
                    selectedVenue.courts?.forEach((c: any) => {
                      c.maintenanceBlocks?.forEach((mb: any) => {
                        allBlocks.push({ ...mb, courtName: c.name });
                      });
                    });

                    if (allBlocks.length === 0) {
                      return (
                        <div className="p-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                          No active maintenance blocks.
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2.5">
                        {allBlocks.map((b) => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/50 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#17201c]">{b.courtName}</span>
                                <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-black text-amber-900">
                                  {b.startTime} - {b.endTime}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-600 mt-0.5">
                                Date: {b.date ? b.date.slice(0, 10) : ""} · {b.reason || "Routine Maintenance"}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteMaintenance(b.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete block"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Schedule Maintenance Form */}
                <div className="bg-white p-5 rounded-2xl border border-[#e1e7df] shadow-xs self-start text-xs">
                  <h4 className="text-sm font-black text-[#17201c] mb-1">Add Maintenance Block</h4>
                  <p className="text-[11px] text-[#717c74] mb-3">
                    Temporarily lock a court for cleaning or repairs.
                  </p>

                  {maintenanceError && (
                    <div className="mb-3 p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold text-[11px]">
                      {maintenanceError}
                    </div>
                  )}

                  <form onSubmit={handleAddMaintenance} className="space-y-3">
                    <div>
                      <label className="font-bold block mb-1 text-[11px]">Court</label>
                      <select
                        value={mCourtId}
                        onChange={(e) => setMCourtId(parseInt(e.target.value, 10))}
                        className="w-full rounded-xl border border-gray-300 bg-white p-2 font-bold"
                      >
                        {selectedVenue.courts?.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold block mb-1 text-[11px]">Date</label>
                      <input
                        type="date"
                        value={mDate}
                        onChange={(e) => setMDate(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white p-2 font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-bold block mb-1 text-[11px]">Start Time</label>
                        <input
                          type="text"
                          value={mStartTime}
                          onChange={(e) => setMStartTime(e.target.value)}
                          placeholder="12:00"
                          className="w-full rounded-xl border border-gray-300 bg-white p-2 font-bold"
                        />
                      </div>
                      <div>
                        <label className="font-bold block mb-1 text-[11px]">End Time</label>
                        <input
                          type="text"
                          value={mEndTime}
                          onChange={(e) => setMEndTime(e.target.value)}
                          placeholder="14:00"
                          className="w-full rounded-xl border border-gray-300 bg-white p-2 font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold block mb-1 text-[11px]">Reason</label>
                      <input
                        type="text"
                        value={mReason}
                        onChange={(e) => setMReason(e.target.value)}
                        placeholder="e.g. Net Tensioning"
                        className="w-full rounded-xl border border-gray-300 bg-white p-2 font-bold"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingMaintenance}
                      className="w-full rounded-xl bg-[#17201c] text-white py-2 font-black text-xs hover:bg-[#2c3a32] active:scale-95 disabled:opacity-50"
                    >
                      {isSubmittingMaintenance ? "Scheduling..." : "Schedule Block"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: BOOKINGS */}
          {/* ========================================================= */}
          {activeTab === "bookings" && (
            <OwnerBookingsSection
              ownerId={user.id}
              venueId={selectedVenueId || undefined}
              preset={preset}
              startDate={customStart}
              endDate={customEnd}
              courts={selectedVenue.courts || []}
              currency={selectedVenue.currency || "VND"}
            />
          )}

          {/* ========================================================= */}
          {/* TAB 4: PROFILE / CLUB INFORMATION */}
          {/* ========================================================= */}
          {activeTab === "profile" && (
            <div className="max-w-2xl bg-white p-6 sm:p-8 rounded-2xl border border-[#e1e7df] shadow-xs">
              <h3 className="text-lg font-black text-[#17201c] mb-1">Club Information & Operating Hours</h3>
              <p className="text-xs text-[#717c74] mb-6">
                Update your facility details, contact location, and daily hours. These details are visible to players when browsing and reserving courts.
              </p>

              <form onSubmit={handleSaveVenueSettings} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-[#5c665f] block mb-1">Club / Venue Name</label>
                  <input
                    type="text"
                    required
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    className="w-full rounded-xl border border-[#dce3da] bg-[#fafbf9] px-3.5 py-2.5 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#5c665f] block mb-1">Opening Time (HH:mm)</label>
                    <input
                      type="text"
                      required
                      value={venueOpenTime}
                      onChange={(e) => setVenueOpenTime(e.target.value)}
                      placeholder="06:00"
                      className="w-full rounded-xl border border-[#dce3da] bg-[#fafbf9] px-3.5 py-2.5 font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#5c665f] block mb-1">Closing Time (HH:mm)</label>
                    <input
                      type="text"
                      required
                      value={venueCloseTime}
                      onChange={(e) => setVenueCloseTime(e.target.value)}
                      placeholder="23:00"
                      className="w-full rounded-xl border border-[#dce3da] bg-[#fafbf9] px-3.5 py-2.5 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#5c665f] block mb-1">Full Club Address</label>
                  <input
                    type="text"
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    placeholder="e.g. 125 Nguyen Trai, Thanh Xuan, Hanoi"
                    className="w-full rounded-xl border border-[#dce3da] bg-[#fafbf9] px-3.5 py-2.5 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#5c665f] block mb-1">Club Description & Amenities</label>
                  <textarea
                    rows={4}
                    value={venueDescription}
                    onChange={(e) => setVenueDescription(e.target.value)}
                    placeholder="Describe court quality, shuttlecock stringing, parking, amenities..."
                    className="w-full rounded-xl border border-[#dce3da] bg-[#fafbf9] px-3.5 py-2.5 font-medium leading-relaxed"
                  />
                </div>

                {venueSaveMessage && (
                  <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-800 font-bold text-xs flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-600" />
                    <span>{venueSaveMessage}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingVenue}
                    className="rounded-xl bg-[#a8e63d] px-6 py-2.5 font-black text-xs text-[#17201c] hover:bg-[#b8ef59] active:scale-95 disabled:opacity-50 transition shadow-sm"
                  >
                    {isSavingVenue ? "Saving..." : "Save Club Details"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function OwnerPortalPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Loading Owner Portal...</div>}>
      <OwnerPortalInner />
    </Suspense>
  );
}
