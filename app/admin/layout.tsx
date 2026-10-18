import React from "react";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "Admin Dashboard | BookMeBadminton",
  description: "Platform Administration, Venues, Users, Bookings, Moderation, and Settings.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f8f4] text-[#17201c]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
