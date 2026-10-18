"use client";

import React from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { AdminAuditLogsSection } from "@/components/admin/AdminAuditLogsSection";

export default function AdminAuditLogsPage() {
  return (
    <div>
      <AdminHeader
        title="Administrative Audit Logs"
        subtitle="Immutable security trail of administrative interventions, user status updates, booking cancellations, and setting changes."
      />
      <AdminNavigation />
      <AdminAuditLogsSection />
    </div>
  );
}
