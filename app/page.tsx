"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { BrandLogoStrip } from "@/components/BrandLogoStrip";
import { ShuttlecockHero } from "@/components/ShuttlecockHero";
import { MobileBadmintonHero } from "@/components/MobileBadmintonHero";
import { MobileQuickFilters } from "@/components/MobileQuickFilters";
import { MobileFilterSheet } from "@/components/MobileFilterSheet";
import { ShoeStepAnimation } from "@/components/ShoeStepAnimation";
import { CalendarModal } from "@/components/CalendarModal";
import { Navbar } from "@/components/Navbar";
import { LoginModal } from "@/components/LoginModal";
import { useApp } from "@/context/AppContext";
import {
  Search,
  MapPin,
  Star,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowRight,
  Heart,
  X,
  Check,
  Zap,
  Sparkles,
  Calendar,
  Building2,
} from "lucide-react";

export default function ExplorePage() {
  const { toggleFavorite, isFavorite, venues } = useApp();
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("All locations");
  const [maxPrice, setMaxPrice] = useState("All prices");
  const [sort, setSort] = useState("recommended");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const activeFiltersCount =
    (location !== "All locations" ? 1 : 0) +
    (maxPrice !== "All prices" ? 1 : 0) +
    (availableOnly ? 1 : 0) +
    (sort !== "recommended" ? 1 : 0);

  const handleResetFilters = () => {
    setSearch("");
    setLocation("All locations");
    setMaxPrice("All prices");
    setSort("recommended");
    setAvailableOnly(false);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const quickDates = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const val = `${y}-${m}-${day}`;
      const weekday =
        i === 0
          ? "Today"
          : i === 1
          ? "Tomorrow"
          : d.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      list.push({ val, weekday, dayNum });
    }
    return list;
  }, []);

  const filteredCourts = useMemo(() => {
    let result = venues.filter((court) => {
      const matchesSearch =
        court.name.toLowerCase().includes(search.toLowerCase()) ||
        court.location.toLowerCase().includes(search.toLowerCase());

      const matchesLocation =
        location === "All locations" || court.location.includes(location);

      const matchesPrice =
        maxPrice === "All prices" || court.price <= Number(maxPrice);

      const matchesAvailability = !availableOnly || court.available;

      return (
        matchesSearch &&
        matchesLocation &&
        matchesPrice &&
        matchesAvailability
      );
    });

    if (sort === "price-low") {
      result = [...result].sort((a, b) => a.price - b.price);
    }

    if (sort === "rating") {
      result = [...result].sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [search, location, maxPrice, sort, availableOnly, venues]);

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-[#17201c] overflow-x-hidden pb-32 sm:pb-8">
      <Navbar />
      <LoginModal />

      {/* BRAND LOGOS STRIP (Placed at top like before) */}
      <BrandLogoStrip />

      {/* HERO SECTION WITH ANIMATED 3D SHUTTLECOCK */}
      <section className="relative mx-auto max-w-7xl px-4 pb-2 pt-1 sm:px-6 sm:pb-8 sm:pt-2">
        <div className="grid grid-cols-1 items-center gap-4 lg:gap-8 lg:grid-cols-12 min-w-0 w-full">
          {/* Left Hero Details */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="lg:col-span-7 z-10 min-w-0 w-full"
          >
            {/* Mobile View: ShuttleUp-SmashMode Title Header (Moved to Left), then Racket & Shuttlecock Animation at bottom, then Search Venue */}
            <div className="md:hidden pt-1 pb-1 w-full min-w-0">
              {/* 1. Header with ShuttleUp-SmashMode (Moved to Left) */}
              <div className="text-left px-0.5 mb-2.5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f0fae1] border border-[#a8e63d]/50 px-2.5 py-0.5 text-[10.5px] font-bold text-[#456e17] shadow-2xs mb-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#8dcf36] animate-pulse" />
                  Hanoi Smash Hub · Instant Booking
                </div>
                <h1 className="text-[22px] min-[375px]:text-[25px] sm:text-3xl font-black tracking-tight text-[#17201c] leading-tight">
                  Book your court<span className="text-[#a8e63d]">.</span>
                  <br />
                  <span className="text-[#3b4c40]">ShuttleUp-SmashMode</span>
                  <span className="text-[#78a72b]">.</span>
                </h1>
                <p className="mt-1 text-[11.5px] min-[375px]:text-xs text-[#738077] font-medium">
                  Hanoi&apos;s premier badminton venue network. Instant booking, zero wait.
                </p>
              </div>

              {/* 2. The animation of racket and shuttlecock at bottom of ShuttleUp-SmashMode */}
              <div className="mt-1 mb-2.5">
                <MobileBadmintonHero />
              </div>

              {/* 3. And then show search venue */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-2xl bg-white border border-[#dfe6dc] px-3.5 py-2.5 shadow-xs focus-within:border-[#a8e63d] focus-within:ring-2 focus-within:ring-[#a8e63d]/20 transition-all">
                    <Search className="h-4 w-4 shrink-0 text-[#78a72b]" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search venue or district in Hanoi..."
                      className="w-full bg-transparent text-xs font-semibold outline-none placeholder:text-[#9ea8a0] text-[#17201c]"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        aria-label="Clear search"
                        className="text-[#8e9891] active:scale-90 p-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setIsFilterSheetOpen(true)}
                    className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition active:scale-95 shadow-xs ${
                      activeFiltersCount > 0
                        ? "border-[#a8e63d] bg-[#17201c] text-[#a8e63d]"
                        : "border-[#dfe6dc] bg-white text-[#17201c]"
                    }`}
                    aria-label="Open filters"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#a8e63d] px-1 text-[9px] font-black text-[#17201c] shadow">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Quick Date Selector Strip for Mobile Users */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 w-full px-0.5 select-none">
                  {quickDates.map((item) => {
                    const isSelected = selectedDate === item.val;
                    return (
                      <button
                        key={item.val}
                        onClick={() => setSelectedDate(item.val)}
                        className={`flex flex-col items-center justify-center rounded-xl px-2.5 py-1 text-xs shrink-0 transition-all active:scale-95 border ${
                          isSelected
                            ? "bg-[#17201c] text-[#a8e63d] border-[#17201c] shadow-xs font-black"
                            : "bg-white text-[#4c5750] border-[#dfe6dc] hover:border-[#a8e63d]"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-tight">{item.weekday}</span>
                        <span className="text-[11px] font-extrabold">{item.dayNum}</span>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setIsCalendarOpen(true)}
                    className="flex flex-col items-center justify-center rounded-xl px-2.5 py-1 text-xs shrink-0 transition-all active:scale-95 border border-[#dfe6dc] bg-white text-[#17201c] hover:border-[#a8e63d]"
                    title="Open calendar modal"
                  >
                    <Calendar className="h-3 w-3 text-[#78a72b]" />
                    <span className="text-[10px] font-extrabold">Calendar</span>
                  </button>
                </div>

                {/* Horizontal Touch Scroll Quick Filters */}
                <MobileQuickFilters
                  location={location}
                  setLocation={setLocation}
                  maxPrice={maxPrice}
                  setMaxPrice={setMaxPrice}
                  availableOnly={availableOnly}
                  setAvailableOnly={setAvailableOnly}
                  sort={sort}
                  setSort={setSort}
                  selectedDate={selectedDate}
                  onOpenCalendarModal={() => setIsCalendarOpen(true)}
                  onOpenFilterSheet={() => setIsFilterSheetOpen(true)}
                />
              </div>
            </div>

            {/* Desktop Title Header */}
            <div className="hidden md:block mt-2 sm:mt-1">
              <h1 className="text-2xl font-extrabold tracking-[-0.04em] text-[#17201c] sm:text-4xl lg:text-[3.35rem] lg:leading-[1.12]">
                Book your court<span className="text-[#a8e63d]">.</span>
                <br />
                <span className="text-[#4e5b52]">ShuttleUp-SmashMode</span>
                <span className="text-[#78a72b]">.</span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-[#7a857e] font-medium">
                Hanoi&apos;s premier badminton venue network. Instant booking, zero wait.
              </p>
            </div>

            {/* Desktop Integrated Hero Search & Filter Card */}
            <div className="hidden md:block mt-4 rounded-[22px] border border-[#e1e7df] bg-white p-3.5 sm:p-4 shadow-[0_10px_35px_rgba(23,32,28,0.05)] backdrop-blur-md">
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <div className="flex flex-1 items-center gap-2.5 rounded-[14px] bg-[#f5f7f3] px-3.5 py-2.5">
                  <Search className="h-4 w-4 shrink-0 text-[#8e9891]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search venue or district..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[#9ea8a0]"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} aria-label="Clear search">
                      <X className="h-4 w-4 text-[#8e9891]" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                  {/* Desktop Date Picker Button */}
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(true)}
                    className="flex items-center gap-2 rounded-[14px] border border-[#e5eae2] bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#3a443e] hover:border-[#a8e63d] transition active:scale-95 shrink-0"
                    title="Choose date from calendar"
                  >
                    <Calendar className="h-4 w-4 text-[#78a72b]" />
                    <span>
                      {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </button>

                  <select
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    className="rounded-[14px] border border-[#e5eae2] bg-white px-3 py-2.5 text-xs sm:text-sm font-medium outline-none text-[#3a443e]"
                  >
                    <option>All locations</option>
                    <option>Thanh Xuan</option>
                    <option>Cau Giay</option>
                    <option>Dong Da</option>
                  </select>

                  <select
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(event.target.value)}
                    className="rounded-[14px] border border-[#e5eae2] bg-white px-3 py-2.5 text-xs sm:text-sm font-medium outline-none text-[#3a443e]"
                  >
                    <option value="All prices">All prices</option>
                    <option value="5">Under $5/hr</option>
                    <option value="6">Under $6/hr</option>
                    <option value="8">Under $8/hr</option>
                  </select>

                  <button
                    onClick={() => {
                      document.getElementById("venues")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-[14px] bg-[#a8e63d] px-5 py-2.5 text-xs sm:text-sm font-extrabold text-[#17201c] shadow-sm transition hover:bg-[#b8ef59] hover:shadow active:scale-95 shrink-0"
                  >
                    <span>Book Now!</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 border-t border-[#edf1ea] pt-3 text-xs">
                <button
                  onClick={() => setAvailableOnly(!availableOnly)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-medium transition ${
                    availableOnly
                      ? "border-[#a8e63d] bg-[#f0fae1] text-[#4f781a]"
                      : "border-[#e3e8e1] bg-white text-[#69746c]"
                  }`}
                >
                  <span
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                      availableOnly ? "bg-[#a8e63d]" : "border border-[#bdc6be]"
                    }`}
                  >
                    {availableOnly && <Check className="h-2.5 w-2.5" />}
                  </span>
                  Available courts only
                </button>

                <div className="flex items-center gap-1.5 text-[#6c7870]">
                  <ArrowUpDown className="h-3.5 w-3.5 text-[#87918a]" />
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                    className="bg-transparent text-xs font-semibold text-[#48534c] outline-none"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="price-low">Price: low to high</option>
                    <option value="rating">Highest rated</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Desktop Status Header Row */}
            <div className="hidden md:flex mt-3 items-center gap-2.5">
              <div className="flex items-center gap-1.5 rounded-full border border-[#dfe6dc] bg-white px-3 py-1 text-xs shadow-sm">
                <MapPin className="h-3.5 w-3.5 text-[#80b52e]" />
                <span className="font-semibold text-[#17201c]">Hanoi, Vietnam</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-[#e0e7dd] bg-white/90 px-3 py-1 text-xs font-bold text-[#556358]">
                <span className="h-2 w-2 rounded-full bg-[#8dcf36] animate-pulse" />
                {filteredCourts.length} Courts Matched
              </div>
            </div>

            {/* Stepping Badminton Shoe Court Animation (Desktop Only) */}
            <div className="hidden md:block mt-3 w-full">
              <ShoeStepAnimation />
            </div>
          </motion.div>

          {/* Right Side (Desktop): Animated 3D Badminton Shuttlecock Model */}
          <div className="hidden md:flex lg:col-span-5 justify-end items-center">
            <ShuttlecockHero />
          </div>
        </div>
      </section>

      {/* RESULTS / VENUES */}
      <section id="venues" className="mx-auto max-w-7xl px-4 py-3 sm:py-6 sm:px-6">
        <div className="mb-3 sm:mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-xl font-black text-[#17201c] flex items-center gap-2">
              <span>Available Venues</span>
              <span className="flex h-5 items-center justify-center rounded-full bg-[#a8e63d] px-2 text-[10px] font-black text-[#17201c]">
                {filteredCourts.length}
              </span>
            </h2>
            <div className="flex items-center gap-1 rounded-full border border-[#dfe6dc] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#556358]">
              <MapPin className="h-3 w-3 text-[#78a72b]" />
              <span>Hanoi</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-bold text-[#78a72b] hover:underline active:scale-95"
              >
                Reset filters
              </button>
            )}
            <div className="hidden items-center gap-2 text-xs text-[#89938c] sm:flex">
              <SlidersHorizontal className="h-4 w-4" />
              Refine your search
            </div>
          </div>
        </div>

        {/* Empty state when no matches */}
        {filteredCourts.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-[#d2dcd0] bg-white/70 p-8 text-center my-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0fae1] text-[#78a72b] mb-3">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-[#17201c]">No venues match your filters</h3>
            <p className="mt-1 text-xs text-[#7e8b82]">
              Try adjusting your search location, price, or date.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-4 rounded-full bg-[#a8e63d] px-4 py-2 text-xs font-extrabold text-[#17201c] shadow-xs active:scale-95"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <>
            {/* MOBILE VIEW: ALL COURTS SHOWN AS A CLEAN VERTICAL LINE */}
            <div className="sm:hidden flex flex-col gap-3">
              {filteredCourts.map((court, index) => {
                const isFav = isFavorite(court.id);
                return (
                  <motion.article
                    key={`mobile-${court.id}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.025 }}
                    className="group relative flex items-center gap-3 overflow-hidden rounded-[20px] border border-[#e1e7df] bg-white p-2.5 shadow-[0_2px_12px_rgba(23,32,28,0.04)] active:scale-[0.99] transition-all"
                  >
                    {/* Court Thumbnail on Left */}
                    <Link
                      href={`/courts/${court.id}?date=${selectedDate}`}
                      className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[16px] bg-[#17201c]"
                    >
                      <img
                        src={court.image}
                        alt={court.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                      {/* Status Pill Badge */}
                      <div className="absolute left-1.5 top-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8.5px] font-black text-white shadow-xs backdrop-blur-md ${
                            court.available ? "bg-[#275310]/90" : "bg-black/70"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              court.available ? "bg-[#8dcf36] animate-pulse" : "bg-amber-400"
                            }`}
                          />
                          {court.available ? "Open" : "Busy"}
                        </span>
                      </div>

                      {/* Price Pill */}
                      <div className="absolute bottom-1.5 right-1.5 rounded-full bg-[#17201c]/90 border border-white/20 px-2 py-0.5 text-[10px] font-black text-[#a8e63d] backdrop-blur-md">
                        ${court.price}<span className="text-[8px] font-normal text-white/80">/h</span>
                      </div>
                    </Link>

                    {/* Court Info on Right */}
                    <div className="flex flex-1 min-w-0 flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-start justify-between gap-1.5">
                          <Link
                            href={`/courts/${court.id}?date=${selectedDate}`}
                            className="min-w-0 flex-1"
                          >
                            <h3 className="text-[13.5px] font-black text-[#17201c] hover:text-[#456e17] transition-colors truncate">
                              {court.name}
                            </h3>
                          </Link>
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => toggleFavorite(court.id)}
                            aria-label="Toggle favorite"
                            className="p-1 text-[#69746c] active:scale-90 shrink-0"
                          >
                            <Heart
                              className={`h-3.5 w-3.5 transition-colors ${
                                isFav ? "fill-[#ed7181] text-[#ed7181]" : "text-[#8a968d]"
                              }`}
                            />
                          </motion.button>
                        </div>

                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#7a857e] truncate">
                          <MapPin className="h-3 w-3 text-[#78a72b] shrink-0" />
                          <span className="truncate">{court.location}</span>
                        </p>

                        <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-[#6b756e]">
                          <span className="flex items-center gap-0.5 font-black text-[#8f6600]">
                            <Star className="h-3 w-3 fill-[#f2bd48] text-[#f2bd48]" />
                            {court.rating}
                          </span>
                          <span>·</span>
                          <span>{court.courts} courts</span>
                          {court.tags[0] && (
                            <>
                              <span>·</span>
                              <span className="rounded bg-[#f0fae1] px-1.5 py-0.2 text-[9.5px] font-bold text-[#487519] truncate max-w-[75px]">
                                {court.tags[0]}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Bottom Action Line */}
                      <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-[#f0f3ee]">
                        <div className="text-[11px] text-[#8a958d]">
                          <span className="font-extrabold text-[#17201c] text-xs">${court.price}</span>
                          <span> / hour</span>
                        </div>

                        <Link
                          href={`/courts/${court.id}?date=${selectedDate}`}
                          className="flex items-center gap-1 rounded-full bg-[#a8e63d] px-3.5 py-1 text-xs font-black text-[#17201c] shadow-xs active:scale-95 transition hover:bg-[#b8ef59]"
                        >
                          <span>Book</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>

            {/* DESKTOP VIEW: MULTI-COLUMN CARD GRID */}
            <div className="hidden sm:grid gap-3.5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCourts.map((court, index) => {
                const isFav = isFavorite(court.id);
                return (
                  <motion.article
                    key={court.id}
                    layout
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="group overflow-hidden rounded-[20px] sm:rounded-[26px] border border-[#e0e6de] bg-white shadow-[0_2px_12px_rgba(35,55,35,0.04)] sm:shadow-[0_4px_24px_rgba(35,55,35,.04)] transition-all hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(35,55,35,.09)]"
                  >
                    <Link
                      href={`/courts/${court.id}?date=${selectedDate}`}
                      className="block relative overflow-hidden aspect-[16/9.5] sm:aspect-auto sm:h-52 w-full"
                    >
                      <img
                        src={court.image}
                        alt={court.name}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />

                      {/* Gradient Overlay for Text Readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25 pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold text-[#35521b] shadow-xs backdrop-blur-md">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            court.available ? "bg-[#8dcf36] animate-pulse" : "bg-[#e1a15d]"
                          }`}
                        />
                        {court.available ? "Available Now" : "Fully Booked"}
                      </div>

                      {/* Bottom Tags on Image */}
                      <div className="absolute bottom-2.5 left-2.5 flex gap-1">
                        {court.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/20 bg-black/45 px-2 py-0.5 text-[9.5px] font-bold text-white backdrop-blur-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Price Tag Floating Pill */}
                      <div className="absolute bottom-2.5 right-2.5 rounded-full bg-[#17201c]/90 border border-white/20 px-2.5 py-0.5 text-[11px] font-black text-[#a8e63d] backdrop-blur-md">
                        ${court.price}<span className="text-[9px] font-normal text-white/80">/hr</span>
                      </div>
                    </Link>

                    <div className="p-3.5 sm:p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <Link href={`/courts/${court.id}?date=${selectedDate}`}>
                            <h3 className="text-sm sm:text-base font-bold text-[#17201c] hover:text-[#456e17] transition-colors truncate">
                              {court.name}
                            </h3>
                          </Link>
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] sm:text-xs text-[#8a948d] truncate">
                            <MapPin className="h-3 w-3 text-[#78a72b] shrink-0" />
                            <span>{court.location}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center gap-1 rounded-xl bg-[#fff8e8] px-2 py-0.5 text-xs font-black text-[#8f6600] border border-[#f5e3b5]">
                            <Star className="h-3 w-3 fill-[#f2bd48] text-[#f2bd48]" />
                            <span>{court.rating}</span>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => toggleFavorite(court.id)}
                            aria-label="Toggle favorite"
                            className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#f5f7f3] border border-[#e1e7df] text-[#69746c] active:scale-90"
                          >
                            <Heart
                              className={`h-3.5 w-3.5 transition-colors ${
                                isFav ? "fill-[#ed7181] text-[#ed7181]" : "text-[#69746c]"
                              }`}
                            />
                          </motion.button>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between border-t border-[#edf0eb] pt-2.5">
                        <div className="flex items-center gap-2 text-[11px] text-[#89938c]">
                          <span>{court.reviews} reviews</span>
                          <span>·</span>
                          <span>{court.courts} courts</span>
                        </div>

                        <Link
                          href={`/courts/${court.id}?date=${selectedDate}`}
                          className="flex items-center gap-1 rounded-full bg-[#a8e63d] px-3.5 py-1.5 text-xs font-black text-[#17201c] transition-all hover:bg-[#b8ef59] active:scale-95 shadow-xs"
                        >
                          <span>Book</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* MOBILE FILTER BOTTOM SHEET */}
      <MobileFilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        location={location}
        setLocation={setLocation}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        sort={sort}
        setSort={setSort}
        availableOnly={availableOnly}
        setAvailableOnly={setAvailableOnly}
        selectedDate={selectedDate}
        onOpenCalendar={() => {
          setIsFilterSheetOpen(false);
          setIsCalendarOpen(true);
        }}
        totalFilteredCount={filteredCourts.length}
        onReset={handleResetFilters}
      />

      {/* CALENDAR MODAL */}
      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        title="Select Match Date"
      />

      {/* CLUB OWNER CTA BANNER */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#17201c] via-[#24332c] to-[#17201c] p-6 sm:p-10 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#a8e63d]/20 border border-[#a8e63d]/40 px-3 py-1 text-xs font-bold text-[#a8e63d]">
                <Building2 className="h-3.5 w-3.5" />
                For Badminton Club Owners
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Are you a Badminton Club Owner<span className="text-[#a8e63d]">?</span>
              </h2>
              <p className="text-xs sm:text-sm text-[#b0c0b5]">
                List your badminton venue on BookMeBadminton to reach thousands of players, automate court reservations, and fill open court slots effortlessly.
              </p>
            </div>
            <Link
              href="/add-club"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#a8e63d] px-6 py-3.5 text-xs sm:text-sm font-black text-[#17201c] shadow-md transition hover:bg-[#b8ef59] active:scale-95 shrink-0"
            >
              <span>List Your Club Now</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#e1e7df] bg-white/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-6 py-8 text-xs text-[#89938c] sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 font-bold text-[#17201c]">
            <img
              src="/logo.png"
              alt="BookMeBadminton Logo"
              className="h-6 w-6 rounded-lg object-contain bg-white p-0.5 shadow-sm ring-1 ring-[#e1e7df]"
            />
            <span>BookMeBadminton.</span>
          </div>
          <span>Find. Book. Play.</span>
          <span>© 2026 BookMeBadminton</span>
        </div>
      </footer>
    </main>
  );
}