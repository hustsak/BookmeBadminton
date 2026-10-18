"use client";

import React from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { AdminVenuesSection } from "@/components/admin/AdminVenuesSection";

export default function AdminVenuesPage() {
  return (
    <div>
      <AdminHeader
        title="Venue & Court Administration"
        subtitle="Configure badminton facilities, pricing, operating schedules, and activate/deactivate courts safely."
      />
      <AdminNavigation />
      <AdminVenuesSection />
    </div>
  );
}
