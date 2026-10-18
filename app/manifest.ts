import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BookMeBadminton",
    short_name: "BookMe",
    description: "Book badminton courts, join friendly matches, and connect with players across Hanoi.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f7f8f4",
    theme_color: "#17201c",
    categories: ["sports", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "Find Courts",
        short_name: "Courts",
        description: "Browse badminton venues and book real-time courts",
        url: "/",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "My Bookings",
        short_name: "Bookings",
        description: "View upcoming court reservations and check-in passes",
        url: "/bookings",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Friendly Matches",
        short_name: "Matches",
        description: "Join or host friendly badminton sparring sessions",
        url: "/friendly-matches",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
