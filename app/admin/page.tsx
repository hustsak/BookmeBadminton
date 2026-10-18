"use client";

import React from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { AdminOverviewSection } from "@/components/admin/AdminOverviewSection";

export default function AdminOverviewPage() {
  return (
    <div>
      <AdminHeader
        title="Platform Overview & Analytics"
        subtitle="Real database metrics across verified bookings, payments, clubs, users, and court utilization."
      />
      <AdminNavigation />
      <AdminOverviewSection />
    </div>
  );
}
