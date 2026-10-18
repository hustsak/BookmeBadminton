"use client";

import { motion } from "motion/react";
import { Sparkles, MapPin, Zap, DollarSign, Star, SlidersHorizontal } from "lucide-react";

interface MobileQuickFiltersProps {
  location: string;
  setLocation: (loc: string) => void;
  maxPrice: string;
  setMaxPrice: (price: string) => void;
  availableOnly: boolean;
  setAvailableOnly: (avail: boolean) => void;
  sort: string;
  setSort: (s: string) => void;
  selectedDate: string;
  onOpenCalendarModal: () => void;
  onOpenFilterSheet: () => void;
}

export function MobileQuickFilters({
  location,
  setLocation,
  maxPrice,
  setMaxPrice,
  availableOnly,
  setAvailableOnly,
  sort,
  setSort,
  selectedDate,
  onOpenCalendarModal,
  onOpenFilterSheet,
}: MobileQuickFiltersProps) {
  const isAllSelected =
    location === "All locations" &&
    maxPrice === "All prices" &&
    !availableOnly &&
    sort === "recommended";

  const todayStr = new Date().toISOString().split("T")[0];
  const isToday = selectedDate === todayStr;

  const dateLabel = isToday
    ? "📅 Today"
    : `📅 ${new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;

  const handleReset = () => {
    setLocation("All locations");
    setMaxPrice("All prices");
    setAvailableOnly(false);
    setSort("recommended");
  };

  return (
    <div className="md:hidden w-full overflow-x-auto scrollbar-none py-1 px-0.5 flex items-center gap-2">
      {/* Date Picker Button (Opens Calendar) */}
      <button
        onClick={onOpenCalendarModal}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black shrink-0 transition-all active:scale-95 shadow-sm ${
          !isToday
            ? "bg-[#17201c] text-[#a8e63d] ring-2 ring-[#a8e63d]/60"
            : "border border-[#e1e7df] bg-white text-[#17201c]"
        }`}
      >
        <span>{dateLabel}</span>
      </button>

      {/* Filter Sheet Trigger Pill */}
      <button
        onClick={onOpenFilterSheet}
        className="flex items-center gap-1.5 rounded-full border border-[#d5ded2] bg-white px-3 py-1.5 text-xs font-bold text-[#17201c] shadow-sm shrink-0 active:scale-95"
      >
        <SlidersHorizontal className="h-3.5 w-3.5 text-[#78a72b]" />
        <span>Filters</span>
        {(location !== "All locations" || maxPrice !== "All prices" || availableOnly || sort !== "recommended") && (
          <span className="h-1.5 w-1.5 rounded-full bg-[#a8e63d]" />
        )}
      </button>

      {/* All Venues */}
      <button
        onClick={handleReset}
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shrink-0 transition-all active:scale-95 ${
          isAllSelected
            ? "bg-[#17201c] text-[#a8e63d] shadow-sm"
            : "border border-[#e1e7df] bg-white/90 text-[#4c5750]"
        }`}
      >
        <span>🏸 All Courts</span>
      </button>

      {/* Available Now */}
      <button
        onClick={() => setAvailableOnly(!availableOnly)}
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shrink-0 transition-all active:scale-95 ${
          availableOnly
            ? "bg-[#a8e63d] text-[#17201c] shadow-sm font-extrabold"
            : "border border-[#e1e7df] bg-white/90 text-[#4c5750]"
        }`}
      >
        <Zap className="h-3 w-3 fill-current" />
        <span>Available Now</span>
      </button>

      {/* Thanh Xuan */}
      <button
        onClick={() => setLocation(location === "Thanh Xuan" ? "All locations" : "Thanh Xuan")}
        className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold shrink-0 transition-all active:scale-95 ${
          location === "Thanh Xuan"
            ? "bg-[#17201c] text-[#a8e63d] shadow-sm"
            : "border border-[#e1e7df] bg-white/90 text-[#4c5750]"
        }`}
      >
        <MapPin className="h-3 w-3" />
        <span>Thanh Xuan</span>
      </button>

      {/* Cau Giay */}
      <button
        onClick={() => setLocation(location === "Cau Giay" ? "All locations" : "Cau Giay")}
        className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold shrink-0 transition-all active:scale-95 ${
          location === "Cau Giay"
            ? "bg-[#17201c] text-[#a8e63d] shadow-sm"
            : "border border-[#e1e7df] bg-white/90 text-[#4c5750]"
        }`}
      >
        <MapPin className="h-3 w-3" />
        <span>Cau Giay</span>
      </button>

      {/* Dong Da */}
      <button
        onClick={() => setLocation(location === "Dong Da" ? "All locations" : "Dong Da")}
        className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold shrink-0 transition-all active:scale-95 ${
          location === "Dong Da"
            ? "bg-[#17201c] text-[#a8e63d] shadow-sm"
            : "border border-[#e1e7df] bg-white/90 text-[#4c5750]"
        }`}
      >
        <MapPin className="h-3 w-3" />
        <span>Dong Da</span>
      </button>

      {/* Under $6 */}
      <button
        onClick={() => setMaxPrice(maxPrice === "6" ? "All prices" : "6")}
        className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold shrink-0 transition-all active:scale-95 ${
          maxPrice === "6"
            ? "bg-[#17201c] text-[#a8e63d] shadow-sm"
            : "border border-[#e1e7df] bg-white/90 text-[#4c5750]"
        }`}
      >
        <span>💰 Under $6</span>
      </button>

      {/* Highest Rated */}
      <button
        onClick={() => setSort(sort === "rating" ? "recommended" : "rating")}
        className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold shrink-0 transition-all active:scale-95 ${
          sort === "rating"
            ? "bg-[#17201c] text-[#a8e63d] shadow-sm"
            : "border border-[#e1e7df] bg-white/90 text-[#4c5750]"
        }`}
      >
        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
        <span>Top Rated</span>
      </button>
    </div>
  );
}
