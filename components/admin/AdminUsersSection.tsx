"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  UserX,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  Trophy,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export function AdminUsersSection() {
  const { user: currentAdmin } = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  // Suspension Modal State
  const [modalUser, setModalUser] = useState<any | null>(null);
  const [actionType, setActionType] = useState<"SUSPEND" | "REACTIVATE">("SUSPEND");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (search.trim()) params.set("search", search.trim());
      if (role !== "ALL") params.set("role", role);
      if (status !== "ALL") params.set("status", status);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load users.");
      }
      setUsers(json.data.users);
      setTotalCount(json.data.totalCount);
      setTotalPages(json.data.totalPages);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error fetching users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, role, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openActionModal = (user: any, action: "SUSPEND" | "REACTIVATE") => {
    setModalUser(user);
    setActionType(action);
    setReason("");
    setActionFeedback(null);
  };

  const handleToggleStatus = async () => {
    if (!modalUser) return;
    if (!reason || reason.trim().length < 3) {
      setActionFeedback({ type: "error", message: "A valid reason (minimum 3 characters) is required." });
      return;
    }

    try {
      setIsSubmitting(true);
      setActionFeedback(null);

      const res = await fetch(`/api/admin/users/${modalUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          reason: reason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update user status.");
      }

      setActionFeedback({
        type: "success",
        message: `User ${modalUser.email} has been successfully ${actionType === "SUSPEND" ? "suspended" : "reactivated"}.`,
      });

      // Update user in local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === modalUser.id
            ? {
                ...u,
                status: actionType === "SUSPEND" ? "SUSPENDED" : "ACTIVE",
                suspensionReason: actionType === "SUSPEND" ? reason.trim() : null,
              }
            : u
        )
      );

      setTimeout(() => {
        setModalUser(null);
      }, 1500);
    } catch (err: any) {
      setActionFeedback({ type: "error", message: err.message || "Action failed." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-[#e1e7df] bg-white p-5 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7c867f]" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
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
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-[#e1e7df] bg-white px-3 py-1.5 text-xs">
            <span className="text-[#7c867f] font-medium">Role:</span>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              className="font-bold text-[#17201c] bg-transparent outline-none cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="CUSTOMER">Customers</option>
              <option value="OWNER">Venue Owners</option>
              <option value="ADMIN">Administrators</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-[#e1e7df] bg-white px-3 py-1.5 text-xs">
            <span className="text-[#7c867f] font-medium">Status:</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="font-bold text-[#17201c] bg-transparent outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="SUSPENDED">Suspended Only</option>
            </select>
          </div>

          <button
            onClick={() => {
              setPage(1);
              fetchUsers();
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

      {/* Users Table */}
      <div className="overflow-hidden rounded-3xl border border-[#e1e7df] bg-white shadow-sm">
        <div className="border-b border-[#edf1eb] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[#17201c]">Registered Platform Users</h2>
            <p className="text-[11px] text-[#7c867f]">Total of {totalCount} accounts registered</p>
          </div>
          <span className="text-xs font-bold text-[#525f57]">
            Page {page} of {totalPages}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#edf1eb] bg-[#fbfcf9] text-[11px] font-extrabold text-[#7c867f]">
                <th className="px-6 py-3">User & Contact</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Account Status</th>
                <th className="px-6 py-3">Activity</th>
                <th className="px-6 py-3">Joined Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1eb]">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#7c867f]">
                    Loading user records...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#7c867f]">
                    No users matching criteria found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrentAdmin = currentAdmin?.id === u.id;
                  const isSuspended = u.status === "SUSPENDED";

                  return (
                    <tr key={u.id} className="hover:bg-[#fbfcf9] transition">
                      <td className="px-6 py-3.5">
                        <div className="font-bold text-[#17201c]">{u.name}</div>
                        <div className="text-[11px] text-[#7c867f]">{u.email}</div>
                        {u.phone && <div className="text-[10px] text-[#525f57]">{u.phone}</div>}
                      </td>

                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                            u.role === "ADMIN"
                              ? "bg-[#17201c] text-[#a8e63d]"
                              : u.role === "OWNER"
                              ? "bg-[#eaf4ff] text-[#1d63bd]"
                              : "bg-[#f4f6f2] text-[#525f57]"
                          }`}
                        >
                          {u.role === "ADMIN" && <ShieldAlert className="h-3 w-3" />}
                          {u.role === "OWNER" && <Building2 className="h-3 w-3" />}
                          {u.role}
                        </span>
                      </td>

                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                            isSuspended
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-[#f0fae1] text-[#3e6810] border border-[#a8e63d]/50"
                          }`}
                        >
                          {isSuspended ? (
                            <>
                              <UserX className="h-3 w-3 text-red-600" />
                              SUSPENDED
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3 w-3 text-[#3e6810]" />
                              ACTIVE
                            </>
                          )}
                        </span>
                        {isSuspended && u.suspensionReason && (
                          <p className="mt-1 text-[10px] text-red-600 line-clamp-1 italic">
                            &quot;{u.suspensionReason}&quot;
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-3.5">
                        <div className="flex flex-col gap-0.5 text-[11px] text-[#525f57]">
                          <span>{u._count.bookings} bookings made</span>
                          <span>{u._count.createdMatches + u._count.matchParticipants} matches</span>
                          {u.role === "OWNER" && <span>{u._count.ownedVenues} clubs owned</span>}
                        </div>
                      </td>

                      <td className="px-6 py-3.5 text-[11px] text-[#7c867f]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        {isCurrentAdmin ? (
                          <span className="text-[10px] font-bold text-[#7c867f] italic">
                            Your Active Account
                          </span>
                        ) : isSuspended ? (
                          <button
                            onClick={() => openActionModal(u, "REACTIVATE")}
                            className="inline-flex items-center gap-1 rounded-xl border border-[#a8e63d] bg-[#f0fae1] px-3 py-1 text-xs font-bold text-[#365711] transition hover:bg-[#a8e63d] hover:text-[#17201c]"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Reactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => openActionModal(u, "SUSPEND")}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700 transition hover:bg-red-600 hover:text-white"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="border-t border-[#edf1eb] px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-[#7c867f]">
            Showing {users.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
            {Math.min(page * limit, totalCount)} of {totalCount} users
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-xl border border-[#e1e7df] px-3 py-1.5 text-xs font-bold text-[#525f57] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f8faf6]"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-xs font-bold text-[#17201c] px-2">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-xl border border-[#e1e7df] px-3 py-1.5 text-xs font-bold text-[#525f57] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f8faf6]"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Suspension / Reactivation */}
      {modalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-[#e1e7df] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#edf1eb]">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                    actionType === "SUSPEND" ? "bg-red-50 text-red-600" : "bg-[#f0fae1] text-[#365711]"
                  }`}
                >
                  {actionType === "SUSPEND" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                </div>
                <h3 className="text-sm font-extrabold text-[#17201c]">
                  {actionType === "SUSPEND" ? "Suspend User Account" : "Reactivate User Account"}
                </h3>
              </div>
              <button
                onClick={() => setModalUser(null)}
                className="rounded-full p-1 text-[#7c867f] hover:bg-[#f4f6f2] hover:text-[#17201c]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="rounded-2xl bg-[#f8faf6] border border-[#edf1eb] p-3 text-xs">
                <p className="font-bold text-[#17201c]">{modalUser.name}</p>
                <p className="text-[11px] text-[#7c867f]">{modalUser.email}</p>
                <p className="text-[10px] text-[#525f57] mt-1">Role: {modalUser.role}</p>
              </div>

              {actionType === "SUSPEND" && (
                <div className="rounded-2xl border border-red-200 bg-red-50/60 p-3 text-[11px] text-red-700">
                  <p className="font-bold">Important Notice:</p>
                  <p>
                    Suspending this account will immediately revoke access to booking courts, creating open matches, and logging in.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#17201c] mb-1">
                  Reason for {actionType === "SUSPEND" ? "Suspension" : "Reactivation"} *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this action is being taken (recorded in audit logs)..."
                  rows={3}
                  className="w-full rounded-2xl border border-[#e1e7df] p-3 text-xs text-[#17201c] placeholder:text-[#7c867f] focus:border-[#a8e63d] focus:outline-none"
                />
                <span className="text-[10px] text-[#7c867f]">Minimum 3 characters required.</span>
              </div>

              {actionFeedback && (
                <div
                  className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
                    actionFeedback.type === "success"
                      ? "bg-[#f0fae1] text-[#365711] border border-[#a8e63d]"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {actionFeedback.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{actionFeedback.message}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#edf1eb]">
              <button
                onClick={() => setModalUser(null)}
                className="rounded-2xl border border-[#e1e7df] px-4 py-2 text-xs font-bold text-[#525f57] hover:bg-[#f8faf6]"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={isSubmitting || reason.trim().length < 3}
                className={`rounded-2xl px-5 py-2 text-xs font-bold text-white transition disabled:opacity-40 disabled:cursor-not-allowed ${
                  actionType === "SUSPEND" ? "bg-red-600 hover:bg-red-700" : "bg-[#17201c] hover:bg-[#283730]"
                }`}
              >
                {isSubmitting ? "Processing..." : actionType === "SUSPEND" ? "Confirm Suspension" : "Confirm Reactivation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
