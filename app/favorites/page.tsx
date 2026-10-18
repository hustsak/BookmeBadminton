"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Navbar } from "@/components/Navbar";
import { LoginModal } from "@/components/LoginModal";
import { useApp } from "@/context/AppContext";
import {
  Heart,
  MapPin,
  Star,
  ArrowRight,
  Trash2,
  Sparkles,
} from "lucide-react";

export default function FavoritesPage() {
  const { favorites, toggleFavorite, venues } = useApp();

  const favoritedVenues = venues.filter((venue) => favorites.includes(venue.id));

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-[#17201c] pb-20 w-full max-w-full overflow-x-hidden">
      <Navbar />
      <LoginModal />

      {/* Header */}
      <section className="mx-auto max-w-7xl px-5 pt-8 sm:px-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-[#87918a]">
            <Link href="/" className="hover:text-[#17201c]">Home</Link>
            <span>/</span>
            <span className="font-semibold text-[#17201c]">Favorites</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-[#17201c]">
            Saved Courts & Venues<span className="text-[#a8e63d]">.</span>
          </h1>
          <p className="text-sm text-[#7c867f]">
            Quickly re-book your top favorite badminton venues and courts.
          </p>
        </div>
      </section>

      {/* Favorites Content */}
      <section className="mx-auto max-w-7xl px-5 pt-8 sm:px-6">
        {favoritedVenues.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {favoritedVenues.map((venue, index) => (
              <motion.article
                key={venue.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className="group relative overflow-hidden rounded-[25px] border border-[#e0e6de] bg-white shadow-[0_7px_28px_rgba(35,55,35,.04)] transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={venue.image}
                    alt={venue.name}
                    className="h-52 w-full object-cover transition duration-700 group-hover:scale-105"
                  />

                  {/* Remove Favorite Button */}
                  <button
                    onClick={() => toggleFavorite(venue.id)}
                    aria-label="Remove favorite"
                    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110 text-[#ed7181]"
                    title="Remove from favorites"
                  >
                    <Heart className="h-4 w-4 fill-[#ed7181]" />
                  </button>

                  <div className="absolute bottom-4 left-4 flex gap-2">
                    {venue.tags.map((tag) => (
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
                        <MapPin className="h-3.5 w-3.5" />
                        {venue.location}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-sm font-bold">
                      <Star className="h-4 w-4 fill-[#f2bd48] text-[#f2bd48]" />
                      {venue.rating}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#edf0eb] pt-4">
                    <div>
                      <span className="text-[11px] text-[#929c95]">From</span>
                      <p className="text-lg font-bold">
                        ${venue.price}
                        <span className="ml-1 text-xs font-normal text-[#929c95]">/ hour</span>
                      </p>
                    </div>

                    <Link
                      href={`/courts/${venue.id}`}
                      className="flex items-center gap-2 rounded-full bg-[#a8e63d] px-4 py-2.5 text-xs font-bold text-[#17201c] transition hover:bg-[#b8ef59]"
                    >
                      Book court
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-[#d8e0d6] bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fdf2f2] text-[#ed7181]">
              <Heart className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#17201c]">No favorite courts saved</h3>
            <p className="mt-1 text-xs text-[#7c867f]">
              Click the heart icon on any court card to save it for instant access.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#a8e63d] px-6 py-3 text-xs font-bold text-[#17201c] shadow-md transition hover:bg-[#b8ef59]"
            >
              Browse All Courts
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
