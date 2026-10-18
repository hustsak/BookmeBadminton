"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Search,
  Plus,
  Edit2,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  DollarSign,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Power,
  X,
} from "lucide-react";

function formatVND(value: number) {
  return `${value.toLocaleString("en-US")} ₫`;
}

export function AdminVenuesSection() {
  const [venues, setVenues] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [expandedVenueId, setExpandedVenueId] = useState<number | null>(null);

  // Modal: Add Venue
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [newVenueName, setNewVenueName] = useState("");
  const [newVenueLocation, setNewVenueLocation] = useState("");
  const [newVenueAddress, setNewVenueAddress] = useState("");
  const [newVenueDescription, setNewVenueDescription] = useState("");
  const [newVenueOpen, setNewVenueOpen] = useState("06:00");
  const [newVenueClose, setNewVenueClose] = useState("23:00");
  const [newVenueCourtsCount, setNewVenueCourtsCount] = useState(4);
  const [newVenueCourtPrice, setNewVenueCourtPrice] = useState(120000);
  const [isSubmittingVenue, setIsSubmittingVenue] = useState(false);

  // Modal: Add Court
  const [courtModalVenueId, setCourtModalVenueId] = useState<number | null>(null);
  const [newCourtName, setNewCourtName] = useState("");
  const [newCourtPrice, setNewCourtPrice] = useState(120000);
  const [newCourtSurface, setNewCourtSurface] = useState("Taraflex Pro Turf");
  const [isSubmittingCourt, setIsSubmittingCourt] = useState(false);

  // Safety Warning Dialog for Deactivation
  const [deactivateTarget, setDeactivateTarget] = useState<{
    type: "VENUE" | "COURT";
    id: number;
    name: string;
    currentActive: boolean;
  } | null>(null);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isProcessingToggle, setIsProcessingToggle] = useState(false);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (search.trim()) params.set("search", search.trim());
      if (status !== "ALL") params.set("status", status);

      const res = await fetch(`/api/admin/venues?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load venues.");
      }
      setVenues(json.data.venues);
      setTotalCount(json.data.totalCount);
      setTotalPages(json.data.totalPages);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error fetching venues.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, [page, status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchVenues();
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVenueName.trim() || !newVenueLocation.trim()) return;

    try {
      setIsSubmittingVenue(true);
      setError(null);
      const res = await fetch("/api/admin/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newVenueName.trim(),
          location: newVenueLocation.trim(),
          address: newVenueAddress.trim() || undefined,
          description: newVenueDescription.trim() || undefined,
          openTime: newVenueOpen,
          closeTime: newVenueClose,
          initialCourtCount: Number(newVenueCourtsCount),
          initialCourtPrice: Number(newVenueCourtPrice),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to create venue.");
      }

      setShowAddVenue(false);
      setNewVenueName("");
      setNewVenueLocation("");
      setNewVenueAddress("");
      setNewVenueDescription("");
      fetchVenues();
    } catch (err: any) {
      setError(err.message || "Failed to create venue.");
    } finally {
      setIsSubmittingVenue(false);
    }
  };

  const handleCreateCourt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courtModalVenueId || !newCourtName.trim()) return;

    try {
      setIsSubmittingCourt(true);
      setError(null);
      const res = await fetch("/api/admin/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: courtModalVenueId,
          name: newCourtName.trim(),
          priceHour: Number(newCourtPrice),
          surface: newCourtSurface.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to create court.");
      }

      setCourtModalVenueId(null);
      setNewCourtName("");
      fetchVenues();
    } catch (err: any) {
      setError(err.message || "Failed to add court.");
    } finally {
      setIsSubmittingCourt(false);
    }
  };

  const executeToggleActive = async () => {
    if (!deactivateTarget) return;

    try {
      setIsProcessingToggle(true);
      setActionError(null);
      setActionSuccess(null);

      const endpoint =
        deactivateTarget.type === "VENUE"
          ? `/api/admin/venues/${deactivateTarget.id}`
          : `/api/admin/courts/${deactivateTarget.id}`;

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !deactivateTarget.currentActive,
          reason: deactivateReason.trim() || "Status toggled by administrator",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to toggle status.");
      }

      setActionSuccess(
        `${deactivateTarget.type === "VENUE" ? "Venue" : "Court"} successfully ${
          deactivateTarget.currentActive ? "deactivated" : "activated"
        }.`
      );

      fetchVenues();
      setTimeout(() => {
        setDeactivateTarget(null);
        setActionSuccess(null);
      }, 1500);
    } catch (err: any) {
      setActionError(err.message || "Action failed.");
    } finally {
      setIsProcessingToggle(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-[#e1e7df] bg-white p-5 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7c867f]" />
            <input
              type="text"
              placeholder="Search venues by name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-[#e1e7df] bg-[#f8faf6] pl-10 pr-4 py-2 text-xs font-medium text-[#17201c] placeholder:text-[#7c867f] focus:border-[#a8e63d] focus:bg-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-2xl bg-[#17201c] px-4 py-2 text-xs font-bold text-white hover:bg-[#283730]"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-[#e1e7df] bg-white px-3 py-1.5 text-xs">
            <span className="text-[#7c867f] font-medium">Status:</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as any);
                setPage(1);
              }}
              className="font-bold text-[#17201c] bg-transparent outline-none cursor-pointer"
            >
              <option value="ALL">All Venues</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

          <button
            onClick={() => setShowAddVenue(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-[#17201c] px-4 py-2 text-xs font-bold text-white hover:bg-[#283730]"
          >
            <Plus className="h-4 w-4 text-[#a8e63d]" />
            Add New Venue
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Venues & Courts List */}
      <div className="space-y-4">
        {loading && venues.length === 0 ? (
          <div className="rounded-3xl border border-[#edf1eb] bg-white p-12 text-center text-xs text-[#7c867f]">
            Loading venues...
          </div>
        ) : venues.length === 0 ? (
          <div className="rounded-3xl border border-[#edf1eb] bg-white p-12 text-center text-xs text-[#7c867f]">
            No venues found matching the search criteria.
          </div>
        ) : (
          venues.map((venue) => {
            const isExpanded = expandedVenueId === venue.id;

            return (
              <div
                key={venue.id}
                className="overflow-hidden rounded-3xl border border-[#e1e7df] bg-white shadow-sm transition hover:border-[#a8e63d]/60"
              >
                {/* Venue Header Summary */}
                <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#edf1eb]">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f0fae1] text-[#365711]">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-[#17201c]">{venue.name}</h3>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                            venue.isActive
                              ? "bg-[#f0fae1] text-[#365711] border border-[#a8e63d]/50"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {venue.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#7c867f]">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-[#54801b]" />
                          {venue.location} {venue.address ? `• ${venue.address}` : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-[#54801b]" />
                          {venue.openTime} - {venue.closeTime}
                        </span>
                        {venue.owner && (
                          <span className="text-[#525f57]">
                            Owner: <span className="font-semibold">{venue.owner.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setDeactivateTarget({
                          type: "VENUE",
                          id: venue.id,
                          name: venue.name,
                          currentActive: venue.isActive,
                        })
                      }
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                        venue.isActive
                          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white"
                          : "border-[#a8e63d] bg-[#f0fae1] text-[#365711] hover:bg-[#a8e63d] hover:text-[#17201c]"
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" />
                      {venue.isActive ? "Deactivate Venue" : "Reactivate Venue"}
                    </button>

                    <button
                      onClick={() => setExpandedVenueId(isExpanded ? null : venue.id)}
                      className="flex items-center gap-1 rounded-xl border border-[#e1e7df] px-3 py-1.5 text-xs font-bold text-[#17201c] hover:bg-[#f8faf6]"
                    >
                      <span>Courts ({venue.courts.length})</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Courts Sub-section */}
                {isExpanded && (
                  <div className="bg-[#fbfcf9] p-5 sm:p-6 border-t border-[#edf1eb] space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-[#17201c] uppercase tracking-wider">
                        Courts in {venue.name} ({venue.courts.length})
                      </h4>
                      <button
                        onClick={() => setCourtModalVenueId(venue.id)}
                        className="flex items-center gap-1 rounded-xl bg-[#17201c] px-3 py-1 text-xs font-bold text-white hover:bg-[#283730]"
                      >
                        <Plus className="h-3 w-3 text-[#a8e63d]" />
                        Add Court
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {venue.courts.map((court: any) => (
                        <div
                          key={court.id}
                          className="rounded-2xl border border-[#edf1eb] bg-white p-4 shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs text-[#17201c]">{court.name}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                court.isActive
                                  ? "bg-[#f0fae1] text-[#365711]"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {court.isActive ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </div>
                          <div className="mt-2 text-[11px] text-[#7c867f] space-y-0.5">
                            <p>Surface: {court.surface || "Taraflex Pro Turf"}</p>
                            <p className="font-bold text-[#17201c]">
                              {formatVND(court.priceHour)} / hour
                            </p>
                          </div>
                          <div className="mt-3 flex items-center justify-end">
                            <button
                              onClick={() =>
                                setDeactivateTarget({
                                  type: "COURT",
                                  id: court.id,
                                  name: `${court.name} (${venue.name})`,
                                  currentActive: court.isActive,
                                })
                              }
                              className={`text-[11px] font-bold transition ${
                                court.isActive
                                  ? "text-red-600 hover:underline"
                                  : "text-[#365711] hover:underline"
                              }`}
                            >
                              {court.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Safety Deactivation Warning Dialog */}
      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-[#e1e7df] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#edf1eb]">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                    deactivateTarget.currentActive ? "bg-red-50 text-red-600" : "bg-[#f0fae1] text-[#365711]"
                  }`}
                >
                  <Power className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-extrabold text-[#17201c]">
                  {deactivateTarget.currentActive
                    ? `Deactivate ${deactivateTarget.type === "VENUE" ? "Venue" : "Court"}`
                    : `Activate ${deactivateTarget.type === "VENUE" ? "Venue" : "Court"}`}
                </h3>
              </div>
              <button
                onClick={() => setDeactivateTarget(null)}
                className="rounded-full p-1 text-[#7c867f] hover:bg-[#f4f6f2] hover:text-[#17201c]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="rounded-2xl bg-[#f8faf6] border border-[#edf1eb] p-3 text-xs">
                <p className="font-bold text-[#17201c]">{deactivateTarget.name}</p>
                <p className="text-[11px] text-[#7c867f]">
                  Resource ID: #{deactivateTarget.id} ({deactivateTarget.type})
                </p>
              </div>

              {deactivateTarget.currentActive && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-amber-800">
                  <p className="font-bold">Booking Integrity Safety Check:</p>
                  <p>
                    The platform verifies that no upcoming confirmed bookings exist for this {deactivateTarget.type.toLowerCase()}. If any active bookings exist, deactivation will be prevented to avoid silent cancellations.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#17201c] mb-1">
                  Reason for Action (logged in Audit Trail)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled facility overhaul, season closure..."
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  className="w-full rounded-2xl border border-[#e1e7df] p-2.5 text-xs text-[#17201c] focus:border-[#a8e63d] focus:outline-none"
                />
              </div>

              {actionError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{actionError}</span>
                </div>
              )}

              {actionSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-[#f0fae1] p-3 text-xs font-semibold text-[#365711] border border-[#a8e63d]">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#edf1eb]">
              <button
                onClick={() => setDeactivateTarget(null)}
                className="rounded-2xl border border-[#e1e7df] px-4 py-2 text-xs font-bold text-[#525f57] hover:bg-[#f8faf6]"
              >
                Cancel
              </button>
              <button
                onClick={executeToggleActive}
                disabled={isProcessingToggle}
                className={`rounded-2xl px-5 py-2 text-xs font-bold text-white transition disabled:opacity-40 ${
                  deactivateTarget.currentActive ? "bg-red-600 hover:bg-red-700" : "bg-[#17201c] hover:bg-[#283730]"
                }`}
              >
                {isProcessingToggle ? "Verifying..." : deactivateTarget.currentActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Venue Modal */}
      {showAddVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-[#e1e7df] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#edf1eb]">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#54801b]" />
                <h3 className="text-sm font-extrabold text-[#17201c]">Create New Venue</h3>
              </div>
              <button onClick={() => setShowAddVenue(false)} className="rounded-full p-1 text-[#7c867f]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVenue} className="py-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#17201c] mb-1">Venue Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dragon Badminton Stadium"
                  value={newVenueName}
                  onChange={(e) => setNewVenueName(e.target.value)}
                  className="w-full rounded-2xl border border-[#e1e7df] p-2.5 text-xs text-[#17201c] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#17201c] mb-1">City / District *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. District 7, HCMC"
                    value={newVenueLocation}
                    onChange={(e) => setNewVenueLocation(e.target.value)}
                    className="w-full rounded-2xl border border-[#e1e7df] p-2.5 text-xs text-[#17201c] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#17201c] mb-1">Detailed Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 100 Nguyen Thi Thap"
                    value={newVenueAddress}
                    onChange={(e) => setNewVenueAddress(e.target.value)}
                    className="w-full rounded-2xl border border-[#e1e7df] p-2.5 text-xs text-[#17201c] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#17201c] mb-1">Open Time</label>
                  <input
                    type="time"
                    value={newVenueOpen}
                    onChange={(e) => setNewVenueOpen(e.target.value)}
                    className="w-full rounded-2xl border border-[#e1e7df] p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#17201c] mb-1">Close Time</label>
                  <input
                    type="time"
                    value={newVenueClose}
                    onChange={(e) => setNewVenueClose(e.target.value)}
                    className="w-full rounded-2xl border border-[#e1e7df] p-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#17201c] mb-1">Initial Courts</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={newVenueCourtsCount}
                    onChange={(e) => setNewVenueCourtsCount(Number(e.target.value))}
                    className="w-full rounded-2xl border border-[#e1e7df] p-2.5 text-xs text-[#17201c]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#17201c] mb-1">Rate (VND/hour)</label>
                  <input
                    type="number"
                    step="10000"
                    value={newVenueCourtPrice}
                    onChange={(e) => setNewVenueCourtPrice(Number(e.target.value))}
                    className="w-full rounded-2xl border border-[#e1e7df] p-2.5 text-xs text-[#17201c]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#edf1eb]">
                <button
                  type="button"
                  onClick={() => setShowAddVenue(false)}
                  className="rounded-2xl border border-[#e1e7df] px-4 py-2 text-xs font-bold text-[#525f57]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVenue}
                  className="rounded-2xl bg-[#17201c] px-5 py-2 text-xs font-bold text-white hover:bg-[#283730]"
                >
                  {isSubmittingVenue ? "Creating..." : "Create Venue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Court Modal */}
      {courtModalVenueId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-[#e1e7df] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#edf1eb]">
              <h3 className="text-sm font-extrabold text-[#17201c]">Add Court to Venue</h3>
              <button onClick={() => setCourtModalVenueId(null)} className="rounded-full p-1 text-[#7c867f]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCourt} className="py-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#17201c] mb-1">Court Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Court 5 (VIP Glass Back)"
                  value={newCourtName}
                  onChange={(e) => setNewCourtName(e.target.value)}
                  className="w-full rounded-2xl border border-[#e1e7df] p-2.5 text-xs text-[#17201c] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17201c] mb-1">Surface Type</label>
                <input
                  type="text"
                  value={newCourtSurface}
                  onChange={(e) => setNewCourtSurface(e.target.value)}
                  className="w-full rounded-2xl border border-[#e1e7df] p-2.5 text-xs text-[#17201c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17201c] mb-1">Hourly Price (VND)</label>
                <input
                  type="number"
                  step="10000"
                  required
                  value={newCourtPrice}
                  onChange={(e) => setNewCourtPrice(Number(e.target.value))}
                  className="w-full rounded-2xl border border-[#e1e7df] p-2.5 text-xs text-[#17201c]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#edf1eb]">
                <button
                  type="button"
                  onClick={() => setCourtModalVenueId(null)}
                  className="rounded-2xl border border-[#e1e7df] px-4 py-2 text-xs font-bold text-[#525f57]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCourt}
                  className="rounded-2xl bg-[#17201c] px-5 py-2 text-xs font-bold text-white hover:bg-[#283730]"
                >
                  {isSubmittingCourt ? "Adding..." : "Add Court"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
