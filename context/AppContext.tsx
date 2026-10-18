"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type {
  User,
  UserRole,
  UserStatus,
  Booking,
  BookingStatus,
  PaymentStatus,
  FriendlyMatchPlayer,
  FriendlyMatch,
  FriendlyMatchLevel,
  FriendlyMatchFormat,
  FriendlyMatchStatus,
  CourtItem,
  ClubVenue,
} from "@/types";

import type {
  User,
  Booking,
  FriendlyMatchPlayer,
  FriendlyMatch,
  CourtItem,
  ClubVenue,
} from "@/types";

type AppContextType = {
  user: User | null;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  login: (email?: string, name?: string, role?: "CUSTOMER" | "OWNER" | "ADMIN", id?: number) => void;
  logout: () => void;
  switchUserRole: (role: "CUSTOMER" | "OWNER") => void;
  favorites: number[];
  favoritesLoading: boolean;
  refreshFavorites: (activeUserId?: number) => Promise<void>;
  toggleFavorite: (venueId: number) => Promise<void> | void;
  isFavorite: (venueId: number) => boolean;
  venues: ClubVenue[];
  refreshVenues: () => Promise<void>;
  addClub: (data: Omit<ClubVenue, "id" | "rating" | "reviews" | "available">) => ClubVenue;
  deleteClub: (venueId: number) => void;
  getVenueById: (venueId: number | string) => ClubVenue | undefined;
  bookings: Booking[];
  refreshBookings: () => Promise<void>;
  addBooking: (booking: Omit<Booking, "id" | "status" | "qrCode">) => Booking;
  cancelBooking: (bookingId: string) => Promise<void>;
  friendlyMatches: FriendlyMatch[];
  refreshMatches: () => Promise<void>;
  createFriendlyMatch: (data: {
    title: string;
    venueName: string;
    location: string;
    venueId?: number;
    courtId?: number;
    bookingId?: number;
    date: string;
    time: string;
    level: "All Levels" | "Beginner" | "Intermediate" | "Advanced";
    format: "Doubles" | "Singles";
    totalSlots?: number;
    feePerPerson: number;
    description: string;
    shuttlecockProvided: boolean;
  }) => FriendlyMatch;
  joinFriendlyMatch: (matchId: string) => Promise<{ success: boolean; message: string }>;
  leaveFriendlyMatch: (matchId: string) => Promise<{ success: boolean; message: string }>;
  removeFriendlyMatchParticipant: (
    matchId: string,
    targetUserId: number,
    reason?: string
  ) => Promise<{ success: boolean; message: string }>;
  deleteFriendlyMatch: (matchId: string) => Promise<{ success: boolean; message: string }>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEMO_USER: User = {
  id: 1,
  name: "Alex Nguyen",
  email: "alex.nguyen@example.com",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
};

const INITIAL_BOOKINGS: Booking[] = [
  {
    id: "BK-8921",
    venueId: 1,
    venueName: "Smash Arena",
    venueImage: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1000&q=85",
    courtName: "Court 01 (VIP Wood)",
    location: "Thanh Xuan, Hanoi",
    date: "2026-10-05",
    timeSlot: "18:00 - 20:00",
    duration: 2,
    totalPrice: 12,
    status: "CONFIRMED",
    qrCode: "BK8921-SMASH-COURT01",
  },
  {
    id: "BK-7412",
    venueId: 2,
    venueName: "Victory Badminton Club",
    venueImage: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1000&q=85",
    courtName: "Court 03",
    location: "Cau Giay, Hanoi",
    date: "2026-09-28",
    timeSlot: "14:00 - 15:00",
    duration: 1,
    totalPrice: 5,
    status: "COMPLETED",
    qrCode: "BK7412-VIC-COURT03",
  },
];

const INITIAL_FRIENDLY_MATCHES: FriendlyMatch[] = [
  {
    id: "MATCH-101",
    title: "Weekend Doubles Sparring (Need 1 Player!)",
    venueId: 1,
    venueName: "Smash Arena",
    location: "Thanh Xuan, Hanoi",
    courtName: "Court 02",
    date: "2026-10-06",
    time: "18:00 - 20:00",
    level: "Intermediate",
    format: "Doubles",
    totalSlots: 4,
    feePerPerson: 3,
    description:
      "Looking for 1 more friendly player to join our 2-hour doubles sparring. We play for fun, good rallies and friendly competition. High quality feather shuttles provided!",
    shuttlecockProvided: true,
    host: {
      id: 99,
      name: "Minh Duc",
      avatar:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
      contact: "0912 345 678",
    },
    joinedPlayers: [
      {
        id: 99,
        name: "Minh Duc (Host)",
        avatar:
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
        joinedAt: "2026-10-02 09:30",
      },
      {
        id: 102,
        name: "Hai Dang",
        avatar:
          "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80",
        joinedAt: "2026-10-02 10:15",
      },
      {
        id: 103,
        name: "Thao My",
        avatar:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
        joinedAt: "2026-10-02 11:00",
      },
    ],
    status: "OPEN",
    createdAt: "2026-10-02",
  },
  {
    id: "MATCH-102",
    title: "Beginner / Casual Singles Sparring & Drills",
    venueId: 2,
    venueName: "Victory Badminton Club",
    location: "Cau Giay, Hanoi",
    courtName: "Court 05",
    date: "2026-10-07",
    time: "19:00 - 20:30",
    level: "Beginner",
    format: "Singles",
    totalSlots: 2,
    feePerPerson: 4,
    description:
      "New to badminton or working on basic footwork & clears? Let's do some rally drills followed by a friendly singles match. Split court fee 50/50.",
    shuttlecockProvided: false,
    host: {
      id: 88,
      name: "Sarah Jenkins",
      avatar:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80",
      contact: "sarah.j@example.com",
    },
    joinedPlayers: [
      {
        id: 88,
        name: "Sarah Jenkins (Host)",
        avatar:
          "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80",
        joinedAt: "2026-10-02 12:00",
      },
    ],
    status: "OPEN",
    createdAt: "2026-10-02",
  },
  {
    id: "MATCH-103",
    title: "High Intensity Advanced Doubles Smash Session",
    venueId: 3,
    venueName: "Pro Court",
    location: "Dong Da, Hanoi",
    courtName: "Court 01 (Championship)",
    date: "2026-10-08",
    time: "20:00 - 22:00",
    level: "Advanced",
    format: "Doubles",
    totalSlots: 4,
    feePerPerson: 5,
    description:
      "Looking for fast-paced players who can handle steep smashes, aggressive drives, and quick net interceptions. Bring your A-game!",
    shuttlecockProvided: true,
    host: {
      id: 77,
      name: "Tuan Anh",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      contact: "0988 777 999",
    },
    joinedPlayers: [
      {
        id: 77,
        name: "Tuan Anh (Host)",
        avatar:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
        joinedAt: "2026-10-01 15:00",
      },
      {
        id: 104,
        name: "Bao Long",
        avatar:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
        joinedAt: "2026-10-01 16:30",
      },
    ],
    status: "OPEN",
    createdAt: "2026-10-01",
  },
  {
    id: "MATCH-104",
    title: "Early Bird Morning Doubles Routine",
    venueId: 4,
    venueName: "Green Shuttle",
    location: "Thanh Xuan, Hanoi",
    courtName: "Court 03",
    date: "2026-10-06",
    time: "06:30 - 08:00",
    level: "All Levels",
    format: "Doubles",
    totalSlots: 4,
    feePerPerson: 2,
    description:
      "Start the day energized! Warm up stretches then casual doubles games before going to work. All filled up for this Tuesday.",
    shuttlecockProvided: true,
    host: {
      id: 66,
      name: "Kim Chi",
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    },
    joinedPlayers: [
      {
        id: 66,
        name: "Kim Chi",
        avatar:
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
        joinedAt: "2026-10-01",
      },
      {
        id: 105,
        name: "Hoang Nam",
        avatar:
          "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80",
        joinedAt: "2026-10-01",
      },
      {
        id: 106,
        name: "Lan Huong",
        avatar:
          "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80",
        joinedAt: "2026-10-01",
      },
      {
        id: 107,
        name: "Quoc Viet",
        avatar:
          "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
        joinedAt: "2026-10-01",
      },
    ],
    status: "FULL",
    createdAt: "2026-10-01",
  },
];

export const INITIAL_VENUES: ClubVenue[] = [
  {
    id: 1,
    name: "Smash Arena",
    location: "Thanh Xuan, Hanoi",
    district: "Thanh Xuan",
    city: "Hanoi",
    address: "125 Nguyen Trai, Thanh Xuan, Hanoi",
    rating: 4.9,
    reviews: 128,
    price: 6,
    courts: 8,
    image: "/court_image/c1.jpeg",
    available: true,
    tags: ["Premium", "Air-conditioned", "Owner Verified"],
    description: "Premium badminton venue with professional courts, clean facilities, LED lighting, and a comfortable player-first environment.",
    contactPhone: "0912 345 678",
    contactEmail: "smash.arena@badminton.com",
    openingHours: "06:00 - 23:00",
    ownerName: "Smash Sports Club",
    courtsList: [
      { id: 1, name: "Court 01 (VIP Wood)", priceHour: 100000, image: "/court_image/c1.jpeg", surface: "Taraflex Pro Turf" },
      { id: 2, name: "Court 02", priceHour: 100000, image: "/court_image/c2.jpeg", surface: "Tournament Blue Mat" },
      { id: 3, name: "Court 03", priceHour: 120000, image: "/court_image/c3.jpeg", surface: "Center Court Stadium" },
      { id: 4, name: "Court 04", priceHour: 120000, image: "/court_image/c4.jpg", surface: "Training Arena" },
    ],
  },
  {
    id: 2,
    name: "Victory Badminton Club",
    location: "Cau Giay, Hanoi",
    district: "Cau Giay",
    city: "Hanoi",
    address: "88 Xuan Thuy, Cau Giay, Hanoi",
    rating: 4.8,
    reviews: 96,
    price: 5,
    courts: 6,
    image: "/court_image/c2.jpeg",
    available: true,
    tags: ["Popular", "Parking", "Air-conditioned"],
    description: "Spacious badminton club designed for casual games, training sessions, and competitive players.",
    contactPhone: "0988 123 456",
    contactEmail: "contact@victoryclub.vn",
    openingHours: "06:30 - 22:30",
    ownerName: "Victory Club Owner",
    courtsList: [
      { id: 5, name: "Court 01", priceHour: 110000, image: "/court_image/c2.jpeg", surface: "Taraflex Mat" },
      { id: 6, name: "Court 02", priceHour: 110000, image: "/court_image/c5.webp", surface: "Pro Wooden Floor" },
      { id: 7, name: "Court 03", priceHour: 130000, image: "/court_image/c6.webp", surface: "Tournament Arena" },
    ],
  },
  {
    id: 3,
    name: "Pro Court",
    location: "Dong Da, Hanoi",
    district: "Dong Da",
    city: "Hanoi",
    address: "45 Chua Boc, Dong Da, Hanoi",
    rating: 4.7,
    reviews: 84,
    price: 7,
    courts: 10,
    image: "/court_image/c3.jpeg",
    available: true,
    tags: ["Professional", "Premium", "Shower"],
    description: "Professional-grade badminton facility with high-quality BWF approved flooring and tournament-ready courts.",
    contactPhone: "0904 555 777",
    contactEmail: "booking@procourt.com",
    openingHours: "06:00 - 23:00",
    ownerName: "Pro Sports Center",
    courtsList: [
      { id: 8, name: "Court 01", priceHour: 130000, image: "/court_image/c3.jpeg", surface: "Tournament Green" },
      { id: 9, name: "Court 02", priceHour: 130000, image: "/court_image/c1.jpeg", surface: "Taraflex Pro" },
      { id: 10, name: "Court 03", priceHour: 150000, image: "/court_image/c4.jpg", surface: "Olympic Standard" },
    ],
  },
  {
    id: 4,
    name: "Green Shuttle",
    location: "Thanh Xuan, Hanoi",
    district: "Thanh Xuan",
    city: "Hanoi",
    address: "209 Khuong Trung, Thanh Xuan, Hanoi",
    rating: 4.6,
    reviews: 72,
    price: 4,
    courts: 5,
    image: "/court_image/c4.jpg",
    available: false,
    tags: ["Affordable", "Parking"],
    description: "Cozy neighborhood badminton venue with friendly vibes, budget pricing, and clean facilities.",
    contactPhone: "0977 888 999",
    contactEmail: "greenshuttle@gmail.com",
    openingHours: "07:00 - 22:00",
    ownerName: "Green Shuttle Management",
    courtsList: [
      { id: 11, name: "Court 01", priceHour: 80000, image: "/court_image/c4.jpg", surface: "Standard Green" },
      { id: 12, name: "Court 02", priceHour: 80000, image: "/court_image/c1.jpeg", surface: "Standard Green" },
    ],
  },
  {
    id: 5,
    name: "Ace Sports Center",
    location: "Cau Giay, Hanoi",
    district: "Cau Giay",
    city: "Hanoi",
    address: "15 Duy Tan, Cau Giay, Hanoi",
    rating: 4.9,
    reviews: 156,
    price: 8,
    courts: 12,
    image: "/court_image/c5.webp",
    available: true,
    tags: ["Premium", "Professional", "Pro Shop"],
    description: "State-of-the-art sports complex featuring 12 badminton courts, on-site stringing shop, and player cafe.",
    contactPhone: "0911 222 333",
    contactEmail: "info@acesports.vn",
    openingHours: "05:30 - 23:30",
    ownerName: "Ace Group",
    courtsList: [
      { id: 13, name: "Court 01", priceHour: 160000, image: "/court_image/c5.webp", surface: "BWF Certified Mat" },
      { id: 14, name: "Court 02", priceHour: 160000, image: "/court_image/c3.jpeg", surface: "BWF Certified Mat" },
    ],
  },
  {
    id: 6,
    name: "Shuttle House",
    location: "Dong Da, Hanoi",
    district: "Dong Da",
    city: "Hanoi",
    address: "102 Truong Chinh, Dong Da, Hanoi",
    rating: 4.5,
    reviews: 54,
    price: 5,
    courts: 4,
    image: "/court_image/c6.webp",
    available: true,
    tags: ["Affordable", "Parking"],
    description: "Great value badminton club in central Dong Da with high ceiling, bright LED lights, and court reservation.",
    contactPhone: "0936 444 555",
    contactEmail: "shuttlehouse@badminton.vn",
    openingHours: "06:00 - 22:00",
    ownerName: "Shuttle House Club",
    courtsList: [
      { id: 15, name: "Court 01", priceHour: 100000, image: "/court_image/c6.webp", surface: "Standard Mat" },
      { id: 16, name: "Court 02", priceHour: 100000, image: "/court_image/c2.jpeg", surface: "Standard Mat" },
    ],
  },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [venues, setVenues] = useState<ClubVenue[]>(INITIAL_VENUES);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [friendlyMatches, setFriendlyMatches] = useState<FriendlyMatch[]>(INITIAL_FRIENDLY_MATCHES);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("bm_user");
      if (savedUser) setUser(JSON.parse(savedUser));

      const savedFavs = localStorage.getItem("bm_favorites");
      if (savedFavs) {
        const parsed = JSON.parse(savedFavs);
        if (Array.isArray(parsed)) setFavorites(parsed);
      }

      const savedVenues = localStorage.getItem("bm_venues");
      if (savedVenues) setVenues(JSON.parse(savedVenues));

      const savedBookings = localStorage.getItem("bm_bookings");
      if (savedBookings) setBookings(JSON.parse(savedBookings));

      const savedMatches = localStorage.getItem("bm_friendly_matches");
      if (savedMatches) setFriendlyMatches(JSON.parse(savedMatches));
    } catch (e) {
      console.error("Failed to load state from localStorage", e);
    }
  }, []);

  // Save changes to localStorage and sync cookie
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem("bm_user", JSON.stringify(user));
        document.cookie = `bookme_user_id=${user.id}; path=/; SameSite=Lax; max-age=2592000`;
      } else {
        localStorage.removeItem("bm_user");
        document.cookie = `bookme_user_id=; path=/; max-age=0`;
      }
    } catch (e) { }
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem("bm_favorites", JSON.stringify(favorites));
    } catch (e) { }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem("bm_bookings", JSON.stringify(bookings));
    } catch (e) { }
  }, [bookings]);

  useEffect(() => {
    try {
      localStorage.setItem("bm_venues", JSON.stringify(venues));
    } catch (e) { }
  }, [venues]);

  useEffect(() => {
    try {
      localStorage.setItem("bm_friendly_matches", JSON.stringify(friendlyMatches));
    } catch (e) { }
  }, [friendlyMatches]);

  const refreshVenues = async () => {
    try {
      const res = await fetch("/api/venues");
      const data = await res.json();
      if (data.success && Array.isArray(data.venues) && data.venues.length > 0) {
        const dbVenues: ClubVenue[] = data.venues.map((v: any) => ({
          id: v.id,
          name: v.name,
          location: v.location,
          address: v.address || v.location,
          rating: v.rating || 4.8,
          reviews: v.reviewCount || 100,
          price: Math.round((v.courts?.[0]?.priceHour || 100000) / 20000),
          courts: v.courts?.length || 4,
          image: v.imageUrl || "/court_image/c1.jpeg",
          available: true,
          tags: ["Premium", "Air-conditioned", "Owner Verified"],
          description: v.description || "Premium badminton venue with professional courts.",
          contactPhone: "0912 345 678",
          contactEmail: v.owner?.email || "contact@badminton.vn",
          openingHours: `${v.openTime || "06:00"} - ${v.closeTime || "23:00"}`,
          ownerName: v.owner?.name || "Venue Management",
          ownerId: v.ownerId,
          courtsList: v.courts?.map((c: any) => ({
            id: c.id,
            name: c.name,
            priceHour: c.priceHour,
            image: v.imageUrl || "/court_image/c1.jpeg",
            surface: c.surface || "Taraflex Pro Turf",
          })),
        }));

        setVenues(dbVenues);
      }
    } catch (e) {
      console.warn("Could not fetch database venues, using cache/fallback:", e);
    }
  };

  const refreshBookings = async () => {
    try {
      const url = user?.id ? `/api/bookings?userId=${user.id}` : "/api/bookings";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.bookings)) {
        const apiBookings: Booking[] = data.bookings.map((b: any) => ({
          id: b.bookingCode || `BK-${b.id}`,
          dbId: b.id,
          venueId: b.court.venue.id,
          venueName: b.court.venue.name,
          venueImage: b.court.venue.imageUrl || "/court_image/c1.jpeg",
          courtName: b.court.name,
          location: b.court.venue.address || b.court.venue.location,
          date: b.bookingDate ? b.bookingDate.slice(0, 10) : "",
          timeSlot: `${b.startTime} - ${b.endTime || ""}`,
          duration: b.duration,
          totalPrice: b.totalPrice,
          status: b.status,
          paymentStatus: b.paymentStatus,
          paymentMethod: b.paymentMethod,
          qrCode: b.bookingCode || `BK-${b.id}`,
          courtId: b.courtId,
          customerName: b.customerName || b.user?.name,
          customerEmail: b.customerEmail || b.user?.email,
          customerPhone: b.customerPhone || b.user?.phone,
        }));

        setBookings(apiBookings);
      }
    } catch (e) {
      console.warn("Could not fetch database bookings, using cache/fallback:", e);
    }
  };

  const refreshMatches = async () => {
    try {
      const res = await fetch("/api/matches");
      const data = await res.json();
      if (data.success && Array.isArray(data.matches)) {
        const mapped: FriendlyMatch[] = data.matches.map((m: any) => ({
          id: String(m.id),
          title: m.title,
          venueId: m.venueId,
          venueName: m.venue?.name || "Badminton Venue",
          location: m.venue?.address || m.venue?.location || "Hanoi",
          courtId: m.courtId || undefined,
          courtName: m.court?.name || undefined,
          bookingId: m.bookingId || undefined,
          bookingCode: m.booking?.bookingCode || undefined,
          bookingStatus: m.booking?.status || undefined,
          date: m.date ? m.date.slice(0, 10) : "",
          time: `${m.startTime} - ${m.endTime}`,
          level: (m.skillLevelFormatted || "All Levels") as "All Levels" | "Beginner" | "Intermediate" | "Advanced",
          format: (m.format || (m.maxPlayers === 2 ? "Singles" : "Doubles")) as "Doubles" | "Singles",
          totalSlots: m.maxPlayers,
          feePerPerson: m.feePerPerson || 0,
          description: m.description || "",
          shuttlecockProvided: m.shuttlecockProvided ?? true,
          host: {
            id: m.creatorId,
            name: m.creator?.name || "Host Player",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
            contact: m.creator?.email || m.creator?.phone || "",
          },
          joinedPlayers: (m.participants || [])
            .filter((p: any) => p.status === "JOINED")
            .map((p: any) => ({
              id: p.userId,
              name: p.role === "HOST" ? `${p.user?.name || "Player"} (Host)` : (p.user?.name || "Player"),
              avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
              joinedAt: p.joinedAt ? p.joinedAt.slice(0, 16).replace("T", " ") : "",
            })),
          status: m.status,
          createdAt: m.createdAt ? m.createdAt.slice(0, 10) : "",
        }));

        if (mapped.length > 0) {
          setFriendlyMatches(mapped);
        }
      }
    } catch (e) {
      console.warn("Could not fetch database matches, using cache/fallback:", e);
    }
  };

  const refreshFavorites = useCallback(async (activeUserId?: number) => {
    const targetUserId = activeUserId ?? user?.id;
    if (!targetUserId) {
      return;
    }
    setFavoritesLoading(true);
    try {
      const res = await fetch("/api/favorites", {
        headers: { "x-user-id": String(targetUserId) },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.venueIds)) {
          setFavorites(data.venueIds);
          try {
            localStorage.setItem("bm_favorites", JSON.stringify(data.venueIds));
          } catch {}
        }
      }
    } catch (e) {
      console.warn("Could not fetch server favorites, using cache:", e);
    } finally {
      setFavoritesLoading(false);
    }
  }, [user?.id]);

  // Sync on mount and user change
  useEffect(() => {
    refreshVenues();
    refreshBookings();
    refreshMatches();
  }, []);

  useEffect(() => {
    if (user?.id) {
      refreshFavorites(user.id);
      refreshBookings();
    } else {
      // User logged out
      setFavorites([]);
      try {
        localStorage.removeItem("bm_favorites");
      } catch {}
    }
  }, [user?.id, refreshFavorites]);

  const addClub = (
    data: Omit<ClubVenue, "id" | "rating" | "reviews" | "available">
  ): ClubVenue => {
    const newId = venues.length > 0 ? Math.max(...venues.map((v) => v.id)) + 1 : 1;
    const activeUser = user || DEMO_USER;

    const defaultCourtsList: CourtItem[] =
      data.courtsList && data.courtsList.length > 0
        ? data.courtsList
        : Array.from({ length: data.courts || 4 }, (_, i) => ({
            id: newId * 100 + i + 1,
            name: `Court ${String(i + 1).padStart(2, "0")}`,
            priceHour: Math.round((data.price || 6) * 20000),
            image: data.image || "/court_image/c1.jpeg",
            surface: "Taraflex Pro Tournament Mat",
          }));

    const newVenue: ClubVenue = {
      ...data,
      id: newId,
      rating: 5.0,
      reviews: 1,
      available: true,
      ownerId: activeUser.id,
      ownerName: data.ownerName || activeUser.name,
      courtsList: defaultCourtsList,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setVenues((prev) => [newVenue, ...prev]);
    return newVenue;
  };

  const deleteClub = (venueId: number) => {
    setVenues((prev) => prev.filter((v) => v.id !== venueId));
  };

  const getVenueById = (venueId: number | string): ClubVenue | undefined => {
    const numericId = Number(venueId);
    // Direct match
    let found = venues.find((v) => v.id === numericId);
    if (found) return found;

    // Legacy mock ID mapping to DB venues: 1 -> Smash Arena (id 4), 2 -> Victory (id 5), 3 -> Pro Court (id 6)
    if (numericId === 1) found = venues.find((v) => v.name.includes("Smash"));
    else if (numericId === 2) found = venues.find((v) => v.name.includes("Victory"));
    else if (numericId === 3) found = venues.find((v) => v.name.includes("Pro Court"));
    else if (numericId === 4) found = venues.find((v) => v.name.includes("Green Shuttle"));
    else if (numericId === 5) found = venues.find((v) => v.name.includes("Ace Sports"));
    else if (numericId === 6) found = venues.find((v) => v.name.includes("Shuttle House"));

    return found || venues[0];
  };

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  const login = (
    email?: string,
    name?: string,
    role?: "CUSTOMER" | "OWNER" | "ADMIN",
    id?: number
  ) => {
    const userName = name || (email ? email.split("@")[0] : DEMO_USER.name);
    const resolvedRole = role || (email?.includes("owner") ? "OWNER" : "CUSTOMER");
    let resolvedId = id || DEMO_USER.id;
    if (!id && resolvedRole === "OWNER") {
      resolvedId = 5;
    }
    const loggedInUser: User = {
      ...DEMO_USER,
      id: resolvedId,
      email: email || DEMO_USER.email,
      name: userName,
      role: resolvedRole,
    };
    setUser(loggedInUser);
    setIsLoginModalOpen(false);
  };

  const switchUserRole = (role: "CUSTOMER" | "OWNER") => {
    if (role === "OWNER") {
      setUser({
        id: 5,
        name: "Smash Management",
        email: "owner1@bookme.test",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
        role: "OWNER",
        phone: "0912 345 678",
      });
    } else {
      setUser({
        ...DEMO_USER,
        role: "CUSTOMER",
      });
    }
  };

  const logout = () => {
    setUser(null);
    setFavorites([]);
    try {
      localStorage.removeItem("bm_favorites");
    } catch {}
  };

  const toggleFavorite = async (venueId: number) => {
    if (!user) {
      openLoginModal();
      return;
    }

    const prevFavorites = [...favorites];
    const isCurrentlyFav = prevFavorites.includes(venueId);
    const newFavorites = isCurrentlyFav
      ? prevFavorites.filter((id) => id !== venueId)
      : [...prevFavorites, venueId];

    // Optimistic UI update
    setFavorites(newFavorites);
    try {
      localStorage.setItem("bm_favorites", JSON.stringify(newFavorites));
    } catch {}

    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id),
        },
        body: JSON.stringify({
          userId: user.id,
          venueId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        // Rollback optimistic update on server error
        setFavorites(prevFavorites);
        try {
          localStorage.setItem("bm_favorites", JSON.stringify(prevFavorites));
        } catch {}
      } else if (typeof data.isFavorite === "boolean") {
        setFavorites((current) => {
          const has = current.includes(venueId);
          if (data.isFavorite && !has) return [...current, venueId];
          if (!data.isFavorite && has) return current.filter((id) => id !== venueId);
          return current;
        });
      }
    } catch (err) {
      // Rollback on network error
      setFavorites(prevFavorites);
      try {
        localStorage.setItem("bm_favorites", JSON.stringify(prevFavorites));
      } catch {}
    }
  };

  const isFavorite = (venueId: number) => favorites.includes(venueId);

  const addBooking = (newBookingData: Omit<Booking, "id" | "status" | "qrCode">): Booking => {
    const id = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBooking: Booking = {
      ...newBookingData,
      id,
      status: "CONFIRMED",
      qrCode: `${id}-${newBookingData.venueName.substring(0, 4).toUpperCase()}`,
    };
    setBookings((prev) => [newBooking, ...prev]);
    return newBooking;
  };

  const cancelBooking = async (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: "CANCELLED" } : b))
    );

    const target = bookings.find((b) => b.id === bookingId);
    const dbId = target?.dbId || (parseInt(bookingId.replace(/\D/g, ""), 10));

    if (dbId && !isNaN(dbId)) {
      try {
        await fetch(`/api/bookings/${dbId}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.id, reason: "Customer requested cancellation" }),
        });
      } catch (e) {
        console.warn("Could not cancel on server:", e);
      }
    }
  };

  const createFriendlyMatch = (data: {
    title: string;
    venueName: string;
    location: string;
    venueId?: number;
    courtId?: number;
    bookingId?: number;
    date: string;
    time: string;
    level: "All Levels" | "Beginner" | "Intermediate" | "Advanced";
    format: "Doubles" | "Singles";
    totalSlots?: number;
    feePerPerson: number;
    description: string;
    shuttlecockProvided: boolean;
  }): FriendlyMatch => {
    const activeHost = user || DEMO_USER;
    const matchId = `MATCH-${Math.floor(100 + Math.random() * 900)}`;
    const slots = data.totalSlots || (data.format === "Singles" ? 2 : 4);

    const newMatch: FriendlyMatch = {
      ...data,
      id: matchId,
      totalSlots: slots,
      host: {
        id: activeHost.id,
        name: activeHost.name,
        avatar: activeHost.avatar,
        contact: activeHost.email,
      },
      joinedPlayers: [
        {
          id: activeHost.id,
          name: `${activeHost.name} (Host)`,
          avatar: activeHost.avatar,
          joinedAt: new Date().toISOString().split("T")[0],
        },
      ],
      status: slots <= 1 ? "FULL" : "OPEN",
      createdAt: new Date().toISOString().split("T")[0],
    };

    setFriendlyMatches((prev) => [newMatch, ...prev]);

    // Async server sync if venue exists in database
    (async () => {
      try {
        let targetVenueId = data.venueId;
        if (!targetVenueId) {
          const matchedVenue = venues.find((v) => v.name.toLowerCase().includes(data.venueName.toLowerCase()));
          targetVenueId = matchedVenue?.id || 1;
        }

        const times = data.time.split("-").map((t) => t.trim());
        const startTime = times[0]?.length === 5 ? times[0] : "18:00";
        const endTime = times[1]?.length === 5 ? times[1] : undefined;

        await fetch("/api/matches", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(activeHost.id),
          },
          body: JSON.stringify({
            title: data.title,
            venueId: targetVenueId,
            courtId: data.courtId,
            bookingId: data.bookingId,
            date: data.date,
            startTime,
            endTime,
            skillLevel: data.level,
            maxPlayers: slots,
            format: data.format,
            feePerPerson: data.feePerPerson,
            shuttlecockProvided: data.shuttlecockProvided,
            description: data.description,
          }),
        });

        await refreshMatches();
      } catch (err) {
        console.warn("Could not sync match creation to server:", err);
      }
    })();

    return newMatch;
  };

  const joinFriendlyMatch = async (matchId: string): Promise<{ success: boolean; message: string }> => {
    const currentUser = user || DEMO_USER;
    const numericId = parseInt(matchId.replace(/\D/g, ""), 10);

    // Call server API first if numeric ID
    if (!isNaN(numericId) && numericId > 0) {
      try {
        const res = await fetch(`/api/matches/${numericId}/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(currentUser.id),
          },
          body: JSON.stringify({ userId: currentUser.id }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          await refreshMatches();
          return { success: true, message: data.message || "Spot confirmed! You joined the match." };
        } else {
          return { success: false, message: data.message || "Unable to join match." };
        }
      } catch (e: any) {
        console.warn("Server join failed, falling back to local state:", e);
      }
    }

    // Local fallback
    let result = { success: false, message: "" };
    setFriendlyMatches((prev) =>
      prev.map((match) => {
        if (match.id !== matchId) return match;

        const isAlreadyJoined = match.joinedPlayers.some((p) => p.id === currentUser.id);
        if (isAlreadyJoined) {
          result = { success: false, message: "You have already joined this match!" };
          return match;
        }

        if (match.joinedPlayers.length >= match.totalSlots) {
          result = { success: false, message: "This match is already fully booked!" };
          return match;
        }

        const updatedPlayers = [
          ...match.joinedPlayers,
          {
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            joinedAt: new Date().toISOString().split("T")[0],
          },
        ];

        const isNowFull = updatedPlayers.length >= match.totalSlots;
        result = { success: true, message: "Spot confirmed! You joined the match." };

        return {
          ...match,
          joinedPlayers: updatedPlayers,
          status: isNowFull ? "FULL" : "OPEN",
        };
      })
    );

    return result;
  };

  const leaveFriendlyMatch = async (matchId: string): Promise<{ success: boolean; message: string }> => {
    const currentUser = user || DEMO_USER;
    const numericId = parseInt(matchId.replace(/\D/g, ""), 10);

    if (!isNaN(numericId) && numericId > 0) {
      try {
        const res = await fetch(`/api/matches/${numericId}/leave`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(currentUser.id),
          },
          body: JSON.stringify({ userId: currentUser.id }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          await refreshMatches();
          return { success: true, message: data.message || "You left the match." };
        } else {
          return { success: false, message: data.message || "Unable to leave match." };
        }
      } catch (e: any) {
        console.warn("Server leave failed:", e);
      }
    }

    // Local fallback
    setFriendlyMatches((prev) =>
      prev.map((match) => {
        if (match.id !== matchId) return match;
        const updatedPlayers = match.joinedPlayers.filter((p) => p.id !== currentUser.id);
        return {
          ...match,
          joinedPlayers: updatedPlayers,
          status: updatedPlayers.length < match.totalSlots ? "OPEN" : match.status,
        };
      })
    );
    return { success: true, message: "You left the match." };
  };

  const removeFriendlyMatchParticipant = async (
    matchId: string,
    targetUserId: number,
    reason?: string
  ): Promise<{ success: boolean; message: string }> => {
    const currentUser = user || DEMO_USER;
    const numericId = parseInt(matchId.replace(/\D/g, ""), 10);

    if (!isNaN(numericId) && numericId > 0) {
      try {
        const res = await fetch(`/api/matches/${numericId}/remove-player`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(currentUser.id),
          },
          body: JSON.stringify({
            userId: currentUser.id,
            targetUserId,
            reason,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          await refreshMatches();
          return {
            success: true,
            message: data.message || "Player removed from match. Spot reopened.",
          };
        } else {
          return {
            success: false,
            message: data.message || "Failed to remove player.",
          };
        }
      } catch (e: any) {
        console.warn("Server participant removal failed:", e);
      }
    }

    // Local fallback
    setFriendlyMatches((prev) =>
      prev.map((match) => {
        if (match.id !== matchId) return match;
        const updatedPlayers = match.joinedPlayers.filter((p) => p.id !== targetUserId);
        return {
          ...match,
          joinedPlayers: updatedPlayers,
          status: updatedPlayers.length < match.totalSlots ? "OPEN" : match.status,
        };
      })
    );
    return { success: true, message: "Player removed from match." };
  };

  const deleteFriendlyMatch = async (matchId: string): Promise<{ success: boolean; message: string }> => {
    const currentUser = user || DEMO_USER;
    const numericId = parseInt(matchId.replace(/\D/g, ""), 10);

    if (!isNaN(numericId) && numericId > 0) {
      try {
        const res = await fetch(`/api/matches/${numericId}/cancel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(currentUser.id),
          },
          body: JSON.stringify({ userId: currentUser.id }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          await refreshMatches();
          return { success: true, message: "Match cancelled successfully." };
        }
      } catch (e: any) {
        console.warn("Server cancel failed:", e);
      }
    }

    setFriendlyMatches((prev) => prev.filter((m) => m.id !== matchId));
    return { success: true, message: "Match removed." };
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        login,
        logout,
        favorites,
        favoritesLoading,
        refreshFavorites,
        toggleFavorite,
        isFavorite,
        venues,
        refreshVenues,
        addClub,
        deleteClub,
        getVenueById,
        bookings,
        refreshBookings,
        addBooking,
        cancelBooking,
        switchUserRole,
        friendlyMatches,
        refreshMatches,
        createFriendlyMatch,
        joinFriendlyMatch,
        leaveFriendlyMatch,
        removeFriendlyMatchParticipant,
        deleteFriendlyMatch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
