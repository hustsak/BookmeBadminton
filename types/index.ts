export type UserRole = "CUSTOMER" | "OWNER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";

export type User = {
  id: number;
  name: string;
  email: string;
  avatar: string;
  role?: UserRole;
  phone?: string;
};

export type BookingStatus = "CONFIRMED" | "COMPLETED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type Booking = {
  id: string;
  dbId?: number;
  venueId: number;
  venueName: string;
  venueImage: string;
  courtName: string;
  location: string;
  date: string;
  timeSlot: string;
  duration: number;
  totalPrice: number;
  status: BookingStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: string;
  qrCode: string;
  courtId?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
};

export type FriendlyMatchPlayer = {
  id: number | string;
  name: string;
  avatar: string;
  joinedAt: string;
};

export type FriendlyMatchLevel = "All Levels" | "Beginner" | "Intermediate" | "Advanced";
export type FriendlyMatchFormat = "Doubles" | "Singles";
export type FriendlyMatchStatus = "OPEN" | "FULL" | "COMPLETED" | "CANCELLED";

export type FriendlyMatch = {
  id: string;
  title: string;
  venueId?: number;
  venueName: string;
  location: string;
  courtId?: number;
  courtName?: string;
  bookingId?: number;
  bookingCode?: string;
  bookingStatus?: string;
  date: string;
  time: string;
  level: FriendlyMatchLevel;
  format: FriendlyMatchFormat;
  totalSlots: number;
  feePerPerson: number;
  description: string;
  shuttlecockProvided: boolean;
  host: {
    id: number | string;
    name: string;
    avatar: string;
    contact?: string;
  };
  joinedPlayers: FriendlyMatchPlayer[];
  status: FriendlyMatchStatus;
  createdAt: string;
};

export type CourtItem = {
  id: number;
  name: string;
  priceHour: number;
  image?: string;
  surface?: string;
};

export type ClubVenue = {
  id: number;
  name: string;
  location: string;
  district?: string;
  city?: string;
  address?: string;
  rating: number;
  reviews: number;
  price: number;
  courts: number;
  image: string;
  available: boolean;
  tags: string[];
  description: string;
  contactPhone?: string;
  contactEmail?: string;
  ownerName?: string;
  ownerId?: number | string;
  openingHours?: string;
  courtsList?: CourtItem[];
  createdAt?: string;
};
