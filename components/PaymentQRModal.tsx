"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Check,
  Copy,
  CheckCheck,
  ShieldCheck,
  CreditCard,
  QrCode,
  Sparkles,
  Loader2,
  Building2,
  Clock,
  ArrowRight,
  Maximize2,
  Minimize2,
  AlertCircle,
} from "lucide-react";

interface PaymentQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  venueName: string;
  courtName: string;
  date: string;
  timeSlot: string;
  totalPrice: number;
  bookingId?: number;
  bookingCode?: string;
}

export function PaymentQRModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  venueName,
  courtName,
  date,
  timeSlot,
  totalPrice,
  bookingId,
  bookingCode,
}: PaymentQRModalProps) {
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [isQREnlarged, setIsQREnlarged] = useState(false);

  const bankNumber = "8840511196";
  const bankName = "BIDV - CN Sơn Tây";
  const accountHolder = "KOY VIRAKSAK";
  const memoContent = bookingCode
    ? `BMB ${bookingCode}`
    : `BMB ${courtName.replace(/\s+/g, "")} ${date.slice(-5).replace("-", "")}`;

  const formatPriceVND = (price: number) => {
    return `${price.toLocaleString("en-US")}₫`;
  };

  // Keyboard accessibility: Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isQREnlarged) {
          setIsQREnlarged(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isQREnlarged, onClose]);

  const copyToClipboard = (text: string, type: "account" | "memo") => {
    navigator.clipboard.writeText(text);
    if (type === "account") {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } else {
      setCopiedMemo(true);
      setTimeout(() => setCopiedMemo(false), 2000);
    }
  };

  const handlePaid = async () => {
    setIsVerifying(true);
    setPaymentError("");

    try {
      if (bookingId) {
        // Call server-side payment verification
        const res = await fetch(`/api/bookings/${bookingId}/payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethod: "VIETQR",
            transactionRef: `BIDV-${Date.now().toString(36).toUpperCase()}`,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to verify payment with server.");
        }
      }

      setIsVerifying(false);
      setIsSuccess(true);

      setTimeout(() => {
        onPaymentSuccess();
      }, 900);
    } catch (err: any) {
      console.error("Payment verification failed:", err);
      setIsVerifying(false);
      setPaymentError(err.message || "Could not verify payment. Please check your bank transaction.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="relative z-10 w-full max-w-md max-h-[92vh] overflow-y-auto rounded-[32px] border border-[#e1e7df] bg-white p-3.5 sm:p-6 shadow-[0_24px_70px_rgba(23,32,28,0.28)] select-none my-auto transform-gpu will-change-transform"
          >
            {/* Top Navigation */}
            <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-[#edf1ea]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f0fae1] text-[#4f781a] shrink-0">
                  <QrCode className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 id="payment-modal-title" className="text-sm sm:text-base font-extrabold text-[#17201c] truncate">
                    Payment QR (VietQR Transfer)
                  </h3>
                  <p className="text-[10.5px] text-[#7d8881] truncate">
                    Official 24/7 banking transfer
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                aria-label="Close payment modal"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f5f1] text-[#17201c] hover:bg-[#e7ebe4] active:scale-90 transition shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isSuccess ? (
              /* Success State */
              <div className="py-8 sm:py-10 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 20 }}
                  className="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-[#a8e63d] shadow-[0_6px_24px_rgba(168,230,61,0.5)] transform-gpu"
                >
                  <Check className="h-8 w-8 sm:h-10 sm:w-10 text-[#17201c] stroke-[3]" />
                </motion.div>

                <h4 className="mt-3.5 text-xl sm:text-2xl font-black text-[#17201c]">
                  Payment Verified!
                </h4>
                <p className="mt-1 text-xs text-[#718076]">
                  Redirecting to your court bookings now...
                </p>
                <div className="mt-4 flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-[#78a72b]" />
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2.5 sm:space-y-3.5">
                {/* Court Fee Summary Card */}
                <div className="rounded-2xl bg-[#f7f9f6] border border-[#e3e9e1] p-3 sm:p-3.5 flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <span className="text-[9.5px] uppercase font-bold text-[#86948b] block">
                      Court & Time
                    </span>
                    <p className="text-xs font-black text-[#17201c] truncate">
                      {venueName} · {courtName}
                    </p>
                    <p className="text-[11px] text-[#637267] truncate">
                      {date} · {timeSlot}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[9.5px] uppercase font-bold text-[#86948b] block">
                      Total Fee
                    </span>
                    <p className="text-base sm:text-lg font-black text-[#2e570c]">
                      {formatPriceVND(totalPrice)}
                    </p>
                  </div>
                </div>

                {/* QR Code Frame with Tap-to-Enlarge feature */}
                <div className="relative mx-auto flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#a8e63d] bg-white p-2.5 sm:p-3 shadow-inner w-full">
                  <div className="relative group cursor-pointer" onClick={() => setIsQREnlarged(!isQREnlarged)}>
                    <div
                      className={`relative overflow-hidden rounded-xl border border-[#e1e7df] shadow-sm transition-all duration-200 ${
                        isQREnlarged
                          ? "max-w-[280px] sm:max-w-[320px] scale-105"
                          : "max-w-[160px] sm:max-w-[200px]"
                      }`}
                    >
                      <img
                        src="/court_image/QRpay.jpg"
                        alt="VietQR Payment - KOY VIRAKSAK"
                        className="w-full h-auto object-contain select-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsQREnlarged(!isQREnlarged);
                      }}
                      className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-[#17201c]/80 backdrop-blur-md px-2 py-1 text-[10px] font-bold text-[#a8e63d] shadow-md hover:bg-[#17201c]"
                    >
                      {isQREnlarged ? (
                        <>
                          <Minimize2 className="h-3 w-3" />
                          <span>Shrink</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="h-3 w-3" />
                          <span>Enlarge QR</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 text-[10.5px] font-bold text-[#456e17]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Official BIDV VietQR Payment (Not a check-in pass)</span>
                  </div>
                </div>

                {/* Bank Info with Fast Copy */}
                <div className="rounded-2xl border border-[#e2e8df] bg-[#fcfdfb] p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#7d8a81] font-medium">Bank</span>
                    <span className="font-bold text-[#17201c]">{bankName}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#7d8a81] font-medium">Account Name</span>
                    <span className="font-black text-[#17201c]">{accountHolder}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#edf1ea] pt-2">
                    <span className="text-[#7d8a81] font-medium">Account Number</span>
                    <button
                      onClick={() => copyToClipboard(bankNumber, "account")}
                      className="flex items-center gap-1 font-mono font-black text-[#17201c] hover:text-[#5a861d] active:scale-95 transition"
                      title="Click to copy account number"
                    >
                      <span>{bankNumber}</span>
                      {copiedAccount ? (
                        <CheckCheck className="h-3.5 w-3.5 text-[#5a861d]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-[#8c9890]" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#7d8a81] font-medium">Transfer Memo</span>
                    <button
                      onClick={() => copyToClipboard(memoContent, "memo")}
                      className="flex items-center gap-1 font-mono font-bold text-[#3d5345] hover:text-[#5a861d] active:scale-95 transition"
                      title="Click to copy transfer memo"
                    >
                      <span>{memoContent}</span>
                      {copiedMemo ? (
                        <CheckCheck className="h-3.5 w-3.5 text-[#5a861d]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-[#8c9890]" />
                      )}
                    </button>
                  </div>
                </div>

                {paymentError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700 flex items-start gap-1.5">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* Confirm Action Button */}
                <div className="pt-1">
                  <button
                    onClick={handlePaid}
                    disabled={isVerifying}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#a8e63d] py-3.5 text-xs sm:text-sm font-black text-[#17201c] shadow-[0_6px_22px_rgba(168,230,61,0.4)] hover:bg-[#b8ef59] active:scale-95 transition-all disabled:opacity-75"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-[#17201c]" />
                        <span>Verifying VietQR Transfer...</span>
                      </>
                    ) : (
                      <>
                        <span>I Have Paid · Confirm Booking</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
