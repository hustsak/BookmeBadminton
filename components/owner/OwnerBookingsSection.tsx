"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  User,
  CreditCard,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  RefreshCw,
  X,
  ShieldCheck,
  Check,
} from "lucide-react";
import { DateFilterPreset } from "@/lib/owner-analytics";

interface OwnerBookingsSectionProps {
  ownerId: number;
  venueId?: number;
  preset: DateFilterPreset;
  startDate?: string;
  endDate?: string;
  courts?: any[];
  currency?: string;
}

function formatCurrency(amount: number, currency: string = "VND"): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${amount.toLocaleString("en-US")}₫`;
}

export function OwnerBookingsSection({
  ownerId,
  venueId,
  preset,
  startDate,
  endDate,
  courts = [],
  currency = "VND",
}: OwnerBookingsSectionProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourtId, setSelectedCourtId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("bookingDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals
  const [detailBooking, setDetailBooking] = useState<any | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const [paymentModalBooking, setPaymentModalBooking] = useState<any | null>(null);
  const [manualPayAmount, setManualPayAmount] = useState<number>(0);
  const [manualPayMethod, setManualPayMethod] = useState("MANUAL_CASH");
  const [manualPayReference, setManualPayReference] = useState("");
  const [manualPayNotes, setManualPayNotes] = useState("Received cash at counter");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  async function loadBookings() {
    setIsLoading(true);
    try {
      let url = `/api/owner/bookings?ownerId=${ownerId}&page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
      if (venueId) url += `&venueId=${venueId}`;
      if (selectedCourtId !== "ALL") url += `&courtId=${selectedCourtId}`;
      if (selectedStatus !== "ALL") url += `&status=${selectedStatus}`;
      if (selectedPaymentStatus !== "ALL") url += `&paymentStatus=${selectedPaymentStatus}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      if (preset === "custom" && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to load owner bookings:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, [
    ownerId,
    venueId,
    page,
    limit,
    selectedCourtId,
    selectedStatus,
    selectedPaymentStatus,
    sortBy,
    sortOrder,
    preset,
    startDate,
    endDate,
  ]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadBookings();
  }

  // Handle Owner Cancel Booking
  async function handleConfirmCancel() {
    if (!cancelModalBooking) return;
    if (!cancelReason.trim() || cancelReason.trim().length < 3) {
      alert("Please provide a valid cancellation reason (minimum 3 characters).");
      return;
    }

    setIsSubmittingCancel(true);
    try {
      const res = await fetch(`/api/owner/bookings/${cancelModalBooking.id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(ownerId),
        },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setCancelModalBooking(null);
        setCancelReason("");
        if (detailBooking && detailBooking.id === cancelModalBooking.id) {
          setDetailBooking(null);
        }
        loadBookings();
      } else {
        alert(data.message || "Failed to cancel booking.");
      }
    } catch (err) {
      alert("Error occurred while cancelling booking.");
    } finally {
      setIsSubmittingCancel(false);
    }
  }

  // Handle Manual Payment Confirmation Flow
  async function handleConfirmPayment() {
    if (!paymentModalBooking) return;
    if (manualPayAmount <= 0) {
      alert("Payment amount must be greater than zero.");
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await fetch(`/api/owner/bookings/${paymentModalBooking.id}/confirm-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(ownerId),
        },
        body: JSON.stringify({
          amount: manualPayAmount,
          method: manualPayMethod,
          reference: manualPayReference,
          notes: manualPayNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentModalBooking(null);
        if (detailBooking && detailBooking.id === paymentModalBooking.id) {
          setDetailBooking(data.booking);
        }
        loadBookings();
      } else {
        alert(data.message || "Failed to confirm payment.");
      }
    } catch (err) {
      alert("Error occurred while confirming payment.");
    } finally {
      setIsSubmittingPayment(false);
    }
  }

  // Open CSV download
  function handleDownloadCsv() {
    let url = `/api/owner/reports/bookings?ownerId=${ownerId}&preset=${preset}`;
    if (venueId) url += `&venueId=${venueId}`;
    if (selectedCourtId !== "ALL") url += `&courtId=${selectedCourtId}`;
    if (selectedStatus !== "ALL") url += `&status=${selectedStatus}`;
    if (selectedPaymentStatus !== "ALL") url += `&paymentStatus=${selectedPaymentStatus}`;
    if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;
    if (preset === "custom" && startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-4">
      {/* 1. CONTROLS BAR: SEARCH & FILTERS */}
      <div className="rounded-2xl border border-[#e1e7df] bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-3 text-[#7a867e]" />
            <input
              type="text"
              placeholder="Search by code (#BM-...), customer name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[#d2d9cf] bg-[#f9faf7] pl-9 pr-20 py-2 text-xs font-semibold placeholder:text-[#88948c] focus:border-[#17201c] focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 rounded-lg bg-[#17201c] px-3 py-1 text-[11px] font-bold text-[#a8e63d] hover:bg-[#25322c]"
            >
              Search
            </button>
          </form>

          {/* Export CSV Button */}
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 rounded-xl border border-[#d2d9cf] bg-white px-3.5 py-2 text-xs font-bold text-[#17201c] shadow-2xs hover:bg-[#f5f8f3] shrink-0"
          >
            <Download size={14} className="text-[#3c6b12]" />
            Export CSV
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#f0f3ed] text-xs">
          <span className="font-bold text-[#627065] flex items-center gap-1">
            <Filter size={12} /> Filter:
          </span>

          {/* Court Filter */}
          <select
            value={selectedCourtId}
            onChange={(e) => {
              setSelectedCourtId(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-[#d2d9cf] bg-[#f9faf7] px-2.5 py-1 text-xs font-semibold focus:outline-none"
          >
            <option value="ALL">All Courts</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Booking Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-[#d2d9cf] bg-[#f9faf7] px-2.5 py-1 text-xs font-semibold focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PENDING">PENDING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={selectedPaymentStatus}
            onChange={(e) => {
              setSelectedPaymentStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-[#d2d9cf] bg-[#f9faf7] px-2.5 py-1 text-xs font-semibold focus:outline-none"
          >
            <option value="ALL">All Payments</option>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>

          {/* Sorting Field */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-[#d2d9cf] bg-[#f9faf7] px-2.5 py-1 text-xs font-semibold focus:outline-none ml-auto"
          >
            <option value="bookingDate">Date</option>
            <option value="createdAt">Created Time</option>
            <option value="totalPrice">Total Price</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="rounded-lg border border-[#d2d9cf] bg-[#f9faf7] px-2 py-1 text-xs font-bold hover:bg-[#e6eae2]"
            title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
          >
            <ArrowUpDown size={12} />
          </button>
        </div>
      </div>

      {/* 2. BOOKINGS DATA TABLE */}
      <div className="rounded-2xl border border-[#e1e7df] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f9faf7] border-b border-[#e1e7df] text-[11px] font-black uppercase text-[#717c74]">
              <tr>
                <th className="py-3 px-4">Booking Code</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Venue & Court</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Payment</th>
                <th className="py-3 px-4 text-right">Total Price</th>
                <th className="py-3 px-4 text-right">Collected</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f3ed]">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-[#717c74]">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw size={14} className="animate-spin" /> Loading bookings...
                    </div>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-[#717c74]">
                    No bookings found matching current filters.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => {
                  const dateStr = new Date(b.bookingDate).toISOString().slice(0, 10);
                  const isPaid = b.paymentStatus === "PAID";
                  const isCancelled = b.status === "CANCELLED";

                  return (
                    <tr key={b.id} className="hover:bg-[#fbfcf9] transition">
                      {/* Code */}
                      <td className="py-3.5 px-4 font-black text-[#17201c] whitespace-nowrap">
                        {b.bookingCode || `#${b.id}`}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#17201c]">{b.customerDisplayName}</div>
                        <div className="text-[11px] text-[#717c74]">
                          {b.customerDisplayPhone || b.customerDisplayEmail || "N/A"}
                        </div>
                      </td>

                      {/* Venue & Court */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#17201c]">{b.court.name}</div>
                        <div className="text-[11px] text-[#717c74]">{b.court.venue.name}</div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-[#17201c]">{dateStr}</div>
                        <div className="text-[11px] text-[#717c74]">
                          {b.startTime} - {b.endTime || "+2h"}
                        </div>
                      </td>

                      {/* Booking Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                            b.status === "CONFIRMED"
                              ? "bg-[#eaf7d5] text-[#2d590e]"
                              : b.status === "CANCELLED"
                              ? "bg-[#fde8e8] text-[#9b1c1c]"
                              : b.status === "COMPLETED"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                            b.paymentStatus === "PAID"
                              ? "bg-[#eaf7d5] text-[#2d590e]"
                              : b.paymentStatus === "REFUNDED"
                              ? "bg-purple-50 text-purple-700"
                              : b.paymentStatus === "FAILED"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {b.paymentStatus}
                        </span>
                      </td>

                      {/* Total Price */}
                      <td className="py-3.5 px-4 text-right font-black text-[#17201c] whitespace-nowrap">
                        {formatCurrency(b.totalPrice, currency)}
                      </td>

                      {/* Collected Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className={`font-black ${b.collectedAmount > 0 ? "text-[#2e5910]" : "text-gray-400"}`}>
                          {formatCurrency(b.collectedAmount, currency)}
                        </span>
                        {b.outstandingAmount > 0 && !isCancelled && (
                          <div className="text-[10px] text-amber-700 font-semibold">
                            Due: {formatCurrency(b.outstandingAmount, currency)}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setDetailBooking(b)}
                            className="rounded-lg bg-[#f2f4ef] p-1.5 text-[#55635a] hover:bg-[#e2e7df] hover:text-[#17201c]"
                            title="View Booking Detail"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Quick Auditable Payment button if outstanding balance */}
                          {!isPaid && !isCancelled && (
                            <button
                              onClick={() => {
                                setPaymentModalBooking(b);
                                setManualPayAmount(b.outstandingAmount || b.totalPrice);
                                setManualPayReference("");
                              }}
                              className="rounded-lg bg-[#eaf7d5] p-1.5 text-[#2e5910] hover:bg-[#d8f0b4]"
                              title="Record / Confirm Payment"
                            >
                              <DollarSign size={14} />
                            </button>
                          )}

                          {/* Quick Cancel button */}
                          {!isCancelled && b.status !== "COMPLETED" && (
                            <button
                              onClick={() => {
                                setCancelModalBooking(b);
                                setCancelReason("");
                              }}
                              className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                              title="Cancel Booking with Reason"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-[#f9faf7] border-t border-[#e1e7df] gap-2 text-xs text-[#717c74]">
          <div>
            Showing <span className="font-bold text-[#17201c]">{bookings.length}</span> of{" "}
            <span className="font-bold text-[#17201c]">{totalCount}</span> total bookings (Page {page} of{" "}
            {totalPages})
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-[#d2d9cf] bg-white px-2.5 py-1 font-bold text-[#17201c] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f2f5ef]"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-bold text-[#17201c] px-2">{page}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-[#d2d9cf] bg-white px-2.5 py-1 font-bold text-[#17201c] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f2f5ef]"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. BOOKING DETAIL MODAL */}
      {detailBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#e1e7df] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e1e7df]">
              <div>
                <span className="text-[11px] font-black text-[#a8e63d] bg-[#17201c] px-2 py-0.5 rounded">
                  BOOKING DETAILS
                </span>
                <h3 className="text-lg font-black text-[#17201c] mt-1">
                  {detailBooking.bookingCode || `#${detailBooking.id}`}
                </h3>
              </div>
              <button
                onClick={() => setDetailBooking(null)}
                className="rounded-full p-1 text-gray-400 hover:text-black hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Customer info */}
              <div className="rounded-xl bg-[#f9faf7] p-3 border border-[#e1e7df]">
                <span className="font-bold text-[#55635a] uppercase text-[10px]">Customer Details</span>
                <div className="mt-1 font-bold text-sm text-[#17201c]">{detailBooking.customerDisplayName}</div>
                <div className="text-[#627065]">{detailBooking.customerDisplayEmail || "No email"}</div>
                <div className="text-[#627065]">{detailBooking.customerDisplayPhone || "No phone"}</div>
              </div>

              {/* Court & Slot info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#f9faf7] p-3 border border-[#e1e7df]">
                  <span className="font-bold text-[#55635a] uppercase text-[10px]">Court & Venue</span>
                  <div className="mt-1 font-bold text-[#17201c]">{detailBooking.court.name}</div>
                  <div className="text-[#717c74]">{detailBooking.court.venue.name}</div>
                </div>

                <div className="rounded-xl bg-[#f9faf7] p-3 border border-[#e1e7df]">
                  <span className="font-bold text-[#55635a] uppercase text-[10px]">Date & Time</span>
                  <div className="mt-1 font-bold text-[#17201c]">
                    {new Date(detailBooking.bookingDate).toISOString().slice(0, 10)}
                  </div>
                  <div className="text-[#717c74]">
                    {detailBooking.startTime} - {detailBooking.endTime} ({detailBooking.duration}h)
                  </div>
                </div>
              </div>

              {/* Financial Status */}
              <div className="rounded-xl bg-[#f9faf7] p-3 border border-[#e1e7df]">
                <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[#e6eae2]">
                  <span className="text-[#55635a]">Total Booking Price:</span>
                  <span className="font-black text-[#17201c]">
                    {formatCurrency(detailBooking.totalPrice, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-[#e6eae2]">
                  <span className="text-[#55635a]">Collected Paid Revenue:</span>
                  <span className="font-black text-[#2e5910]">
                    {formatCurrency(detailBooking.collectedAmount, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1.5 font-bold">
                  <span className="text-amber-800">Outstanding Balance:</span>
                  <span className="text-amber-900 font-black">
                    {formatCurrency(detailBooking.outstandingAmount, currency)}
                  </span>
                </div>
              </div>

              {/* Cancellation Reason if cancelled */}
              {detailBooking.cancellationReason && (
                <div className="rounded-xl bg-red-50 p-3 border border-red-200 text-red-800">
                  <span className="font-bold uppercase text-[10px] block">Cancellation Reason</span>
                  <p className="mt-0.5 text-xs">{detailBooking.cancellationReason}</p>
                </div>
              )}

              {/* Payments Audit Ledger */}
              <div>
                <span className="font-black uppercase text-[10px] text-[#55635a] block mb-1.5">
                  Payments Audit History ({detailBooking.payments?.length || 0})
                </span>
                {(!detailBooking.payments || detailBooking.payments.length === 0) ? (
                  <p className="text-[#717c74] text-xs py-2 bg-gray-50 rounded-lg text-center">
                    No payment attempts recorded.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {detailBooking.payments.map((p: any) => (
                      <div
                        key={p.id}
                        className="rounded-lg border border-[#e1e7df] p-2.5 bg-white text-[11px] flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-[#17201c]">
                            {p.paymentMethod} - {formatCurrency(p.amount, currency)}
                          </div>
                          <div className="text-[10px] text-[#717c74]">
                            Tx: {p.transactionId} | {new Date(p.createdAt).toLocaleString()}
                          </div>
                          {p.notes && <div className="text-[10px] text-gray-500 italic mt-0.5">{p.notes}</div>}
                        </div>
                        <span
                          className={`rounded px-2 py-0.5 font-black uppercase text-[9px] ${
                            p.status === "PAID"
                              ? "bg-green-100 text-green-800"
                              : p.status === "REFUNDED"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-[#e1e7df]">
              {detailBooking.status !== "CANCELLED" && detailBooking.status !== "COMPLETED" && (
                <button
                  type="button"
                  onClick={() => {
                    setCancelModalBooking(detailBooking);
                    setCancelReason("");
                  }}
                  className="rounded-xl border border-red-300 bg-white px-3.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                >
                  Cancel Booking
                </button>
              )}

              {detailBooking.paymentStatus !== "PAID" && detailBooking.status !== "CANCELLED" && (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentModalBooking(detailBooking);
                    setManualPayAmount(detailBooking.outstandingAmount || detailBooking.totalPrice);
                    setManualPayReference("");
                  }}
                  className="rounded-xl bg-[#17201c] px-4 py-1.5 text-xs font-bold text-[#a8e63d] hover:bg-[#25322c]"
                >
                  Record Payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. CANCELLATION REASON MODAL */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-[#e1e7df]">
            <h3 className="text-sm font-black text-[#17201c]">Cancel Booking</h3>
            <p className="text-xs text-[#717c74] mt-0.5">
              Confirm cancellation for booking #{cancelModalBooking.bookingCode || cancelModalBooking.id}.
            </p>

            <div className="mt-3">
              <label className="block text-xs font-bold text-[#55635a] mb-1">
                Required Cancellation Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Court emergency maintenance, customer requested phone cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-xl border border-[#d2d9cf] p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={() => setCancelModalBooking(null)}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#627065] hover:bg-gray-100"
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={handleConfirmCancel}
                className="rounded-xl bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmittingCancel ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. AUDITABLE PAYMENT CONFIRMATION MODAL */}
      {paymentModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-[#e1e7df]">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-[#eaf7d5] p-2 text-[#2e5910]">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#17201c]">Audited Payment Confirmation</h3>
                <p className="text-xs text-[#717c74]">
                  Record verified payment for #{paymentModalBooking.bookingCode || paymentModalBooking.id}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#55635a] mb-1">Payment Method</label>
                <select
                  value={manualPayMethod}
                  onChange={(e) => setManualPayMethod(e.target.value)}
                  className="w-full rounded-xl border border-[#d2d9cf] p-2 text-xs font-semibold focus:outline-none"
                >
                  <option value="MANUAL_CASH">Cash at Counter</option>
                  <option value="MANUAL_BANK_TRANSFER">Direct Bank Transfer</option>
                  <option value="VIETQR_VERIFIED">VietQR / Bank App Verified</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#55635a] mb-1">Amount to Collect ({currency})</label>
                <input
                  type="number"
                  value={manualPayAmount}
                  onChange={(e) => setManualPayAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#d2d9cf] p-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#17201c]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#55635a] mb-1">Transaction Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Counter receipt #, bank transfer trace..."
                  value={manualPayReference}
                  onChange={(e) => setManualPayReference(e.target.value)}
                  className="w-full rounded-xl border border-[#d2d9cf] p-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#55635a] mb-1">Audit Notes</label>
                <input
                  type="text"
                  placeholder="Auditable note regarding this payment..."
                  value={manualPayNotes}
                  onChange={(e) => setManualPayNotes(e.target.value)}
                  className="w-full rounded-xl border border-[#d2d9cf] p-2 text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-[#f0f3ed]">
              <button
                type="button"
                disabled={isSubmittingPayment}
                onClick={() => setPaymentModalBooking(null)}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#627065] hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingPayment}
                onClick={handleConfirmPayment}
                className="rounded-xl bg-[#17201c] px-4 py-1.5 text-xs font-bold text-[#a8e63d] hover:bg-black disabled:opacity-50"
              >
                {isSubmittingPayment ? "Recording..." : "Confirm & Save to Ledger"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
