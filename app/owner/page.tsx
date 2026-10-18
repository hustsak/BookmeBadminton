"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
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
  SlidersHorizontal,
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
  BarChart3,
  Activity,
  FileSpreadsheet,
  PieChart,
  Settings,
  TrendingUp,
} from "lucide-react";

import { DateFilterPreset, OwnerOverviewKPIs } from "@/lib/owner-analytics";
import { OwnerDateFilter } from "@/components/owner/OwnerDateFilter";
import { OwnerKpiGrid } from "@/components/owner/OwnerKpiGrid";
import { OwnerRevenueSection } from "@/components/owner/OwnerRevenueSection";
import { OwnerUtilizationSection } from "@/components/owner/OwnerUtilizationSection";
import { OwnerCourtsSection } from "@/components/owner/OwnerCourtsSection";
import { OwnerBookingsSection } from "@/components/owner/OwnerBookingsSection";
import { OwnerReportsSection } from "@/components/owner/OwnerReportsSection";

function formatPrice(value: number) {
  return `${value.toLocaleString("en-US")}₫`;
}

type MainTab =
  | "overview"
  | "bookings"
  | "courts"
  | "revenue"
  | "utilization"
  | "reports"
  | "settings";

type SettingsSubTab = "schedule" | "pricing" | "hours" | "maintenance";

export default function OwnerPortalPage() {
  const { user } = useApp();

  // Active Owner Selection (supports demonstrating venue isolation between Owner 1 and Owner 2)
  const [selectedOwnerId, setSelectedOwnerId] = useState<number>(() => {
    return user && (user.role === "OWNER" || user.role === "ADMIN") ? user.id : 5;
  });

  const [venues, setVenues] = useState<any[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [isLoadingVenues, setIsLoadingVenues] = useState(true);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<MainTab>("overview");
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>("schedule");

  // Date Filter State
  const [preset, setPreset] = useState<DateFilterPreset>("last30days");
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Overview KPIs State
  const [kpis, setKpis] = useState<OwnerOverviewKPIs | null>(null);
  const [isLoadingKpis, setIsLoadingKpis] = useState(false);

  // Maintenance Form State
  const [mCourtId, setMCourtId] = useState<number>(0);
  const [mDate, setMDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [mStartTime, setMStartTime] = useState<string>("12:00");
  const [mEndTime, setMEndTime] = useState<string>("14:00");
  const [mReason, setMReason] = useState<string>("Court Floor Cleaning & Net Tensioning");
  const [isSubmittingMaintenance, setIsSubmittingMaintenance] = useState(false);

  // Venue Settings Form State
  const [venueOpenTime, setVenueOpenTime] = useState("06:00");
  const [venueCloseTime, setVenueCloseTime] = useState("23:00");
  const [venueAddress, setVenueAddress] = useState("");
  const [venueDescription, setVenueDescription] = useState("");
  const [isSavingVenue, setIsSavingVenue] = useState(false);
  const [venueSaveMessage, setVenueSaveMessage] = useState("");

  // Court Price Edit State
  const [editingCourtId, setEditingCourtId] = useState<number | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(100000);
  const [editingSurface, setEditingSurface] = useState<string>("");
  const [isSavingCourt, setIsSavingCourt] = useState(false);

  // Schedule Matrix Date
  const [scheduleDate, setScheduleDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [matrixData, setMatrixData] = useState<Record<number, any>>({});
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(false);

  // Load Venues owned by selected owner (Verifies Venue Isolation!)
  async function loadOwnerVenues() {
    setIsLoadingVenues(true);
    try {
      const res = await fetch(`/api/owner/venues?ownerId=${selectedOwnerId}`);
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
    loadOwnerVenues();
  }, [selectedOwnerId]);

  // Selected Venue Object
  const selectedVenue = useMemo(() => {
    return venues.find((v) => v.id === selectedVenueId) || venues[0] || null;
  }, [venues, selectedVenueId]);

  // Populate venue settings form when selected venue changes
  useEffect(() => {
    if (selectedVenue) {
      setVenueOpenTime(selectedVenue.openTime || "06:00");
      setVenueCloseTime(selectedVenue.closeTime || "23:00");
      setVenueAddress(selectedVenue.address || selectedVenue.location || "");
      setVenueDescription(selectedVenue.description || "");
      if (selectedVenue.courts && selectedVenue.courts.length > 0) {
        setMCourtId(selectedVenue.courts[0].id);
      }
    }
  }, [selectedVenue]);

  // Load Overview KPIs
  async function loadOverviewKpis() {
    setIsLoadingKpis(true);
    try {
      let url = `/api/owner/analytics/overview?ownerId=${selectedOwnerId}&preset=${preset}`;
      if (selectedVenueId) url += `&venueId=${selectedVenueId}`;
      if (preset === "custom" && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.data) {
        setKpis(data.data);
      }
    } catch (err) {
      console.error("Failed to load KPIs:", err);
    } finally {
      setIsLoadingKpis(false);
    }
  }

  useEffect(() => {
    loadOverviewKpis();
  }, [selectedOwnerId, selectedVenueId, preset, customStart, customEnd]);

  // Load Schedule Matrix
  async function loadScheduleMatrix() {
    if (!selectedVenue?.courts) return;
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
    if (activeTab === "settings" && settingsSubTab === "schedule" && selectedVenue) {
      loadScheduleMatrix();
    }
  }, [activeTab, settingsSubTab, selectedVenueId, scheduleDate]);

  // Action: Save Venue Hours & Info
  async function handleSaveVenueSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVenueId) return;
    setIsSavingVenue(true);
    setVenueSaveMessage("");

    try {
      const res = await fetch(`/api/owner/venues/${selectedVenueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: selectedOwnerId,
          openTime: venueOpenTime,
          closeTime: venueCloseTime,
          address: venueAddress,
          description: venueDescription,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setVenueSaveMessage("Operating hours and venue details updated successfully!");
        loadOwnerVenues();
      } else {
        setVenueSaveMessage(data.message || "Failed to update venue.");
      }
    } catch (err) {
      setVenueSaveMessage("Failed to update venue.");
    } finally {
      setIsSavingVenue(false);
    }
  }

  // Action: Save Court Price
  async function handleSaveCourtPrice(courtId: number) {
    setIsSavingCourt(true);
    try {
      const res = await fetch(`/api/owner/courts/${courtId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: selectedOwnerId,
          priceHour: editingPrice,
          surface: editingSurface || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingCourtId(null);
        loadOwnerVenues();
      }
    } catch (err) {
      console.error("Failed to update court:", err);
    } finally {
      setIsSavingCourt(false);
    }
  }

  // Action: Add Maintenance Block
  async function handleAddMaintenance(e: React.FormEvent) {
    e.preventDefault();
    if (!mCourtId) return;
    setIsSubmittingMaintenance(true);

    try {
      const res = await fetch("/api/owner/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: selectedOwnerId,
          courtId: mCourtId,
          date: mDate,
          startTime: mStartTime,
          endTime: mEndTime,
          reason: mReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        loadOwnerVenues();
        if (settingsSubTab === "schedule") loadScheduleMatrix();
        loadOverviewKpis();
        alert("Maintenance block scheduled. The court slots will now show as unavailable during this time.");
      } else {
        alert(data.message || "Failed to schedule maintenance.");
      }
    } catch (err) {
      alert("Error scheduling maintenance block.");
    } finally {
      setIsSubmittingMaintenance(false);
    }
  }

  // Action: Remove Maintenance Block
  async function handleDeleteMaintenance(blockId: number) {
    if (!confirm("Are you sure you want to remove this maintenance block?")) return;
    try {
      const res = await fetch(`/api/owner/maintenance/${blockId}?ownerId=${selectedOwnerId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        loadOwnerVenues();
        if (settingsSubTab === "schedule") loadScheduleMatrix();
        loadOverviewKpis();
      }
    } catch (err) {
      console.error("Delete maintenance error:", err);
    }
  }

  const effectiveCurrency = selectedVenue?.currency || "VND";

  return (
    <main className="min-h-screen bg-[#F7F8F4] text-[#17201C] pb-24 w-full max-w-full overflow-x-hidden">
      <Navbar />
      <LoginModal />

      {/* OWNER HEADER & VENUE ISOLATION SWITCHER */}
      <section className="border-b border-[#e1e7df] bg-white px-4 py-5 sm:px-6 shadow-xs">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#17201c] px-3 py-1 text-[11px] font-black text-[#a8e63d]">
                  OWNER BUSINESS DASHBOARD
                </span>
                <span className="rounded-full bg-[#eaf7d5] px-2.5 py-0.5 text-[11px] font-bold text-[#3d6b11]">
                  Verified Analytics
                </span>
              </div>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-black text-[#17201c]">
                Business Performance & Operations<span className="text-[#a8e63d]">.</span>
              </h1>
              <p className="text-xs text-[#717c74] mt-0.5">
                Real-time revenue ledger, court utilization tracking, peak hour intelligence, and booking management.
              </p>
            </div>

            {/* Owner Role Switcher (Demonstrates Strict Venue Isolation) */}
            <div className="flex items-center gap-2 self-start md:self-auto rounded-2xl bg-[#f2f4ef] p-1.5 border border-[#e1e7df]">
              <span className="text-[11px] font-bold text-[#627065] px-2 flex items-center gap-1">
                <ShieldCheck size={14} className="text-[#3c6b12]" /> Owner:
              </span>
              <button
                onClick={() => setSelectedOwnerId(5)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                  selectedOwnerId === 5
                    ? "bg-white text-[#17201c] shadow-2xs"
                    : "text-[#627065] hover:text-[#17201c]"
                }`}
              >
                Smash Management (ID 5)
              </button>
              <button
                onClick={() => setSelectedOwnerId(6)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                  selectedOwnerId === 6
                    ? "bg-white text-[#17201c] shadow-2xs"
                    : "text-[#627065] hover:text-[#17201c]"
                }`}
              >
                SkyCourt Arena (ID 6)
              </button>
            </div>
          </div>

          {/* VENUE SELECTOR TABS (Enforces Venue Isolation) */}
          <div className="mt-5 flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            <span className="text-xs font-bold text-[#7a867e] mr-1 shrink-0">Your Venues:</span>
            {isLoadingVenues ? (
              <span className="text-xs text-gray-400">Loading owned venues...</span>
            ) : venues.length === 0 ? (
              <span className="text-xs text-red-500 font-semibold">No venues assigned to this owner.</span>
            ) : (
              venues.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVenueId(v.id)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition active:scale-95 ${
                    selectedVenueId === v.id
                      ? "bg-[#17201c] text-white shadow-sm"
                      : "bg-[#f2f4ef] text-[#5c6860] hover:bg-[#e6eae2]"
                  }`}
                >
                  <Building2 size={13} className={selectedVenueId === v.id ? "text-[#a8e63d]" : ""} />
                  <span>{v.name}</span>
                  <span className="text-[10px] opacity-75">({v.courts?.length || 0} courts)</span>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      {/* DASHBOARD CONTENT */}
      {selectedVenue ? (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
          {/* TOP DATE FILTER CONTROLS */}
          <OwnerDateFilter
            preset={preset}
            onPresetChange={(p) => setPreset(p)}
            startDate={customStart}
            endDate={customEnd}
            onCustomDateChange={(s, e) => {
              setCustomStart(s);
              setCustomEnd(e);
            }}
            currentRangeLabel={kpis?.dateRange ? `${kpis.dateRange.start} → ${kpis.dateRange.end}` : undefined}
            previousRangeLabel={
              kpis?.previousDateRange ? `${kpis.previousDateRange.start} → ${kpis.previousDateRange.end}` : undefined
            }
          />

          {/* MAIN NAVIGATION TABS */}
          <div className="flex border-b border-[#e1e7df] gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-black transition ${
                activeTab === "overview"
                  ? "border-[#17201c] text-[#17201c]"
                  : "border-transparent text-[#7c867f] hover:text-[#17201c]"
              }`}
            >
              <BarChart3 size={14} />
              Overview
            </button>

            <button
              onClick={() => setActiveTab("bookings")}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-black transition ${
                activeTab === "bookings"
                  ? "border-[#17201c] text-[#17201c]"
                  : "border-transparent text-[#7c867f] hover:text-[#17201c]"
              }`}
            >
              <Calendar size={14} />
              Bookings Management
            </button>

            <button
              onClick={() => setActiveTab("revenue")}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-black transition ${
                activeTab === "revenue"
                  ? "border-[#17201c] text-[#17201c]"
                  : "border-transparent text-[#7c867f] hover:text-[#17201c]"
              }`}
            >
              <DollarSign size={14} />
              Revenue Analytics
            </button>

            <button
              onClick={() => setActiveTab("utilization")}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-black transition ${
                activeTab === "utilization"
                  ? "border-[#17201c] text-[#17201c]"
                  : "border-transparent text-[#7c867f] hover:text-[#17201c]"
              }`}
            >
              <Activity size={14} />
              Court Utilization & Peak Hours
            </button>

            <button
              onClick={() => setActiveTab("courts")}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-black transition ${
                activeTab === "courts"
                  ? "border-[#17201c] text-[#17201c]"
                  : "border-transparent text-[#7c867f] hover:text-[#17201c]"
              }`}
            >
              <Layers size={14} />
              Courts Performance
            </button>

            <button
              onClick={() => setActiveTab("reports")}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-black transition ${
                activeTab === "reports"
                  ? "border-[#17201c] text-[#17201c]"
                  : "border-transparent text-[#7c867f] hover:text-[#17201c]"
              }`}
            >
              <FileSpreadsheet size={14} />
              Reports & Exports
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-black transition ${
                activeTab === "settings"
                  ? "border-[#17201c] text-[#17201c]"
                  : "border-transparent text-[#7c867f] hover:text-[#17201c]"
              }`}
            >
              <Settings size={14} />
              Venue Settings & Ops
            </button>
          </div>

          {/* TAB CONTENT: 1. OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* 8 Essential Business KPI Cards with Preceding Period Comparison */}
              <OwnerKpiGrid kpis={kpis} isLoading={isLoadingKpis} currency={effectiveCurrency} />

              {/* Quick Visuals Preview: Revenue Highlights & Peak Hour Demand */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-[#f0f3ed]">
                    <div>
                      <h3 className="text-sm font-black text-[#17201c]">Revenue Intelligence</h3>
                      <p className="text-xs text-[#717c74]">Collection efficiency and cash flow breakdown.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("revenue")}
                      className="text-xs font-bold text-[#3c6b12] hover:underline flex items-center gap-1"
                    >
                      View Details <ArrowRight size={12} />
                    </button>
                  </div>
                  <div className="mt-4">
                    <OwnerRevenueSection
                      ownerId={selectedOwnerId}
                      venueId={selectedVenueId || undefined}
                      preset={preset}
                      startDate={customStart}
                      endDate={customEnd}
                      currency={effectiveCurrency}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-[#f0f3ed]">
                    <div>
                      <h3 className="text-sm font-black text-[#17201c]">Utilization & Court Demand</h3>
                      <p className="text-xs text-[#717c74]">Court capacity utilization and busy intervals.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("utilization")}
                      className="text-xs font-bold text-[#3c6b12] hover:underline flex items-center gap-1"
                    >
                      View Details <ArrowRight size={12} />
                    </button>
                  </div>
                  <div className="mt-4">
                    <OwnerUtilizationSection
                      ownerId={selectedOwnerId}
                      venueId={selectedVenueId || undefined}
                      preset={preset}
                      startDate={customStart}
                      endDate={customEnd}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: 2. BOOKINGS MANAGEMENT */}
          {activeTab === "bookings" && (
            <OwnerBookingsSection
              ownerId={selectedOwnerId}
              venueId={selectedVenueId || undefined}
              preset={preset}
              startDate={customStart}
              endDate={customEnd}
              courts={selectedVenue.courts || []}
              currency={effectiveCurrency}
            />
          )}

          {/* TAB CONTENT: 3. REVENUE ANALYTICS */}
          {activeTab === "revenue" && (
            <OwnerRevenueSection
              ownerId={selectedOwnerId}
              venueId={selectedVenueId || undefined}
              preset={preset}
              startDate={customStart}
              endDate={customEnd}
              currency={effectiveCurrency}
            />
          )}

          {/* TAB CONTENT: 4. UTILIZATION & PEAK HOURS */}
          {activeTab === "utilization" && (
            <OwnerUtilizationSection
              ownerId={selectedOwnerId}
              venueId={selectedVenueId || undefined}
              preset={preset}
              startDate={customStart}
              endDate={customEnd}
            />
          )}

          {/* TAB CONTENT: 5. COURTS PERFORMANCE */}
          {activeTab === "courts" && (
            <OwnerCourtsSection
              ownerId={selectedOwnerId}
              venueId={selectedVenueId || undefined}
              preset={preset}
              startDate={customStart}
              endDate={customEnd}
              currency={effectiveCurrency}
              onEditPricing={(cId) => {
                setActiveTab("settings");
                setSettingsSubTab("pricing");
                setEditingCourtId(cId);
              }}
            />
          )}

          {/* TAB CONTENT: 6. REPORTS & EXPORTS */}
          {activeTab === "reports" && (
            <OwnerReportsSection
              ownerId={selectedOwnerId}
              venueId={selectedVenueId || undefined}
              preset={preset}
              startDate={customStart}
              endDate={customEnd}
              courts={selectedVenue.courts || []}
              currency={effectiveCurrency}
            />
          )}

          {/* TAB CONTENT: 7. VENUE SETTINGS & OPERATIONS */}
          {activeTab === "settings" && (
            <div className="space-y-4">
              {/* Settings Sub-navigation */}
              <div className="flex border-b border-[#e1e7df] gap-1 overflow-x-auto scrollbar-none pb-1">
                {(
                  [
                    { id: "schedule", label: "Court Schedule Matrix", icon: Table },
                    { id: "pricing", label: "Pricing & Surfaces", icon: DollarSign },
                    { id: "hours", label: "Operating Hours & Info", icon: Clock },
                    { id: "maintenance", label: "Maintenance Blocks", icon: Wrench },
                  ] as const
                ).map((sub) => {
                  const Icon = sub.icon;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setSettingsSubTab(sub.id)}
                      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                        settingsSubTab === sub.id
                          ? "bg-[#17201c] text-white shadow-2xs"
                          : "bg-[#f2f4ef] text-[#5c6860] hover:bg-[#e4e8e0]"
                      }`}
                    >
                      <Icon size={13} />
                      {sub.label}
                    </button>
                  );
                })}
              </div>

              {/* Subtab: Schedule Matrix */}
              {settingsSubTab === "schedule" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#e1e7df]">
                    <div className="flex items-center gap-2">
                      <Calendar size={15} className="text-[#55811c]" />
                      <span className="text-xs font-bold text-[#17201c]">Select Schedule Date:</span>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="rounded-xl border border-[#d2dcd0] bg-[#fafbf9] px-2.5 py-1 text-xs font-bold text-[#17201c]"
                      />
                    </div>
                    <button
                      onClick={loadScheduleMatrix}
                      className="rounded-xl bg-[#17201c] text-white px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                    >
                      <RefreshCw size={12} /> Refresh
                    </button>
                  </div>

                  {isLoadingMatrix ? (
                    <div className="bg-white p-12 text-center text-xs text-[#717c74] rounded-2xl border border-[#e1e7df]">
                      Calculating court timeline for {scheduleDate}...
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-[#e1e7df] bg-white shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[500px]">
                          <thead className="bg-[#f7f8f4] border-b border-[#e1e7df]">
                            <tr>
                              <th className="px-4 py-3 font-black text-[#68736c]">Time Slot</th>
                              {selectedVenue.courts?.map((c: any) => (
                                <th key={c.id} className="px-4 py-3 font-black text-[#17201c]">
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
                    </div>
                  )}
                </div>
              )}

              {/* Subtab: Pricing & Surfaces */}
              {settingsSubTab === "pricing" && (
                <div className="bg-white p-5 rounded-2xl border border-[#e1e7df]">
                  <h3 className="text-sm font-black text-[#17201c] mb-1">Court Price Management</h3>
                  <p className="text-xs text-[#717c74] mb-4">
                    Adjust hourly pricing and flooring surface type for each court. Price updates apply immediately to upcoming bookings.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedVenue.courts?.map((court: any) => {
                      const isEditing = editingCourtId === court.id;

                      return (
                        <div
                          key={court.id}
                          className="rounded-2xl border border-[#e1e7df] bg-[#fafbf9] p-4 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-black text-[#17201c]">{court.name}</span>
                              <span className="rounded-full bg-[#17201c] px-2.5 py-0.5 text-[10px] font-black text-[#a8e63d]">
                                ID: {court.id}
                              </span>
                            </div>
                            <p className="text-xs text-[#527e1f] font-semibold mt-0.5">
                              {court.surface || "Taraflex Pro Turf"}
                            </p>
                          </div>

                          {isEditing ? (
                            <div className="mt-3 space-y-2 border-t border-[#edf1ea] pt-3 text-xs">
                              <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block">
                                  Price per hour ({effectiveCurrency})
                                </label>
                                <input
                                  type="number"
                                  step={10000}
                                  value={editingPrice}
                                  onChange={(e) => setEditingPrice(parseInt(e.target.value, 10))}
                                  className="w-full rounded-xl border border-gray-300 bg-white px-2.5 py-1 font-bold text-[#17201c]"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block">Surface Type</label>
                                <input
                                  type="text"
                                  value={editingSurface}
                                  onChange={(e) => setEditingSurface(e.target.value)}
                                  className="w-full rounded-xl border border-gray-300 bg-white px-2.5 py-1 font-bold text-[#17201c]"
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
                            <div className="mt-4 flex items-center justify-between border-t border-[#edf1ea] pt-3">
                              <div>
                                <span className="text-[10px] text-gray-400">Current Rate</span>
                                <p className="text-base font-black text-[#17201c]">
                                  {formatPrice(court.priceHour)}/h
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingCourtId(court.id);
                                  setEditingPrice(court.priceHour);
                                  setEditingSurface(court.surface || "Taraflex Pro Turf");
                                }}
                                className="flex items-center gap-1 rounded-xl border border-[#d2dcd0] bg-white px-3 py-1.5 text-xs font-bold text-[#17201c] hover:bg-gray-50 active:scale-95"
                              >
                                <Edit2 size={12} /> Edit Price
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Subtab: Hours & Info */}
              {settingsSubTab === "hours" && (
                <div className="max-w-2xl bg-white p-6 rounded-2xl border border-[#e1e7df]">
                  <h3 className="text-base font-black text-[#17201c] mb-1">Venue Operating Hours & Information</h3>
                  <p className="text-xs text-[#717c74] mb-4">
                    Set opening and closing hours for {selectedVenue.name}. Slots outside these hours will automatically be restricted.
                  </p>

                  <form onSubmit={handleSaveVenueSettings} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-[#5c665f] block mb-1">Opening Time (HH:mm)</label>
                        <input
                          type="text"
                          value={venueOpenTime}
                          onChange={(e) => setVenueOpenTime(e.target.value)}
                          placeholder="06:00"
                          className="w-full rounded-xl border border-[#dce3da] bg-[#fafbf9] px-3 py-2 font-bold"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-[#5c665f] block mb-1">Closing Time (HH:mm)</label>
                        <input
                          type="text"
                          value={venueCloseTime}
                          onChange={(e) => setVenueCloseTime(e.target.value)}
                          placeholder="23:00"
                          className="w-full rounded-xl border border-[#dce3da] bg-[#fafbf9] px-3 py-2 font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-[#5c665f] block mb-1">Full Venue Address</label>
                      <input
                        type="text"
                        value={venueAddress}
                        onChange={(e) => setVenueAddress(e.target.value)}
                        placeholder="125 Nguyen Trai, Thanh Xuan, Hanoi"
                        className="w-full rounded-xl border border-[#dce3da] bg-[#fafbf9] px-3 py-2 font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-[#5c665f] block mb-1">Venue Description</label>
                      <textarea
                        rows={3}
                        value={venueDescription}
                        onChange={(e) => setVenueDescription(e.target.value)}
                        className="w-full rounded-xl border border-[#dce3da] bg-[#fafbf9] px-3 py-2 text-xs font-medium"
                      />
                    </div>

                    {venueSaveMessage && (
                      <div className="p-2.5 rounded-xl bg-green-50 border border-green-200 text-green-800 font-bold text-xs">
                        {venueSaveMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSavingVenue}
                      className="rounded-xl bg-[#17201c] text-white px-5 py-2.5 font-black text-xs hover:bg-[#2c3a32] active:scale-95 disabled:opacity-50"
                    >
                      {isSavingVenue ? "Saving..." : "Save Operating Hours"}
                    </button>
                  </form>
                </div>
              )}

              {/* Subtab: Maintenance Blocks */}
              {settingsSubTab === "maintenance" && (
                <div className="grid gap-6 md:grid-cols-[1fr_360px]">
                  {/* Scheduled Blocks List */}
                  <div className="bg-white p-5 rounded-2xl border border-[#e1e7df]">
                    <h3 className="text-base font-black text-[#17201c] mb-1">Active Scheduled Maintenance Blocks</h3>
                    <p className="text-xs text-[#717c74] mb-4">
                      Courts are locked and excluded from available hours during maintenance blocks.
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
                            No maintenance blocks scheduled for this venue.
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
                                  Date: {b.date ? b.date.slice(0, 10) : ""} · Reason: {b.reason || "Routine Maintenance"}
                                </p>
                              </div>

                              <button
                                onClick={() => handleDeleteMaintenance(b.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg active:scale-95"
                                title="Delete maintenance block"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Add Maintenance Block Form */}
                  <div className="bg-white p-5 rounded-2xl border border-[#e1e7df] self-start text-xs">
                    <h4 className="text-sm font-black text-[#17201c] mb-1">Schedule Maintenance</h4>
                    <p className="text-[11px] text-[#717c74] mb-3">
                      Lock a court for net replacement, cleaning, or repairs.
                    </p>

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
                          placeholder="e.g. Floor resurfacing"
                          className="w-full rounded-xl border border-gray-300 bg-white p-2 font-bold"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingMaintenance}
                        className="w-full rounded-xl bg-[#17201c] text-white py-2.5 font-black text-xs hover:bg-[#2c3a32] active:scale-95 disabled:opacity-50"
                      >
                        {isSubmittingMaintenance ? "Scheduling..." : "Add Maintenance Block"}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-12 text-center text-sm text-gray-500">
          No venue available for this owner.
        </div>
      )}
    </main>
  );
}
