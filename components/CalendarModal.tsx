"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  title?: string;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function padZero(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function CalendarModal({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  title = "Select Match Date",
}: CalendarModalProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Initialize view month based on selectedDate or today
  const initDate = selectedDate ? new Date(selectedDate) : today;
  const [currentYear, setCurrentYear] = useState(initDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initDate.getMonth()); // 0-indexed

  // Temporary selected date before confirming
  const [tempDate, setTempDate] = useState(
    selectedDate || `${today.getFullYear()}-${padZero(today.getMonth() + 1)}-${padZero(today.getDate())}`
  );

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Generate calendar days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  // getDay: 0 is Sunday, 1 is Monday ... map Monday = 0, Sunday = 6
  const startDay = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Quick preset shortcuts
  const selectQuickPreset = (offsetDays: number) => {
    const target = new Date();
    target.setHours(0, 0, 0, 0);
    target.setDate(target.getDate() + offsetDays);

    const str = `${target.getFullYear()}-${padZero(target.getMonth() + 1)}-${padZero(target.getDate())}`;
    setTempDate(str);
    setCurrentYear(target.getFullYear());
    setCurrentMonth(target.getMonth());
  };

  const selectThisWeekend = (isSunday = false) => {
    const target = new Date();
    target.setHours(0, 0, 0, 0);
    const day = target.getDay(); // 0 Sun, 6 Sat
    const daysUntilWeekend = isSunday
      ? day === 0 ? 0 : 7 - day
      : day === 6 ? 0 : (6 - day + 7) % 7;

    target.setDate(target.getDate() + daysUntilWeekend);
    const str = `${target.getFullYear()}-${padZero(target.getMonth() + 1)}-${padZero(target.getDate())}`;
    setTempDate(str);
    setCurrentYear(target.getFullYear());
    setCurrentMonth(target.getMonth());
  };

  const handleConfirm = () => {
    onSelectDate(tempDate);
    onClose();
  };

  // Check if prev month navigation should be disabled (cannot go before current month)
  const isCurrentMonthOrPast =
    currentYear === today.getFullYear() && currentMonth <= today.getMonth();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ y: "100%", opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative z-10 w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] border border-[#e1e7df] bg-white p-5 sm:p-6 shadow-[0_20px_60px_rgba(23,32,28,0.25)] select-none max-h-[92vh] overflow-y-auto"
          >
            {/* Mobile Drag Pill */}
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#d0d7cf] sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#edf1ea]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f0fae1] text-[#4f781a]">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#17201c]">{title}</h3>
                  <p className="text-[11px] text-[#7d8881]">Pick a date to check availability</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f5f1] text-[#17201c] transition hover:bg-[#e6eae4] active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Presets Pills */}
            <div className="mt-3.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
              <button
                onClick={() => selectQuickPreset(0)}
                className="shrink-0 rounded-full border border-[#e1e7df] bg-[#f7f9f6] px-3 py-1.5 text-xs font-bold text-[#354038] hover:bg-white active:scale-95 transition"
              >
                Today
              </button>
              <button
                onClick={() => selectQuickPreset(1)}
                className="shrink-0 rounded-full border border-[#e1e7df] bg-[#f7f9f6] px-3 py-1.5 text-xs font-bold text-[#354038] hover:bg-white active:scale-95 transition"
              >
                Tomorrow
              </button>
              <button
                onClick={() => selectThisWeekend(false)}
                className="shrink-0 rounded-full border border-[#e1e7df] bg-[#f7f9f6] px-3 py-1.5 text-xs font-bold text-[#354038] hover:bg-white active:scale-95 transition"
              >
                Saturday
              </button>
              <button
                onClick={() => selectThisWeekend(true)}
                className="shrink-0 rounded-full border border-[#e1e7df] bg-[#f7f9f6] px-3 py-1.5 text-xs font-bold text-[#354038] hover:bg-white active:scale-95 transition"
              >
                Sunday
              </button>
              <button
                onClick={() => selectQuickPreset(7)}
                className="shrink-0 rounded-full border border-[#e1e7df] bg-[#f7f9f6] px-3 py-1.5 text-xs font-bold text-[#354038] hover:bg-white active:scale-95 transition"
              >
                Next Week
              </button>
            </div>

            {/* Calendar Controls (Month & Year) */}
            <div className="mt-4 flex items-center justify-between px-1">
              <span className="text-sm font-black text-[#17201c]">
                {monthNames[currentMonth]} {currentYear}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={prevMonth}
                  disabled={isCurrentMonthOrPast}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl border border-[#e1e7df] bg-white transition active:scale-90 ${
                    isCurrentMonthOrPast ? "opacity-30 cursor-not-allowed" : "hover:bg-[#f5f7f3]"
                  }`}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4 text-[#17201c]" />
                </button>

                <button
                  onClick={nextMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#e1e7df] bg-white hover:bg-[#f5f7f3] transition active:scale-90"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4 text-[#17201c]" />
                </button>
              </div>
            </div>

            {/* Weekday Labels */}
            <div className="mt-3 grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-[11px] font-bold text-[#8e9992] py-1">
                  {w}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Blank leading days */}
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`blank-${i}`} className="h-10 w-full" />
              ))}

              {/* Month Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateObj = new Date(currentYear, currentMonth, dayNum);
                dateObj.setHours(0, 0, 0, 0);

                const dateStr = `${currentYear}-${padZero(currentMonth + 1)}-${padZero(dayNum)}`;
                const isPast = dateObj < today;
                const isSelected = tempDate === dateStr;
                const isToday =
                  dateObj.getDate() === today.getDate() &&
                  dateObj.getMonth() === today.getMonth() &&
                  dateObj.getFullYear() === today.getFullYear();

                return (
                  <button
                    key={dateStr}
                    disabled={isPast}
                    onClick={() => setTempDate(dateStr)}
                    className={`relative flex h-10 w-full items-center justify-center rounded-2xl text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-[#a8e63d] text-[#17201c] font-black shadow-md scale-105 z-10"
                        : isPast
                        ? "text-[#c2cbc4] cursor-not-allowed"
                        : "text-[#17201c] hover:bg-[#f3f7f0] active:scale-95"
                    }`}
                  >
                    <span>{dayNum}</span>

                    {/* Today indicator dot */}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#78a72b]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Date Summary & Confirm Bar */}
            <div className="mt-5 pt-3.5 border-t border-[#edf1ea] flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#8a968e]">Selected Date</span>
                <p className="text-xs font-black text-[#17201c]">
                  {new Date(tempDate + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const todayStr = `${today.getFullYear()}-${padZero(today.getMonth() + 1)}-${padZero(today.getDate())}`;
                    setTempDate(todayStr);
                    onSelectDate(todayStr);
                    onClose();
                  }}
                  className="rounded-2xl border border-[#e1e7df] px-3 py-2 text-xs font-bold text-[#627066] hover:bg-[#f6f8f5] active:scale-95"
                >
                  Reset
                </button>

                <button
                  onClick={handleConfirm}
                  className="flex items-center gap-1.5 rounded-2xl bg-[#a8e63d] px-5 py-2.5 text-xs font-black text-[#17201c] shadow-[0_4px_16px_rgba(168,230,61,0.4)] hover:bg-[#b5f04b] active:scale-95 transition-all"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Confirm</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
