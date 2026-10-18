"use client";

import React from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { AdminModerationSection } from "@/components/admin/AdminModerationSection";

export default function AdminModerationPage() {
  return (
    <div>
      <AdminHeader
        title="Content Moderation & Match Oversight"
        subtitle="Review reported player feedback, resolve complaints, and monitor active and completed badminton games."
      />
      <AdminNavigation />
      <AdminModerationSection />
    </div>
  );
}
