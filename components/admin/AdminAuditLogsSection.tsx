"use client";

import React, { useState, useEffect } from "react";
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Clock,
  User,
  Layers,
} from "lucide-react";

export function AdminAuditLogsSection() {
  const [logs, setLogs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("ALL");
  const [resourceType, setResourceType] = useState("ALL");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (search.trim()) params.set("search", search.trim());
      if (action !== "ALL") params.set("action", action);
      if (resourceType !== "ALL") params.set("resourceType", resourceType);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load audit logs.");
      }
      setLogs(json.data.logs);
      setTotalCount(json.data.totalCount);
      setTotalPages(json.data.totalPages);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error fetching audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, action, resourceType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("SUSPEND") || action.includes("CANCEL") || action.includes("DEACTIVATE")) {
      return "bg-red-50 text-red-700 border-red-200";
    }
    if (action.includes("REACTIVATE") || action.includes("ACTIVATE") || action.includes("RESOLVE")) {
      return "bg-[#f0fae1] text-[#365711] border-[#a8e63d]/60";
    }
    if (action.includes("CREATE")) {
      return "bg-[#eaf4ff] text-[#1d63bd] border-blue-200";
    }
    return "bg-[#f4f6f2] text-[#17201c] border-[#e1e7df]";
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-[#e1e7df] bg-white p-5 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7c867f]" />
            <input
              type="text"
              placeholder="Search by action, reason, details, or admin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-[#e1e7df] bg-[#f8faf6] pl-10 pr-4 py-2 text-xs font-medium text-[#17201c] placeholder:text-[#7c867f] focus:border-[#a8e63d] focus:bg-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-2xl bg-[#17201c] px-4 py-2 text-xs font-bold text-white hover:bg-[#283730]"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Action Filter */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-[#e1e7df] bg-white px-3 py-1.5 text-xs">
            <span className="text-[#7c867f] font-medium">Action:</span>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="font-bold text-[#17201c] bg-transparent outline-none cursor-pointer"
            >
              <option value="ALL">All Actions</option>
              <option value="USER_SUSPEND">USER_SUSPEND</option>
              <option value="USER_REACTIVATE">USER_REACTIVATE</option>
              <option value="VENUE_CREATE">VENUE_CREATE</option>
              <option value="VENUE_UPDATE">VENUE_UPDATE</option>
              <option value="VENUE_ACTIVATE">VENUE_ACTIVATE</option>
              <option value="VENUE_DEACTIVATE">VENUE_DEACTIVATE</option>
              <option value="COURT_CREATE">COURT_CREATE</option>
              <option value="COURT_UPDATE">COURT_UPDATE</option>
              <option value="COURT_ACTIVATE">COURT_ACTIVATE</option>
              <option value="COURT_DEACTIVATE">COURT_DEACTIVATE</option>
              <option value="BOOKING_CANCEL">BOOKING_CANCEL</option>
              <option value="REVIEW_RESOLVE">REVIEW_RESOLVE</option>
              <option value="SETTINGS_UPDATE">SETTINGS_UPDATE</option>
            </select>
          </div>

          {/* Resource Filter */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-[#e1e7df] bg-white px-3 py-1.5 text-xs">
            <span className="text-[#7c867f] font-medium">Resource:</span>
            <select
              value={resourceType}
              onChange={(e) => {
                setResourceType(e.target.value);
                setPage(1);
              }}
              className="font-bold text-[#17201c] bg-transparent outline-none cursor-pointer"
            >
              <option value="ALL">All Resources</option>
              <option value="USER">USER</option>
              <option value="VENUE">VENUE</option>
              <option value="COURT">COURT</option>
              <option value="BOOKING">BOOKING</option>
              <option value="REVIEW">REVIEW</option>
              <option value="SETTINGS">SETTINGS</option>
            </select>
          </div>

          <button
            onClick={() => {
              setPage(1);
              fetchLogs();
            }}
            disabled={loading}
            className="flex items-center gap-1 rounded-2xl border border-[#e1e7df] px-3 py-1.5 text-xs font-bold text-[#525f57] hover:bg-[#f8faf6]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-3xl border border-[#e1e7df] bg-white shadow-sm">
        <div className="border-b border-[#edf1eb] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[#17201c]">Administrative Audit Trail</h2>
            <p className="text-[11px] text-[#7c867f]">
              {totalCount} immutable operational events logged
            </p>
          </div>
          <span className="text-xs font-bold text-[#525f57]">
            Page {page} of {totalPages}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#edf1eb] bg-[#fbfcf9] text-[11px] font-extrabold text-[#7c867f]">
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Administrator</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Resource Affected</th>
                <th className="px-6 py-3">Details & Parameters</th>
                <th className="px-6 py-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1eb]">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#7c867f]">
                    Loading audit trail records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#7c867f]">
                    No audit records matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#fbfcf9] transition">
                    <td className="px-6 py-3.5 whitespace-nowrap text-[#525f57]">
                      <div className="font-bold text-[#17201c]">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-[#7c867f]">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </div>
                    </td>

                    <td className="px-6 py-3.5">
                      <div className="font-bold text-[#17201c]">{log.admin?.name || "Admin"}</div>
                      <div className="text-[10px] text-[#7c867f]">{log.admin?.email}</div>
                    </td>

                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold font-mono ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="px-6 py-3.5">
                      <span className="font-semibold text-[#17201c]">{log.resourceType}</span>
                      {log.resourceId && (
                        <span className="text-[10px] text-[#7c867f] ml-1">#{log.resourceId}</span>
                      )}
                    </td>

                    <td className="px-6 py-3.5 max-w-xs">
                      <p className="text-[11px] text-[#525f57] line-clamp-2">{log.details || "—"}</p>
                    </td>

                    <td className="px-6 py-3.5 max-w-xs">
                      <p className="text-[11px] text-[#17201c] font-medium line-clamp-2">
                        {log.reason || "—"}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="border-t border-[#edf1eb] px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-[#7c867f]">
            Showing {logs.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
            {Math.min(page * limit, totalCount)} of {totalCount} logs
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-xl border border-[#e1e7df] px-3 py-1.5 text-xs font-bold text-[#525f57] disabled:opacity-40 hover:bg-[#f8faf6]"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-xs font-bold text-[#17201c] px-2">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-xl border border-[#e1e7df] px-3 py-1.5 text-xs font-bold text-[#525f57] disabled:opacity-40 hover:bg-[#f8faf6]"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
