"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Navbar } from "@/components/Navbar";
import { LoginModal } from "@/components/LoginModal";
import { useApp, ClubVenue } from "@/context/AppContext";
import {
  Building2,
  Plus,
  MapPin,
  Clock,
  Phone,
  Mail,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  X,
  Layers,
  Star,
  Check,
  Zap,
  Info,
  ChevronRight,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";

const HANOI_DISTRICTS = [
  "Thanh Xuan",
  "Cau Giay",
  "Dong Da",
  "Ba Dinh",
  "Hoan Kiem",
  "Ha Dong",
  "Hai Ba Trung",
  "Tay Ho",
  "Long Bien",
  "Nam Tu Liem",
  "Bac Tu Liem",
  "Hoang Mai",
];

const AMENITY_TAGS = [
  "Air-conditioned",
  "Parking",
  "Pro Shop",
  "Shower",
  "Locker Room",
  "LED Lighting",
  "Rest Lounge",
  "Coaching",
  "Equipment Rental",
  "BWF Approved",
];

const PRESET_COURT_IMAGES = [
  { url: "/court_image/c1.jpeg", label: "Pro Green Court" },
  { url: "/court_image/c2.jpeg", label: "Tournament Arena" },
  { url: "/court_image/c3.jpeg", label: "Wooden Floor Stadium" },
  { url: "/court_image/c4.jpg", label: "Blue Taraflex Mat" },
  { url: "/court_image/c5.webp", label: "Championship Court" },
  { url: "/court_image/c6.webp", label: "Lighted Indoor Complex" },
];

export default function AddClubPage() {
  const router = useRouter();
  const { user, addClub, openLoginModal } = useApp();

  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [clubName, setClubName] = useState("");
  const [district, setDistrict] = useState("Thanh Xuan");
  const [address, setAddress] = useState("");
  const [openingHours, setOpeningHours] = useState("06:00 - 23:00");
  const [ownerName, setOwnerName] = useState(user?.name || "");
  const [contactPhone, setContactPhone] = useState("0912 345 678");
  const [contactEmail, setContactEmail] = useState(user?.email || "owner@badmintonclub.com");
  
  const [price, setPrice] = useState<number>(6);
  const [courtsCount, setCourtsCount] = useState<number>(6);
  const [selectedTags, setSelectedTags] = useState<string[]>(["Air-conditioned", "Parking", "Owner Verified"]);
  
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string>("/court_image/c1.jpeg");
  const [customImageUrl, setCustomImageUrl] = useState("");

  // Courts setup array
  const [courtsList, setCourtsList] = useState<
    Array<{ id: number; name: string; priceHour: number; surface: string }>
  >([
    { id: 1, name: "Court 01 (VIP Wood)", priceHour: 100000, surface: "Taraflex Pro Turf" },
    { id: 2, name: "Court 02", priceHour: 100000, surface: "Tournament Blue Mat" },
    { id: 3, name: "Court 03", priceHour: 120000, surface: "Center Court Stadium" },
    { id: 4, name: "Court 04", priceHour: 120000, surface: "Training Arena" },
  ]);

  // Validation & Modal State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdVenue, setCreatedVenue] = useState<ClubVenue | null>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCourt = () => {
    const nextId = courtsList.length + 1;
    setCourtsList((prev) => [
      ...prev,
      {
        id: nextId,
        name: `Court ${String(nextId).padStart(2, "0")}`,
        priceHour: price * 20000,
        surface: "Taraflex Tournament Mat",
      },
    ]);
    setCourtsCount(courtsList.length + 1);
  };

  const handleRemoveCourt = (index: number) => {
    if (courtsList.length <= 1) return;
    const updated = courtsList.filter((_, i) => i !== index);
    setCourtsList(updated);
    setCourtsCount(updated.length);
  };

  const handleCourtChange = (index: number, field: string, value: any) => {
    setCourtsList((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!clubName.trim()) newErrors.clubName = "Club name is required.";
    if (!address.trim()) newErrors.address = "Street address is required.";
    if (!contactPhone.trim()) newErrors.contactPhone = "Contact phone is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!price || price <= 0) newErrors.price = "Please specify a valid hourly price.";
    if (!courtsCount || courtsCount <= 0) newErrors.courtsCount = "At least 1 court is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep1()) {
      setFormStep(1);
      return;
    }

    if (!validateStep2()) {
      setFormStep(2);
      return;
    }

    const finalImage = customImageUrl.trim() ? customImageUrl.trim() : image;
    const fullLocation = `${district}, Hanoi`;

    const newVenue = addClub({
      name: clubName.trim(),
      location: fullLocation,
      district,
      city: "Hanoi",
      address: address.trim(),
      price,
      courts: courtsCount,
      image: finalImage,
      tags: selectedTags.length > 0 ? selectedTags : ["Air-conditioned", "Owner Verified"],
      description:
        description.trim() ||
        `${clubName} is a top-tier badminton facility located in ${district}, Hanoi. Features ${courtsCount} high-quality courts, professional lighting, and player amenities.`,
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
      ownerName: ownerName.trim() || user?.name || "Club Owner",
      openingHours: openingHours.trim(),
      courtsList,
    });

    setCreatedVenue(newVenue);
  };

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-[#17201c] pb-24 overflow-x-hidden">
      <Navbar />
      <LoginModal />

      {/* Header Banner */}
      <section className="bg-gradient-to-b from-[#17201c] to-[#24332c] text-white pt-8 pb-14 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 opacity-10 pointer-events-none">
          <Building2 className="h-96 w-96 text-[#a8e63d]" />
        </div>

        <div className="mx-auto max-w-7xl relative z-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#a8e63d] mb-3">
            <Link href="/" className="hover:underline text-[#a8e63d]/80">Home</Link>
            <span>/</span>
            <span className="text-white">Club Owner Portal</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#a8e63d]/20 border border-[#a8e63d]/40 px-3 py-1 text-xs font-bold text-[#a8e63d] mb-3 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                Owner Partner Registration
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
                List Your Badminton Club<span className="text-[#a8e63d]">.</span>
              </h1>
              <p className="mt-2 text-sm sm:text-base text-[#b0c0b5] max-w-2xl font-medium">
                Connect your courts with thousands of active players in Hanoi. Enjoy instant online bookings, filled court slots, and zero setup fees.
              </p>
            </div>

            {/* Quick Stats Pill */}
            <div className="flex items-center gap-4 rounded-2xl bg-white/10 border border-white/15 p-4 backdrop-blur-md shrink-0">
              <div className="text-center px-2">
                <p className="text-xl font-black text-[#a8e63d]">100%</p>
                <p className="text-[11px] font-semibold text-[#a0b0a5]">Direct Bookings</p>
              </div>
              <div className="h-8 w-px bg-white/15" />
              <div className="text-center px-2">
                <p className="text-xl font-black text-white">$0</p>
                <p className="text-[11px] font-semibold text-[#a0b0a5]">Listing Fee</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 -mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form & Stepper */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-[#e1e7df] p-5 sm:p-8 shadow-sm">
            
            {/* Step Indicator Tabs */}
            <div className="flex items-center justify-between border-b border-[#edf1eb] pb-6 mb-8 gap-2">
              <button
                onClick={() => setFormStep(1)}
                className={`flex items-center gap-2 text-xs sm:text-sm font-bold transition ${
                  formStep === 1 ? "text-[#17201c]" : "text-[#8a958e]"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                    formStep === 1
                      ? "bg-[#a8e63d] text-[#17201c]"
                      : "bg-[#f0f3ee] text-[#6b756e]"
                  }`}
                >
                  1
                </span>
                <span>General Info</span>
              </button>

              <ChevronRight className="h-4 w-4 text-[#c0c9c2]" />

              <button
                onClick={() => {
                  if (validateStep1()) setFormStep(2);
                }}
                className={`flex items-center gap-2 text-xs sm:text-sm font-bold transition ${
                  formStep === 2 ? "text-[#17201c]" : "text-[#8a958e]"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                    formStep === 2
                      ? "bg-[#a8e63d] text-[#17201c]"
                      : "bg-[#f0f3ee] text-[#6b756e]"
                  }`}
                >
                  2
                </span>
                <span>Courts & Pricing</span>
              </button>

              <ChevronRight className="h-4 w-4 text-[#c0c9c2]" />

              <button
                onClick={() => {
                  if (validateStep1() && validateStep2()) setFormStep(3);
                }}
                className={`flex items-center gap-2 text-xs sm:text-sm font-bold transition ${
                  formStep === 3 ? "text-[#17201c]" : "text-[#8a958e]"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                    formStep === 3
                      ? "bg-[#a8e63d] text-[#17201c]"
                      : "bg-[#f0f3ee] text-[#6b756e]"
                  }`}
                >
                  3
                </span>
                <span>Photos & Publish</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* STEP 1: Basic Club Information */}
              {formStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                >
                  <div>
                    <h2 className="text-xl font-extrabold text-[#17201c]">Basic Club Details</h2>
                    <p className="text-xs text-[#78857c]">Provide your club name, location, and owner contact information.</p>
                  </div>

                  <div className="space-y-4">
                    {/* Club Name */}
                    <div>
                      <label className="block text-xs font-bold text-[#17201c] mb-1.5">
                        Club / Venue Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={clubName}
                        onChange={(e) => setClubName(e.target.value)}
                        placeholder="e.g. Smash Arena Badminton Club"
                        className={`w-full rounded-2xl border px-4 py-3 text-xs sm:text-sm font-medium outline-none transition focus:ring-2 ${
                          errors.clubName
                            ? "border-red-400 bg-red-50/30 focus:ring-red-300"
                            : "border-[#d8e0d5] bg-[#fafbf9] focus:border-[#a8e63d] focus:ring-[#a8e63d]/20"
                        }`}
                      />
                      {errors.clubName && (
                        <p className="mt-1 text-[11px] text-red-500 font-semibold">{errors.clubName}</p>
                      )}
                    </div>

                    {/* District & City */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#17201c] mb-1.5">
                          District in Hanoi <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          className="w-full rounded-2xl border border-[#d8e0d5] bg-[#fafbf9] px-4 py-3 text-xs sm:text-sm font-medium outline-none transition focus:border-[#a8e63d] focus:ring-2 focus:ring-[#a8e63d]/20"
                        >
                          {HANOI_DISTRICTS.map((d) => (
                            <option key={d} value={d}>
                              {d}, Hanoi
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#17201c] mb-1.5">
                          Operating Hours
                        </label>
                        <input
                          type="text"
                          value={openingHours}
                          onChange={(e) => setOpeningHours(e.target.value)}
                          placeholder="e.g. 06:00 - 23:00"
                          className="w-full rounded-2xl border border-[#d8e0d5] bg-[#fafbf9] px-4 py-3 text-xs sm:text-sm font-medium outline-none transition focus:border-[#a8e63d] focus:ring-2 focus:ring-[#a8e63d]/20"
                        />
                      </div>
                    </div>

                    {/* Full Street Address */}
                    <div>
                      <label className="block text-xs font-bold text-[#17201c] mb-1.5">
                        Full Street Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-[#78a72b]" />
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="e.g. 125 Nguyen Trai, Thanh Xuan, Hanoi"
                          className={`w-full rounded-2xl border pl-10 pr-4 py-3 text-xs sm:text-sm font-medium outline-none transition focus:ring-2 ${
                            errors.address
                              ? "border-red-400 bg-red-50/30 focus:ring-red-300"
                              : "border-[#d8e0d5] bg-[#fafbf9] focus:border-[#a8e63d] focus:ring-[#a8e63d]/20"
                          }`}
                        />
                      </div>
                      {errors.address && (
                        <p className="mt-1 text-[11px] text-red-500 font-semibold">{errors.address}</p>
                      )}
                    </div>

                    {/* Owner Contact Information */}
                    <div className="pt-3 border-t border-[#edf1eb] grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#17201c] mb-1.5">
                          Owner / Manager Name
                        </label>
                        <input
                          type="text"
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          placeholder="e.g. Alex Nguyen"
                          className="w-full rounded-2xl border border-[#d8e0d5] bg-[#fafbf9] px-3.5 py-2.5 text-xs font-medium outline-none transition focus:border-[#a8e63d]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#17201c] mb-1.5">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="0912 345 678"
                          className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-medium outline-none transition focus:ring-2 ${
                            errors.contactPhone
                              ? "border-red-400 bg-red-50/30"
                              : "border-[#d8e0d5] bg-[#fafbf9] focus:border-[#a8e63d]"
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#17201c] mb-1.5">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="owner@club.com"
                          className="w-full rounded-2xl border border-[#d8e0d5] bg-[#fafbf9] px-3.5 py-2.5 text-xs font-medium outline-none transition focus:border-[#a8e63d]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Next Step Button */}
                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep1()) setFormStep(2);
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#17201c] px-6 py-3 text-xs font-bold text-white transition hover:bg-[#2c3a32] shadow-sm active:scale-95"
                    >
                      <span>Continue to Courts & Pricing</span>
                      <ArrowRight className="h-4 w-4 text-[#a8e63d]" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Courts Setup & Pricing */}
              {formStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-extrabold text-[#17201c]">Courts & Pricing</h2>
                    <p className="text-xs text-[#78857c]">Set standard court rates, configure courts list, and select club features.</p>
                  </div>

                  {/* Pricing and Court Count Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#fafbf9] p-4 rounded-2xl border border-[#e1e7df]">
                    <div>
                      <label className="block text-xs font-bold text-[#17201c] mb-1">
                        Base Hourly Rate ($/hr) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3.5 top-3 h-4 w-4 text-[#78a72b]" />
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={price}
                          onChange={(e) => setPrice(Number(e.target.value))}
                          className="w-full rounded-xl border border-[#d8e0d5] bg-white pl-9 pr-4 py-2.5 text-sm font-bold outline-none focus:border-[#a8e63d]"
                        />
                      </div>
                      <p className="mt-1 text-[10.5px] text-[#869289]">Approx. {price * 25000}₫ / hour</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#17201c] mb-1">
                        Total Number of Courts
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={courtsCount}
                        onChange={(e) => {
                          const count = Math.max(1, Number(e.target.value));
                          setCourtsCount(count);
                        }}
                        className="w-full rounded-xl border border-[#d8e0d5] bg-white px-4 py-2.5 text-sm font-bold outline-none focus:border-[#a8e63d]"
                      />
                      <p className="mt-1 text-[10.5px] text-[#869289]">Active playable courts in venue</p>
                    </div>
                  </div>

                  {/* Individual Court List Editor */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-[#17201c]">Court Breakdown</h3>
                        <p className="text-[11px] text-[#78857c]">Customize court names and surface types for players to select.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCourt}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#f0fae1] border border-[#a8e63d]/60 px-3 py-1 text-xs font-bold text-[#456e17] hover:bg-[#e4f5cc]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Court
                      </button>
                    </div>

                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {courtsList.map((court, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 bg-[#f7f8f5] p-3 rounded-2xl border border-[#e5ebe3]"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#17201c] text-[10px] font-black text-white">
                            {index + 1}
                          </span>
                          <input
                            type="text"
                            value={court.name}
                            onChange={(e) => handleCourtChange(index, "name", e.target.value)}
                            placeholder="Court Name"
                            className="flex-1 rounded-xl border border-[#d8e0d5] bg-white px-3 py-1.5 text-xs font-semibold outline-none focus:border-[#a8e63d]"
                          />
                          <select
                            value={court.surface}
                            onChange={(e) => handleCourtChange(index, "surface", e.target.value)}
                            className="rounded-xl border border-[#d8e0d5] bg-white px-2.5 py-1.5 text-[11px] font-medium outline-none hidden sm:block"
                          >
                            <option value="Taraflex Pro Turf">Taraflex Pro Turf</option>
                            <option value="Tournament Blue Mat">Tournament Blue Mat</option>
                            <option value="Pro Wooden Floor">Pro Wooden Floor</option>
                            <option value="Standard Green Mat">Standard Green Mat</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveCourt(index)}
                            disabled={courtsList.length <= 1}
                            className="p-1.5 text-[#a8b0aa] hover:text-red-500 disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Amenities / Feature Tags Selection */}
                  <div>
                    <h3 className="text-sm font-extrabold text-[#17201c] mb-2">Club Amenities & Highlights</h3>
                    <div className="flex flex-wrap gap-2">
                      {AMENITY_TAGS.map((tag) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                              isSelected
                                ? "bg-[#17201c] text-[#a8e63d] ring-2 ring-[#a8e63d]"
                                : "bg-[#f0f3ee] text-[#5e6b62] hover:bg-[#e4eae2]"
                            }`}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5 text-[#a8e63d]" />}
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setFormStep(1)}
                      className="rounded-2xl border border-[#d8e0d5] bg-white px-5 py-2.5 text-xs font-bold text-[#556058] hover:bg-[#f5f7f3]"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep2()) setFormStep(3);
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#17201c] px-6 py-3 text-xs font-bold text-white transition hover:bg-[#2c3a32] shadow-sm active:scale-95"
                    >
                      <span>Continue to Photos & Submit</span>
                      <ArrowRight className="h-4 w-4 text-[#a8e63d]" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Description, Photos & Final Submission */}
              {formStep === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-extrabold text-[#17201c]">Photos & Description</h2>
                    <p className="text-xs text-[#78857c]">Add club cover photo and summary to publish your court.</p>
                  </div>

                  {/* Description Textarea */}
                  <div>
                    <label className="block text-xs font-bold text-[#17201c] mb-1.5">
                      Club Description
                    </label>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your badminton club facilities, lighting, parking space, coaching programs, or house rules..."
                      className="w-full rounded-2xl border border-[#d8e0d5] bg-[#fafbf9] p-3.5 text-xs sm:text-sm font-medium outline-none transition focus:border-[#a8e63d] focus:ring-2 focus:ring-[#a8e63d]/20"
                    />
                  </div>

                  {/* Photo Selection Gallery */}
                  <div>
                    <label className="block text-xs font-bold text-[#17201c] mb-2">
                      Choose Club Cover Photo
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                      {PRESET_COURT_IMAGES.map((preset) => {
                        const isSelected = image === preset.url && !customImageUrl;
                        return (
                          <div
                            key={preset.url}
                            onClick={() => {
                              setImage(preset.url);
                              setCustomImageUrl("");
                            }}
                            className={`relative h-24 rounded-2xl overflow-hidden cursor-pointer border-2 transition ${
                              isSelected
                                ? "border-[#a8e63d] ring-2 ring-[#a8e63d]"
                                : "border-transparent opacity-80 hover:opacity-100"
                            }`}
                          >
                            <img
                              src={preset.url}
                              alt={preset.label}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                              <span className="text-[10px] font-bold text-white truncate">
                                {preset.label}
                              </span>
                            </div>
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-[#a8e63d] flex items-center justify-center text-[#17201c]">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Or Custom Image URL */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#68736b] mb-1">
                        Or enter custom photo image URL:
                      </label>
                      <input
                        type="url"
                        value={customImageUrl}
                        onChange={(e) => setCustomImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full rounded-xl border border-[#d8e0d5] bg-[#fafbf9] px-3.5 py-2 text-xs font-medium outline-none focus:border-[#a8e63d]"
                      />
                    </div>
                  </div>

                  {/* Submission Action */}
                  <div className="pt-4 flex items-center justify-between border-t border-[#edf1eb]">
                    <button
                      type="button"
                      onClick={() => setFormStep(2)}
                      className="rounded-2xl border border-[#d8e0d5] bg-white px-5 py-2.5 text-xs font-bold text-[#556058] hover:bg-[#f5f7f3]"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#a8e63d] px-7 py-3 text-xs sm:text-sm font-black text-[#17201c] transition hover:bg-[#b8ef59] shadow-md active:scale-95"
                    >
                      <Sparkles className="h-4 w-4" />
                      Publish Badminton Club
                    </button>
                  </div>
                </motion.div>
              )}

            </form>
          </div>

          {/* Right Column: Live Real-Time Club Card Preview */}
          <div className="lg:col-span-4 space-y-5 sticky top-24">
            <div className="bg-white rounded-3xl border border-[#e1e7df] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#78a72b] flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 fill-[#a8e63d]" />
                  Live Preview
                </span>
                <span className="text-[10px] font-bold text-[#869289] bg-[#f0f3ee] px-2 py-0.5 rounded-full">
                  Player View
                </span>
              </div>

              {/* Preview Card Component */}
              <div className="overflow-hidden rounded-2xl border border-[#e0e6de] bg-white shadow-md">
                <div className="relative h-44 w-full bg-[#17201c]">
                  <img
                    src={customImageUrl.trim() ? customImageUrl.trim() : image}
                    alt="Club Preview"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                  <div className="absolute left-2.5 top-2.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#275310]/90 px-2.5 py-0.5 text-[9px] font-black text-white backdrop-blur-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#8dcf36] animate-pulse" />
                      Open Now
                    </span>
                  </div>

                  <div className="absolute bottom-2.5 right-2.5 rounded-full bg-[#17201c]/90 border border-white/20 px-2.5 py-0.5 text-xs font-black text-[#a8e63d] backdrop-blur-md">
                    ${price}<span className="text-[9px] font-normal text-white/80">/h</span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-base font-extrabold text-[#17201c] truncate">
                    {clubName.trim() || "Your Club Name"}
                  </h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-[#7a857e]">
                    <MapPin className="h-3.5 w-3.5 text-[#78a72b] shrink-0" />
                    <span className="truncate">{district}, Hanoi</span>
                  </p>

                  <div className="mt-2.5 flex items-center justify-between text-xs text-[#6b756e] pt-2 border-t border-[#f0f3ee]">
                    <span className="flex items-center gap-1 font-bold text-[#8f6600]">
                      <Star className="h-3.5 w-3.5 fill-[#f2bd48] text-[#f2bd48]" />
                      5.0 (New)
                    </span>
                    <span className="font-semibold">{courtsCount} courts available</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {selectedTags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#f0fae1] px-2 py-0.5 text-[9.5px] font-bold text-[#487519]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-[#fafbf9] p-3 border border-[#e5ebe3] text-[11.5px] text-[#6b756e]">
                <p className="font-bold text-[#17201c] mb-1 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#78a72b]" />
                  Verified Club Badge
                </p>
                <p>Once published, players can view your club details, reserve courts online, and book friendly matches.</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Success Modal */}
      <AnimatePresence>
        {createdVenue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-[#e1e7df] text-center"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f0fae1] text-[#78a72b] mb-4">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <h2 className="text-2xl font-black text-[#17201c]">
                Club Successfully Listed! 🎉
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#6c7870]">
                <strong className="text-[#17201c]">{createdVenue.name}</strong> is now live on BookMeBadminton! Players in {createdVenue.location} can search, view details, and book courts immediately.
              </p>

              <div className="mt-6 flex flex-col gap-2.5">
                <Link
                  href={`/courts/${createdVenue.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#a8e63d] px-5 py-3 text-xs sm:text-sm font-black text-[#17201c] shadow-sm hover:bg-[#b8ef59] transition"
                >
                  View Live Court Page
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d8e0d5] bg-white px-5 py-3 text-xs sm:text-sm font-bold text-[#17201c] hover:bg-[#f5f7f3] transition"
                >
                  Go to Main Explore Page
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
