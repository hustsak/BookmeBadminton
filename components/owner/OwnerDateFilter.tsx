"use client";

import React, { useState } from "react";
import { Calendar, ChevronDown, Check, Clock } from "lucide-react";
import { DateFilterPreset } from "@/lib/owner-analytics";

interface OwnerDateFilterProps {
  preset: DateFilterPreset;
  onPresetChange: (p: DateFilterPreset) => void;
  startDate: string;
  endDate: string;
  onCustomDateChange: (start: string, end: string) => void;
  currentRangeLabel?: string;
  previousRangeLabel?: string;
}

const PRESET_OPTIONS: { id: DateFilterPreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "last7days", label: "Last 7 days" },
  { id: "last30days", label: "Last 30 days" },
  { id: "thisMonth", label: "This month" },
  { id: "lastMonth", label: "Previous month" },
  { id: "custom", label: "Custom range" },
];

export function OwnerDateFilter({
  preset,
  onPresetChange,
  startDate,
  endDate,
  onCustomDateChange,
  currentRangeLabel,
  previousRangeLabel,
}: OwnerDateFilterProps) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);

  const handleApplyCustom = () => {
    if (localStart && localEnd) {
      onCustomDateChange(localStart, localEnd);
      setShowCustomModal(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between bg-white border border-[#e1e7df] p-3 rounded-2xl shadow-xs">
      {/* Presets Button Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
        <span className="text-xs font-bold text-[#627065] flex items-center gap-1 mr-1 shrink-0">
          <Calendar size={13} className="text-[#3c6b12]" /> Period:
        </span>
        {PRESET_OPTIONS.map((opt) => {
          const isSelected = preset === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => {
                if (opt.id === "custom") {
                  setShowCustomModal(true);
                }
                onPresetChange(opt.id);
              }}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${
                isSelected
                  ? "bg-[#17201c] text-[#a8e63d] shadow-2xs"
                  : "bg-[#f2f4ef] text-[#4d5a52] hover:bg-[#e4e8e0]"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Date Range & Comparison Sub-label */}
      <div className="text-right flex items-center justify-between sm:justify-end gap-3 text-xs text-[#717c74]">
        {currentRangeLabel && (
          <div className="flex items-center gap-1.5 bg-[#f5f7f3] px-2.5 py-1 rounded-lg">
            <span className="font-semibold text-[#17201c]">{currentRangeLabel}</span>
            {previousRangeLabel && (
              <span className="text-[11px] text-[#7a867e] hidden md:inline">
                (vs. {previousRangeLabel})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Custom Date Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl border border-[#e1e7df]">
            <h3 className="text-sm font-black text-[#17201c] mb-1">Select Custom Date Range</h3>
            <p className="text-xs text-[#717c74] mb-4">Choose start and end date for analytics review.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#55635a] mb-1">Start Date</label>
                <input
                  type="date"
                  value={localStart}
                  onChange={(e) => setLocalStart(e.target.value)}
                  className="w-full rounded-xl border border-[#d2d9cf] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#17201c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#55635a] mb-1">End Date</label>
                <input
                  type="date"
                  value={localEnd}
                  onChange={(e) => setLocalEnd(e.target.value)}
                  className="w-full rounded-xl border border-[#d2d9cf] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#17201c]"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#627065] hover:bg-[#f2f4ef]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCustom}
                className="rounded-xl bg-[#17201c] px-4 py-1.5 text-xs font-bold text-[#a8e63d] hover:bg-[#25322c]"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
