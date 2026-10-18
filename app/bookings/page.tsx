"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Navbar } from "@/components/Navbar";
import { LoginModal } from "@/components/LoginModal";
import { PaymentQRModal } from "@/components/PaymentQRModal";
import { useApp, Booking } from "@/context/AppContext";
import {
  Calendar,
  Clock,
  MapPin,
  QrCode,
  XCircle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Search,
  ChevronRight,
  ShieldCheck,
  X,
  Printer,
  CreditCard,
  RotateCcw,
  Sparkles,
} from "lucide-react";

function formatPrice(value: number) {
  // If price is smaller than 1000, it was normalized in older mock
  const finalVal = value < 1000 ? value * 20000 : value;
  return `${finalVal.toLocaleString("en-US")}₫`;
}

export default function BookingsPage() {
  const { user, bookings, cancelBooking, refreshBookings, openLoginModal } = useApp();
  const [filterTab, setFilterTab] = useState<"ALL" | "CONFIRMED" | "COMPLETED" | "CANCELLED">("ALL");
  const [selectedPass, setSelectedPass] = useState<Booking | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [payModalBooking, setPayModalBooking] = useState<Booking | null>(null);
  const [isPassEnlarged, setIsPassEnlarged] = useState(false);

  // Sync latest bookings from database on mount
  useEffect(() => {
    refreshBookings();
  }, []);

  // Keyboard accessibility: Escape to close active modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isPassEnlarged) {
          setIsPassEnlarged(false);
        } else if (selectedPass) {
          setSelectedPass(null);
        } else if (cancelModalBooking) {
          setCancelModalBooking(null);
        } else if (payModalBooking) {
          setPayModalBooking(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPassEnlarged, selectedPass, cancelModalBooking, payModalBooking]);

  const filteredBookings = bookings.filter((b) => {
    if (filterTab === "ALL") return true;
    return b.status === filterTab;
  });

  async function handleConfirmCancel() {
    if (!cancelModalBooking) return;
    setIsCancelling(true);
    try {
      await cancelBooking(cancelModalBooking.id);
      await refreshBookings();
      setCancelModalBooking(null);
    } catch (err) {
      console.error("Cancellation failed:", err);
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-[#17201c] pb-36 sm:pb-24 w-full max-w-full overflow-x-hidden">
      <Navbar />
      <LoginModal />

      {/* Page Header */}
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:pt-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#87918a]">
              <Link href="/" className="hover:text-[#17201c]">Home</Link>
              <span>/</span>
              <span className="font-semibold text-[#17201c]">My Bookings</span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl text-[#17201c]">
              My Court Bookings<span className="text-[#a8e63d]">.</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#7c867f]">
              Manage your upcoming badminton matches, check-in QR passes, and release slots if plans change.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-[#a8e63d] px-5 py-2.5 text-xs font-bold text-[#17201c] shadow-sm transition hover:bg-[#b8ef59] active:scale-95"
            >
              Book New Court
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-[#e1e7df] pb-3">
          <button
            onClick={() => setFilterTab("ALL")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              filterTab === "ALL"
                ? "bg-[#17201c] text-white shadow-sm"
                : "bg-white text-[#68736c] border border-[#e1e7df] hover:text-[#17201c]"
            }`}
          >
            All Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setFilterTab("CONFIRMED")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              filterTab === "CONFIRMED"
                ? "bg-[#a8e63d] text-[#17201c] shadow-sm"
                : "bg-white text-[#68736c] border border-[#e1e7df] hover:text-[#17201c]"
            }`}
          >
            Upcoming ({bookings.filter((b) => b.status === "CONFIRMED").length})
          </button>
          <button
            onClick={() => setFilterTab("COMPLETED")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              filterTab === "COMPLETED"
                ? "bg-[#17201c] text-white shadow-sm"
                : "bg-white text-[#68736c] border border-[#e1e7df] hover:text-[#17201c]"
            }`}
          >
            Completed ({bookings.filter((b) => b.status === "COMPLETED").length})
          </button>
          <button
            onClick={() => setFilterTab("CANCELLED")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              filterTab === "CANCELLED"
                ? "bg-[#17201c] text-white shadow-sm"
                : "bg-white text-[#68736c] border border-[#e1e7df] hover:text-[#17201c]"
            }`}
          >
            Cancelled ({bookings.filter((b) => b.status === "CANCELLED").length})
          </button>
        </div>
      </section>

      {/* Bookings List */}
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        {filteredBookings.length > 0 ? (
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
            {filteredBookings.map((booking, index) => {
              const isUpcoming = booking.status === "CONFIRMED";
              const isPaid = booking.paymentStatus === "PAID";

              return (
                <motion.article
                  key={booking.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  className="group relative overflow-hidden rounded-[24px] border border-[#e0e6de] bg-white p-4 sm:p-5 shadow-[0_4px_20px_rgba(23,32,28,0.04)] transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start">
                    {/* Venue Image */}
                    <img
                      src={booking.venueImage || "/court_image/c1.jpeg"}
                      alt={booking.venueName}
                      className="h-28 w-full rounded-2xl object-cover sm:w-28 shrink-0 bg-black/10"
                    />

                    {/* Booking Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] font-mono font-bold tracking-wider text-[#828d85] uppercase">
                          REF: {booking.id}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {/* Payment status badge */}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isPaid
                                ? "bg-[#eaf7d5] text-[#3c6b12]"
                                : booking.paymentStatus === "REFUNDED"
                                ? "bg-purple-50 text-purple-700"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {booking.paymentStatus || "PAID"}
                          </span>

                          {/* Booking status badge */}
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${
                              booking.status === "CONFIRMED"
                                ? "bg-[#17201c] text-[#a8e63d]"
                                : booking.status === "COMPLETED"
                                ? "bg-[#eaf3f8] text-[#2b6cb0]"
                                : "bg-[#fdf2f2] text-[#c53030]"
                            }`}
                          >
                            {booking.status === "CONFIRMED" && <CheckCircle2 className="h-3 w-3 text-[#a8e63d]" />}
                            {booking.status === "COMPLETED" && <ShieldCheck className="h-3 w-3" />}
                            {booking.status === "CANCELLED" && <XCircle className="h-3 w-3" />}
                            {booking.status}
                          </span>
                        </div>
                      </div>

                      <h3 className="mt-1 text-base font-bold text-[#17201c] truncate">{booking.venueName}</h3>
                      <p className="text-xs font-semibold text-[#78a72b]">{booking.courtName}</p>

                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-[#6e7972]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[#8a958e]" />
                          <span>{booking.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-[#8a958e]" />
                          <span>{booking.timeSlot} ({booking.duration}h)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-[#8a958e]" />
                          <span className="truncate max-w-[150px]">{booking.location}</span>
                        </div>
                      </div>

                      {/* Bottom action row */}
                      <div className="mt-3.5 flex items-center justify-between border-t border-[#edf1ea] pt-2.5">
                        <div>
                          <span className="text-[10px] text-[#8e9891]">Total Fee</span>
                          <p className="text-sm font-black text-[#17201c]">{formatPrice(booking.totalPrice)}</p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {!isPaid && isUpcoming && (
                            <button
                              onClick={() => setPayModalBooking(booking)}
                              className="rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
                            >
                              Pay Fee
                            </button>
                          )}

                          {isUpcoming && (
                            <button
                              onClick={() => setCancelModalBooking(booking)}
                              className="rounded-xl border border-[#e1e7df] px-2.5 py-1 text-xs font-bold text-[#c53030] transition hover:bg-[#fdf2f2]"
                            >
                              Cancel
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedPass(booking)}
                            className="flex items-center gap-1 rounded-xl bg-[#17201c] px-3 py-1 text-xs font-bold text-white transition hover:bg-[#2c3a32]"
                          >
                            <QrCode className="h-3 w-3 text-[#a8e63d]" />
                            QR Pass
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-[#d8e0d6] bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f0fae1] text-[#78a72b]">
              <Calendar className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#17201c]">No bookings found</h3>
            <p className="mt-1 text-xs text-[#7c867f]">
              {filterTab === "ALL"
                ? "You haven't reserved any badminton courts yet."
                : `No ${filterTab.toLowerCase()} bookings found in your history.`}
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#a8e63d] px-6 py-2.5 text-xs font-bold text-[#17201c] shadow-sm transition hover:bg-[#b8ef59]"
            >
              Explore Badminton Courts
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>

      {/* CANCELLATION CONFIRMATION MODAL */}
      <AnimatePresence>
        {cancelModalBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17201c]/60 backdrop-blur-sm select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
                <AlertCircle className="h-7 w-7" />
              </div>

              <h3 className="text-lg font-black text-[#17201c]">Cancel Court Reservation?</h3>
              <p className="text-xs text-[#738078] mt-1">
                Are you sure you want to cancel booking <strong>{cancelModalBooking.id}</strong> at{" "}
                <strong>{cancelModalBooking.venueName}</strong>?
              </p>

              <div className="my-3.5 rounded-xl bg-red-50 p-3 text-left text-xs text-red-800 leading-relaxed border border-red-100">
                <p className="font-bold">Cancellation Policy:</p>
                <p className="text-[11px] mt-0.5">
                  Cancelling will immediately release this time slot ({cancelModalBooking.timeSlot}) in the database so other badminton players can book it.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setCancelModalBooking(null)}
                  disabled={isCancelling}
                  className="flex-1 rounded-xl border border-[#d2dcd0] py-2.5 text-xs font-bold text-[#17201c] hover:bg-[#f7f8f4]"
                >
                  Keep Booking
                </button>
                <button
                  onClick={handleConfirmCancel}
                  disabled={isCancelling}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isCancelling ? "Cancelling..." : "Confirm Cancel"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR PASS MODAL */}
      <AnimatePresence>
        {selectedPass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPass(null)}
              className="absolute inset-0 bg-[#17201c]/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-[#e1e7df] bg-white p-6 shadow-2xl z-10 text-center"
            >
              <button
                onClick={() => setSelectedPass(null)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f7f3] text-[#69746c] hover:bg-[#e2e7df]"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f0fae1] px-3 py-1 text-xs font-bold text-[#4f781a]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#78a72b]" />
                Official Match Check-in Pass
              </div>

              <h3 className="mt-2 text-xl font-extrabold text-[#17201c]">{selectedPass.venueName}</h3>
              <p className="text-xs font-semibold text-[#78a72b]">{selectedPass.courtName}</p>

              {/* QR Code Graphic Box with Tap to Enlarge */}
              <div
                onClick={() => setIsPassEnlarged(!isPassEnlarged)}
                className="my-3 rounded-2xl border-2 border-dashed border-[#d8e0d6] bg-[#f8faf7] p-3.5 flex flex-col items-center justify-center cursor-pointer group"
                title="Tap to enlarge QR pass"
              >
                <div
                  className={`bg-white p-3 rounded-xl shadow-md border border-[#e1e7df] transition-all duration-200 ${
                    isPassEnlarged ? "scale-110 shadow-lg" : ""
                  }`}
                >
                  <svg className={`${isPassEnlarged ? "w-44 h-44" : "w-32 h-32"} transition-all`} viewBox="0 0 100 100" fill="none">
                    <rect x="5" y="5" width="30" height="30" fill="#17201c" rx="4" />
                    <rect x="10" y="10" width="20" height="20" fill="white" rx="2" />
                    <rect x="14" y="14" width="12" height="12" fill="#17201c" rx="1" />

                    <rect x="65" y="5" width="30" height="30" fill="#17201c" rx="4" />
                    <rect x="70" y="10" width="20" height="20" fill="white" rx="2" />
                    <rect x="74" y="14" width="12" height="12" fill="#17201c" rx="1" />

                    <rect x="5" y="65" width="30" height="30" fill="#17201c" rx="4" />
                    <rect x="10" y="70" width="20" height="20" fill="white" rx="2" />
                    <rect x="14" y="74" width="12" height="12" fill="#17201c" rx="1" />

                    <rect x="40" y="10" width="8" height="8" fill="#a8e63d" />
                    <rect x="50" y="18" width="8" height="8" fill="#17201c" />
                    <rect x="42" y="42" width="16" height="16" fill="#17201c" rx="2" />
                    <rect x="65" y="45" width="8" height="8" fill="#a8e63d" />
                    <rect x="75" y="65" width="12" height="12" fill="#17201c" />
                    <rect x="45" y="75" width="10" height="10" fill="#a8e63d" />
                    <rect x="60" y="80" width="15" height="10" fill="#17201c" />
                  </svg>
                </div>
                <span className="mt-2 font-mono text-xs font-black text-[#17201c]">
                  {selectedPass.qrCode || selectedPass.id}
                </span>
                <span className="text-[10px] text-[#78857c]">
                  {isPassEnlarged ? "Tap to minimize · Show at reception" : "Tap QR to enlarge · Present at front desk"}
                </span>
              </div>

              <div className="text-left text-xs space-y-1.5 border-t border-[#edf1ea] pt-2.5 text-[#5c6760]">
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span className="font-bold text-[#17201c]">{selectedPass.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span className="font-bold text-[#17201c]">{selectedPass.timeSlot}</span>
                </div>
                <div className="flex justify-between">
                  <span>Booking Status:</span>
                  <span className="font-bold text-[#446d17]">{selectedPass.status}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Status:</span>
                  <span className={`font-bold ${selectedPass.paymentStatus === "PAID" ? "text-[#3c6b12]" : "text-amber-700"}`}>
                    {selectedPass.paymentStatus || "PAID"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Fee:</span>
                  <span className="font-bold text-[#17201c]">{formatPrice(selectedPass.totalPrice)}</span>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#17201c] py-2.5 text-xs font-bold text-white hover:bg-[#25322c]"
              >
                <Printer className="h-3.5 w-3.5 text-[#a8e63d]" />
                Print / Save Pass
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PAY NOW MODAL */}
      {payModalBooking && (
        <PaymentQRModal
          isOpen={Boolean(payModalBooking)}
          onClose={() => setPayModalBooking(null)}
          onPaymentSuccess={() => {
            setPayModalBooking(null);
            refreshBookings();
          }}
          venueName={payModalBooking.venueName}
          courtName={payModalBooking.courtName}
          date={payModalBooking.date}
          timeSlot={payModalBooking.timeSlot}
          totalPrice={payModalBooking.totalPrice}
          bookingId={payModalBooking.dbId}
          bookingCode={payModalBooking.id}
        />
      )}
    </main>
  );
}
