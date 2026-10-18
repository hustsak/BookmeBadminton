"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Navbar } from "@/components/Navbar";
import { LoginModal } from "@/components/LoginModal";
import { useApp } from "@/context/AppContext";
import {
  Heart,
  MapPin,
  Star,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  User as UserIcon,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import type { ClubVenue } from "@/types";

export default function FavoritesPage() {
  const { user, openLoginModal, favorites, toggleFavorite, venues, refreshFavorites } = useApp();
  const [serverFavorites, setServerFavorites] = useState<ClubVenue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Sync favorites directly from API on mount or when user changes
  useEffect(() => {
    let isMounted = true;

    async function loadSavedFavorites() {
      if (!user) {
        setServerFavorites([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch("/api/favorites", {
          headers: { "x-user-id": String(user.id) },
        });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.favorites)) {
          if (isMounted) {
            setServerFavorites(data.favorites);
          }
        } else if (res.status === 401) {
          if (isMounted) setServerFavorites([]);
        } else {
          if (isMounted) setLoadError(data.message || "Failed to load saved favorites.");
        }
      } catch (err) {
        console.warn("Error fetching favorites from server:", err);
        if (isMounted) setLoadError("Network error while loading favorites.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSavedFavorites();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Combine loaded server favorites with active venues from AppContext
  const displayedVenues: ClubVenue[] = (serverFavorites.length > 0 ? serverFavorites : venues).filter(
    (v) => favorites.includes(v.id)
  );

  const handleRemove = async (venueId: number) => {
    // Remove locally from serverFavorites state immediately for fluid animation
    setServerFavorites((prev) => prev.filter((v) => v.id !== venueId));
    await toggleFavorite(venueId);
  };

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-[#17201c] pb-24 w-full max-w-full overflow-x-hidden">
      <Navbar />
      <LoginModal />

      {/* Header */}
      <section className="mx-auto max-w-7xl px-5 pt-8 sm:px-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-[#87918a]">
            <Link href="/" className="hover:text-[#17201c] transition">
              Home
            </Link>
            <span>/</span>
            <span className="font-semibold text-[#17201c]">Favorites</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-[#17201c] flex items-center gap-2">
                <span>Saved Courts & Venues</span>
                <span className="text-[#a8e63d]">.</span>
                <span
                  id="favorites-page-count"
                  data-testid="favorites-page-count"
                  className="inline-flex items-center justify-center rounded-full bg-[#17201c] px-3 py-1 text-sm font-bold text-white shadow-sm"
                >
                  {favorites.length}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-[#7c867f] mt-1">
                Quickly re-book your top favorite badminton venues and courts.
              </p>
            </div>

            {user && (
              <button
                onClick={() => refreshFavorites()}
                className="flex items-center gap-1.5 rounded-full border border-[#dce3da] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#57645b] hover:bg-[#edf2ea] transition"
                title="Refresh favorites"
              >
                <RefreshCw className="h-3.5 w-3.5 text-[#6c9826]" />
                <span>Sync</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Favorites Content */}
      <section className="mx-auto max-w-7xl px-5 pt-8 sm:px-6">
        {!user ? (
          /* Unauthenticated State */
          <div className="rounded-[28px] border border-dashed border-[#d8e0d6] bg-white p-10 text-center shadow-sm max-w-lg mx-auto">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f0fae1] text-[#4b7a17]">
              <UserIcon className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-[#17201c]">Sign In to View Favorites</h2>
            <p className="mt-1.5 text-xs text-[#7c867f] max-w-sm mx-auto">
              Please sign in to access your saved favorites across devices and enjoy instant court bookings.
            </p>
            <button
              onClick={openLoginModal}
              id="favorites-login-btn"
              data-testid="favorites-login-btn"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#17201c] px-6 py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#2b3a30]"
            >
              <UserIcon className="h-4 w-4 text-[#a8e63d]" />
              <span>Log in to your account</span>
            </button>
          </div>
        ) : isLoading ? (
          /* Loading State */
          <div className="py-20 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#a8e63d] border-t-transparent" />
            <p className="mt-4 text-xs font-bold text-[#7a867e]">
              Retrieving your saved favorite courts...
            </p>
          </div>
        ) : loadError ? (
          /* Error State */
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-8 text-center max-w-md mx-auto my-8">
            <AlertCircle className="h-10 w-10 text-red-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-red-800">Unable to load favorites</h3>
            <p className="text-xs text-red-600 mt-1">{loadError}</p>
            <button
              onClick={() => refreshFavorites()}
              className="mt-4 rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        ) : displayedVenues.length > 0 ? (
          /* Populated Favorites Grid */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {displayedVenues.map((venue, index) => (
                <motion.article
                  key={venue.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-[26px] border border-[#e0e6de] bg-white shadow-[0_7px_28px_rgba(35,55,35,.04)] transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div>
                    <div className="relative overflow-hidden">
                      <img
                        src={venue.image || "/court_image/c1.jpeg"}
                        alt={venue.name}
                        className="h-52 w-full object-cover transition duration-700 group-hover:scale-105"
                      />

                      {/* Remove Favorite Button */}
                      <button
                        onClick={() => handleRemove(venue.id)}
                        id={`remove-fav-btn-${venue.id}`}
                        data-testid={`remove-fav-btn-${venue.id}`}
                        aria-label="Remove favorite"
                        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-md backdrop-blur transition hover:scale-110 active:scale-95 text-[#ed7181]"
                        title="Remove from favorites"
                      >
                        <Heart className="h-4 w-4 fill-[#ed7181]" />
                      </button>

                      <div className="absolute bottom-4 left-4 flex gap-2">
                        {(venue.tags || ["Owner Verified"]).slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/30 bg-black/40 px-3 py-1 text-[10px] font-medium text-white backdrop-blur"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-[#17201c]">{venue.name}</h3>
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#8a948d]">
                            <MapPin className="h-3.5 w-3.5 text-[#73a229] shrink-0" />
                            <span className="truncate max-w-[220px]">{venue.location}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1 text-sm font-bold shrink-0">
                          <Star className="h-4 w-4 fill-[#f2bd48] text-[#f2bd48]" />
                          <span>{venue.rating}</span>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-[#738075] line-clamp-2">
                        {venue.description || "Premium badminton club with tournament mats and LED lighting."}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <div className="flex items-center justify-between border-t border-[#edf0eb] pt-4">
                      <div>
                        <span className="text-[11px] text-[#929c95]">From</span>
                        <p className="text-lg font-extrabold text-[#17201c]">
                          ${venue.price}
                          <span className="ml-1 text-xs font-normal text-[#929c95]">/ hour</span>
                        </p>
                      </div>

                      <Link
                        href={`/courts/${venue.id}`}
                        id={`book-court-btn-${venue.id}`}
                        data-testid={`book-court-btn-${venue.id}`}
                        className="flex items-center gap-1.5 rounded-full bg-[#a8e63d] px-4 py-2.5 text-xs font-extrabold text-[#17201c] transition hover:bg-[#b8ef59] shadow-sm active:scale-95"
                      >
                        <span>Book court</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          /* Empty Favorites State - Friendly copy as specifically requested */
          <div
            id="favorites-empty-state"
            data-testid="favorites-empty-state"
            className="rounded-[28px] border border-dashed border-[#d8e0d6] bg-white p-12 text-center shadow-sm max-w-lg mx-auto"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fdf2f2] text-[#ed7181]">
              <Heart className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#17201c]">No favorites added yet</h3>
            <p className="mt-1.5 text-xs text-[#7c867f] max-w-md mx-auto leading-relaxed">
              You haven't added any favorites yet. Explore courts and save your favorites here.
            </p>
            <Link
              href="/"
              id="explore-courts-btn"
              data-testid="explore-courts-btn"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#a8e63d] px-6 py-3 text-xs font-bold text-[#17201c] shadow-md transition hover:bg-[#b8ef59] active:scale-95"
            >
              <span>Explore All Courts</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
