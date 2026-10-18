"use client";

import React from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { AdminSettingsSection } from "@/components/admin/AdminSettingsSection";

export default function AdminSettingsPage() {
  return (
    <div>
      <AdminHeader
        title="Platform Settings & Rules"
        subtitle="Manage global application parameters, operating policies, default limits, and system contacts."
      />
      <AdminNavigation />
      <AdminSettingsSection />
    </div>
  );
}
