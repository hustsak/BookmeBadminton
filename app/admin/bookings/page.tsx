"use client";

import React from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { AdminBookingsSection } from "@/components/admin/AdminBookingsSection";

export default function AdminBookingsPage() {
  return (
    <div>
      <AdminHeader
        title="Booking Operations & History"
        subtitle="Search bookings across all venues, inspect payment status, and execute administrative cancellations."
      />
      <AdminNavigation />
      <AdminBookingsSection />
    </div>
  );
}
