"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  CreditCard,
  User,
  ShieldAlert,
} from "lucide-react";

function formatVND(value: number) {
  return `${value.toLocaleString("en-US")} ₫`;
}

export function AdminBookingsSection() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("");

  // Cancel Modal State
  const [cancelModalBooking, setCancelModalBooking] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Detail Modal State
  const [detailBooking, setDetailBooking] = useState<any | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (search.trim()) params.set("search", search.trim());
      if (status !== "ALL") params.set("status", status);
      if (paymentStatus !== "ALL") params.set("paymentStatus", paymentStatus);
      if (selectedDate) params.set("date", selectedDate);

      const res = await fetch(`/api/admin/bookings?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load bookings.");
      }
      setBookings(json.data.bookings);
      setTotalCount(json.data.totalCount);
      setTotalPages(json.data.totalPages);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error fetching bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [page, status, paymentStatus, selectedDate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBookings();
  };

  const handleAdminCancel = async () => {
    if (!cancelModalBooking) return;
    if (!cancelReason || cancelReason.trim().length < 3) {
      setCancelFeedback({
        type: "error",
        message: "A cancellation reason (minimum 3 characters) is required.",
      });
      return;
    }

    try {
      setIsSubmittingCancel(true);
      setCancelFeedback(null);

      const res = await fetch(`/api/admin/bookings/${cancelModalBooking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to cancel booking.");
      }

      setCancelFeedback({
        type: "success",
        message: `Booking #${cancelModalBooking.bookingCode} successfully cancelled.`,
      });

      setBookings((prev) =>
        prev.map((b) =>
          b.id === cancelModalBooking.id
            ? { ...b, status: "CANCELLED", cancellationReason: cancelReason.trim() }
            : b
        )
      );

      setTimeout(() => {
        setCancelModalBooking(null);
      }, 1500);
    } catch (err: any) {
      setCancelFeedback({ type: "error", message: err.message || "Cancellation failed." });
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-[#e1e7df] bg-white p-5 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7c867f]" />
            <input
              type="text"
              placeholder="Search by booking code, customer, or venue..."
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
          {/* Booking Status Filter */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-[#e1e7df] bg-white px-3 py-1.5 text-xs">
            <span className="text-[#7c867f] font-medium">Status:</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="font-bold text-[#17201c] bg-transparent outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-[#e1e7df] bg-white px-3 py-1.5 text-xs">
            <span className="text-[#7c867f] font-medium">Payment:</span>
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPage(1);
              }}
              className="font-bold text-[#17201c] bg-transparent outline-none cursor-pointer"
            >
              <option value="ALL">All Payments</option>
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="REFUNDED">REFUNDED</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          {/* Date Picker */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setPage(1);
            }}
            className="rounded-2xl border border-[#e1e7df] px-3 py-1.5 text-xs text-[#17201c] bg-white"
          />

          {selectedDate && (
            <button
              onClick={() => setSelectedDate("")}
              className="rounded-full p-1 text-[#7c867f] hover:bg-[#f4f6f2]"
              title="Clear date filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            onClick={() => {
              setPage(1);
              fetchBookings();
            }}
            disabled={loading}
            className="flex items-center gap-1 rounded-2xl border border-[#e1e7df] px-3 py-1.5 text-xs font-bold text-[#525f57] hover:bg-[#f8faf6]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Bookings Table */}
      <div className="overflow-hidden rounded-3xl border border-[#e1e7df] bg-white shadow-sm">
        <div className="border-b border-[#edf1eb] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[#17201c]">Court Bookings</h2>
            <p className="text-[11px] text-[#7c867f]">{totalCount} total bookings recorded</p>
          </div>
          <span className="text-xs font-bold text-[#525f57]">
            Page {page} of {totalPages}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#edf1eb] bg-[#fbfcf9] text-[11px] font-extrabold text-[#7c867f]">
                <th className="px-6 py-3">Code & Venue</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Slot & Date</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Payment</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1eb]">
              {loading && bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#7c867f]">
                    Loading booking records...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#7c867f]">
                    No bookings found matching filters.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => {
                  const isCancelled = b.status === "CANCELLED";
                  const isCompleted = b.status === "COMPLETED";

                  return (
                    <tr key={b.id} className="hover:bg-[#fbfcf9] transition">
                      <td className="px-6 py-3.5">
                        <span className="font-mono font-bold text-[#17201c]">{b.bookingCode}</span>
                        <div className="text-[11px] font-semibold text-[#525f57]">
                          {b.court?.venue?.name}
                        </div>
                        <div className="text-[10px] text-[#7c867f]">{b.court?.name}</div>
                      </td>

                      <td className="px-6 py-3.5">
                        <div className="font-bold text-[#17201c]">
                          {b.customerName || b.user?.name}
                        </div>
                        <div className="text-[11px] text-[#7c867f]">
                          {b.customerEmail || b.user?.email}
                        </div>
                        {(b.customerPhone || b.user?.phone) && (
                          <div className="text-[10px] text-[#525f57]">
                            {b.customerPhone || b.user?.phone}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-3.5">
                        <div className="font-bold text-[#17201c]">
                          {new Date(b.bookingDate).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-[#525f57]">
                          {b.startTime} - {b.endTime || `${b.duration}h`}
                        </div>
                      </td>

                      <td className="px-6 py-3.5">
                        <span className="font-extrabold text-xs text-[#17201c]">
                          {formatVND(b.totalPrice)}
                        </span>
                      </td>

                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                            b.status === "CONFIRMED"
                              ? "bg-[#f0fae1] text-[#365711] border border-[#a8e63d]/50"
                              : b.status === "COMPLETED"
                              ? "bg-[#f4f6f2] text-[#17201c]"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {b.status}
                        </span>
                        {isCancelled && b.cancellationReason && (
                          <p className="mt-1 text-[10px] text-red-600 line-clamp-1 italic">
                            &quot;{b.cancellationReason}&quot;
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            b.paymentStatus === "PAID"
                              ? "bg-[#17201c] text-[#a8e63d]"
                              : b.paymentStatus === "REFUNDED"
                              ? "bg-purple-50 text-purple-700"
                              : b.paymentStatus === "FAILED"
                              ? "bg-red-50 text-red-600"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {b.paymentStatus}
                        </span>
                        {b.payments && b.payments.length > 0 && b.payments[0].transactionRef && (
                          <div className="text-[9px] text-[#7c867f] truncate max-w-[100px]">
                            Ref: {b.payments[0].transactionRef}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => setDetailBooking(b)}
                          className="text-[11px] font-bold text-[#54801b] hover:underline"
                        >
                          View Details
                        </button>
                        {!isCancelled && !isCompleted && (
                          <button
                            onClick={() => {
                              setCancelModalBooking(b);
                              setCancelReason("");
                              setCancelFeedback(null);
                            }}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-600 hover:text-white transition"
                          >
                            <XCircle className="h-3 w-3" />
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="border-t border-[#edf1eb] px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-[#7c867f]">
            Showing {bookings.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
            {Math.min(page * limit, totalCount)} of {totalCount} bookings
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-xl border border-[#e1e7df] px-3 py-1.5 text-xs font-bold text-[#525f57] disabled:opacity-40 hover:bg-[#f8faf6]"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-xs font-bold text-[#17201c] px-2">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-xl border border-[#e1e7df] px-3 py-1.5 text-xs font-bold text-[#525f57] disabled:opacity-40 hover:bg-[#f8faf6]"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Admin Cancellation Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-[#e1e7df] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#edf1eb]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <XCircle className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-extrabold text-[#17201c]">Administrative Cancellation</h3>
              </div>
              <button
                onClick={() => setCancelModalBooking(null)}
                className="rounded-full p-1 text-[#7c867f] hover:bg-[#f4f6f2]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="rounded-2xl bg-[#f8faf6] border border-[#edf1eb] p-3 text-xs">
                <p className="font-bold text-[#17201c]">
                  Booking #{cancelModalBooking.bookingCode}
                </p>
                <p className="text-[11px] text-[#7c867f]">
                  Venue: {cancelModalBooking.court?.venue?.name} • Court: {cancelModalBooking.court?.name}
                </p>
                <p className="text-[10px] text-[#525f57] mt-1">
                  Customer: {cancelModalBooking.customerName || cancelModalBooking.user?.name} (
                  {cancelModalBooking.customerEmail || cancelModalBooking.user?.email})
                </p>
                <p className="text-[10px] text-[#525f57]">
                  Date: {new Date(cancelModalBooking.bookingDate).toLocaleDateString()} (
                  {cancelModalBooking.startTime} - {cancelModalBooking.endTime})
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17201c] mb-1">
                  Administrative Cancellation Reason *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Explain why this reservation is being cancelled (required for audit log and customer notification)..."
                  rows={3}
                  className="w-full rounded-2xl border border-[#e1e7df] p-3 text-xs text-[#17201c] placeholder:text-[#7c867f] focus:border-[#a8e63d] focus:outline-none"
                />
                <span className="text-[10px] text-[#7c867f]">Minimum 3 characters required.</span>
              </div>

              {cancelFeedback && (
                <div
                  className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
                    cancelFeedback.type === "success"
                      ? "bg-[#f0fae1] text-[#365711] border border-[#a8e63d]"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {cancelFeedback.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{cancelFeedback.message}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#edf1eb]">
              <button
                onClick={() => setCancelModalBooking(null)}
                className="rounded-2xl border border-[#e1e7df] px-4 py-2 text-xs font-bold text-[#525f57] hover:bg-[#f8faf6]"
              >
                Dismiss
              </button>
              <button
                onClick={handleAdminCancel}
                disabled={isSubmittingCancel || cancelReason.trim().length < 3}
                className="rounded-2xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-40"
              >
                {isSubmittingCancel ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      {detailBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-[#e1e7df] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#edf1eb]">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-[#54801b]" />
                <h3 className="text-sm font-extrabold text-[#17201c]">
                  Booking Details: #{detailBooking.bookingCode}
                </h3>
              </div>
              <button onClick={() => setDetailBooking(null)} className="rounded-full p-1 text-[#7c867f]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-[#f8faf6] p-4 rounded-2xl border border-[#edf1eb]">
                <div>
                  <span className="text-[10px] text-[#7c867f]">Venue</span>
                  <p className="font-bold text-[#17201c]">{detailBooking.court?.venue?.name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#7c867f]">Court</span>
                  <p className="font-bold text-[#17201c]">{detailBooking.court?.name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#7c867f]">Date & Time</span>
                  <p className="font-bold text-[#17201c]">
                    {new Date(detailBooking.bookingDate).toLocaleDateString()} (
                    {detailBooking.startTime} - {detailBooking.endTime})
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#7c867f]">Total Amount</span>
                  <p className="font-bold text-[#17201c]">{formatVND(detailBooking.totalPrice)}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#17201c] mb-2 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-[#54801b]" />
                  Payment Records ({detailBooking.payments?.length || 0})
                </h4>
                {detailBooking.payments && detailBooking.payments.length > 0 ? (
                  <div className="space-y-2">
                    {detailBooking.payments.map((p: any) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-[#edf1eb] bg-[#fbfcf9]"
                      >
                        <div>
                          <p className="font-bold text-[#17201c]">
                            {formatVND(p.amount)} via {p.paymentMethod}
                          </p>
                          <p className="text-[10px] text-[#7c867f]">
                            Ref: {p.transactionRef || "N/A"} • Paid:{" "}
                            {p.paidAt ? new Date(p.paidAt).toLocaleString() : "Not confirmed"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            p.status === "PAID"
                              ? "bg-[#17201c] text-[#a8e63d]"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#7c867f] italic">No payment transactions recorded.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#edf1eb]">
              <button
                onClick={() => setDetailBooking(null)}
                className="rounded-2xl bg-[#17201c] px-4 py-2 text-xs font-bold text-white hover:bg-[#283730]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
