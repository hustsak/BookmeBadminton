"use client";

import React from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { AdminUsersSection } from "@/components/admin/AdminUsersSection";

export default function AdminUsersPage() {
  return (
    <div>
      <AdminHeader
        title="User & Account Management"
        subtitle="Manage customer, owner, and administrator accounts with suspension controls and full audit accountability."
      />
      <AdminNavigation />
      <AdminUsersSection />
    </div>
  );
}
