"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Trophy,
  AlertCircle,
  CheckCircle2,
  EyeOff,
  Check,
  Search,
  Filter,
  RefreshCw,
  X,
  MessageSquare,
  Calendar,
  Users,
} from "lucide-react";

export function AdminModerationSection() {
  const [activeTab, setActiveTab] = useState<"reviews" | "matches">("reviews");
  const [reports, setReports] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [reportStatus, setReportStatus] = useState("ALL");
  const [matchStatus, setMatchStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  // Resolution Modal State
  const [resolvingReport, setResolvingReport] = useState<any | null>(null);
  const [resolveAction, setResolveAction] = useState<"REVIEW_HIDDEN" | "DISMISSED">("REVIEW_HIDDEN");
  const [resolutionReason, setResolutionReason] = useState("");
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);
  const [resolveFeedback, setResolveFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      params.set("type", activeTab);

      if (activeTab === "reviews") {
        if (reportStatus !== "ALL") params.set("status", reportStatus);
      } else {
        if (matchStatus !== "ALL") params.set("status", matchStatus);
        if (search.trim()) params.set("search", search.trim());
      }

      const res = await fetch(`/api/admin/moderation?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load moderation data.");
      }

      if (activeTab === "reviews") {
        setReports(json.data.reports);
      } else {
        setMatches(json.data.matches);
      }
      setTotalCount(json.data.totalCount);
      setTotalPages(json.data.totalPages);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error fetching moderation data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, page, reportStatus, matchStatus]);

  const handleResolveSubmit = async () => {
    if (!resolvingReport) return;
    if (!resolutionReason || resolutionReason.trim().length < 3) {
      setResolveFeedback({
        type: "error",
        message: "A resolution reason (minimum 3 characters) is required.",
      });
      return;
    }

    try {
      setIsSubmittingResolve(true);
      setResolveFeedback(null);

      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: resolvingReport.id,
          action: resolveAction,
          reason: resolutionReason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to resolve report.");
      }

      setResolveFeedback({
        type: "success",
        message: `Report #${resolvingReport.id} successfully resolved with action: ${resolveAction}.`,
      });

      setReports((prev) =>
        prev.map((r) =>
          r.id === resolvingReport.id
            ? {
                ...r,
                status: "RESOLVED",
                actionTaken: resolveAction,
                resolutionNotes: resolutionReason.trim(),
              }
            : r
        )
      );

      setTimeout(() => {
        setResolvingReport(null);
      }, 1500);
    } catch (err: any) {
      setResolveFeedback({ type: "error", message: err.message || "Resolution failed." });
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Moderation Sub-Tab Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-[#e1e7df] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab("reviews");
              setPage(1);
            }}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "reviews"
                ? "bg-[#17201c] text-[#a8e63d]"
                : "border border-[#e1e7df] bg-white text-[#525f57] hover:text-[#17201c]"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Reported Reviews</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("matches");
              setPage(1);
            }}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "matches"
                ? "bg-[#17201c] text-[#a8e63d]"
                : "border border-[#e1e7df] bg-white text-[#525f57] hover:text-[#17201c]"
            }`}
          >
            <Trophy className="h-4 w-4" />
            <span>Platform Matches</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "reviews" ? (
            <div className="flex items-center gap-1.5 rounded-2xl border border-[#e1e7df] bg-white px-3 py-1.5 text-xs">
              <span className="text-[#7c867f] font-medium">Status:</span>
              <select
                value={reportStatus}
                onChange={(e) => {
                  setReportStatus(e.target.value);
                  setPage(1);
                }}
                className="font-bold text-[#17201c] bg-transparent outline-none cursor-pointer"
              >
                <option value="ALL">All Reports</option>
                <option value="PENDING">Pending Review</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-2xl border border-[#e1e7df] bg-white px-3 py-1.5 text-xs">
              <span className="text-[#7c867f] font-medium">Match Status:</span>
              <select
                value={matchStatus}
                onChange={(e) => {
                  setMatchStatus(e.target.value);
                  setPage(1);
                }}
                className="font-bold text-[#17201c] bg-transparent outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">OPEN</option>
                <option value="FULL">FULL</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          )}

          <button
            onClick={() => {
              setPage(1);
              fetchData();
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

      {/* Tab 1: Reported Reviews */}
      {activeTab === "reviews" && (
        <div className="overflow-hidden rounded-3xl border border-[#e1e7df] bg-white shadow-sm">
          <div className="border-b border-[#edf1eb] px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-[#17201c]">Reported Player Reviews</h2>
              <p className="text-[11px] text-[#7c867f]">
                {totalCount} total user feedback reports logged
              </p>
            </div>
            <span className="text-xs font-bold text-[#525f57]">
              Page {page} of {totalPages}
            </span>
          </div>

          <div className="divide-y divide-[#edf1eb]">
            {loading && reports.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#7c867f]">
                Loading moderation reports...
              </div>
            ) : reports.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#7c867f]">
                No reports found matching the criteria.
              </div>
            ) : (
              reports.map((rep) => {
                const isPending = rep.status === "PENDING";
                const review = rep.review;

                return (
                  <div key={rep.id} className="p-5 sm:p-6 space-y-3 hover:bg-[#fbfcf9] transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                            isPending
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-[#f0fae1] text-[#365711] border border-[#a8e63d]/50"
                          }`}
                        >
                          {rep.status}
                        </span>
                        <span className="text-xs font-bold text-[#17201c]">
                          Reported by {rep.reporter?.name || "Player"} ({rep.reporter?.email})
                        </span>
                      </div>
                      <span className="text-[11px] text-[#7c867f]">
                        {new Date(rep.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-[#edf1eb] bg-[#f8faf6] p-4 text-xs space-y-2">
                      <div className="flex items-center justify-between text-[#7c867f] text-[11px]">
                        <span>
                          Reviewer: <strong className="text-[#17201c]">{review?.reviewer?.name}</strong> →
                          Subject: <strong className="text-[#17201c]">{review?.recipient?.name}</strong>
                        </span>
                        {review?.match && <span>Match: {review.match.title}</span>}
                      </div>
                      {review?.comment && (
                        <p className="text-xs text-[#17201c] italic bg-white p-2.5 rounded-xl border border-[#edf1eb]">
                          &quot;{review.comment}&quot;
                        </p>
                      )}
                      <div>
                        <span className="text-[10px] font-bold uppercase text-red-600">
                          Report Reason:
                        </span>
                        <p className="text-xs text-[#17201c] mt-0.5 font-medium">{rep.reason}</p>
                      </div>
                    </div>

                    {rep.status === "RESOLVED" ? (
                      <div className="flex items-center gap-2 text-[11px] text-[#525f57]">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#54801b]" />
                        <span>
                          Resolved with action <strong className="text-[#17201c]">{rep.actionTaken}</strong> by{" "}
                          {rep.resolvedBy?.name || "Admin"}: &quot;{rep.resolutionNotes}&quot;
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => {
                            setResolvingReport(rep);
                            setResolveAction("REVIEW_HIDDEN");
                            setResolutionReason("");
                            setResolveFeedback(null);
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-[#17201c] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#283730]"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-[#a8e63d]" />
                          Resolve Report
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Platform Matches */}
      {activeTab === "matches" && (
        <div className="overflow-hidden rounded-3xl border border-[#e1e7df] bg-white shadow-sm">
          <div className="border-b border-[#edf1eb] px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-[#17201c]">Matches Moderation</h2>
              <p className="text-[11px] text-[#7c867f]">{totalCount} total scheduled matches</p>
            </div>
            <span className="text-xs font-bold text-[#525f57]">
              Page {page} of {totalPages}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#edf1eb] bg-[#fbfcf9] text-[11px] font-extrabold text-[#7c867f]">
                  <th className="px-6 py-3">Match Title & Venue</th>
                  <th className="px-6 py-3">Organizer</th>
                  <th className="px-6 py-3">Date & Time</th>
                  <th className="px-6 py-3">Format / Players</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1eb]">
                {loading && matches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-[#7c867f]">
                      Loading matches...
                    </td>
                  </tr>
                ) : matches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-[#7c867f]">
                      No matches found.
                    </td>
                  </tr>
                ) : (
                  matches.map((m) => (
                    <tr key={m.id} className="hover:bg-[#fbfcf9] transition">
                      <td className="px-6 py-3.5">
                        <span className="font-bold text-[#17201c]">{m.title}</span>
                        <div className="text-[11px] text-[#7c867f]">
                          {m.venue?.name} {m.court ? `• ${m.court.name}` : ""}
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-[#17201c]">{m.creator?.name}</div>
                        <div className="text-[10px] text-[#7c867f]">{m.creator?.email}</div>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="font-bold text-[#17201c]">
                          {new Date(m.date).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-[#525f57]">
                          {m.startTime} - {m.endTime}
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="font-semibold text-[#17201c]">
                          {m._count.participants} / {m.maxPlayers} players
                        </span>
                        <div className="text-[10px] text-[#7c867f]">{m.skillLevel}</div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                            m.status === "OPEN"
                              ? "bg-[#f0fae1] text-[#365711]"
                              : m.status === "COMPLETED"
                              ? "bg-[#17201c] text-[#a8e63d]"
                              : m.status === "FULL"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resolve Report Modal */}
      {resolvingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-[#e1e7df] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#edf1eb]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-extrabold text-[#17201c]">
                  Resolve Review Report #{resolvingReport.id}
                </h3>
              </div>
              <button
                onClick={() => setResolvingReport(null)}
                className="rounded-full p-1 text-[#7c867f] hover:bg-[#f4f6f2]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#17201c] mb-1">
                  Resolution Action *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolveAction("REVIEW_HIDDEN")}
                    className={`flex items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition ${
                      resolveAction === "REVIEW_HIDDEN"
                        ? "border-red-600 bg-red-50 text-red-700"
                        : "border-[#e1e7df] bg-white text-[#525f57]"
                    }`}
                  >
                    <EyeOff className="h-4 w-4" />
                    Hide Review
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolveAction("DISMISSED")}
                    className={`flex items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition ${
                      resolveAction === "DISMISSED"
                        ? "border-[#17201c] bg-[#17201c] text-[#a8e63d]"
                        : "border-[#e1e7df] bg-white text-[#525f57]"
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    Dismiss Report
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17201c] mb-1">
                  Resolution Reason (Recorded in audit history) *
                </label>
                <textarea
                  value={resolutionReason}
                  onChange={(e) => setResolutionReason(e.target.value)}
                  placeholder="Explain resolution findings and why this action was decided..."
                  rows={3}
                  className="w-full rounded-2xl border border-[#e1e7df] p-3 text-xs text-[#17201c] focus:border-[#a8e63d] focus:outline-none"
                />
                <span className="text-[10px] text-[#7c867f]">Minimum 3 characters required.</span>
              </div>

              {resolveFeedback && (
                <div
                  className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
                    resolveFeedback.type === "success"
                      ? "bg-[#f0fae1] text-[#365711] border border-[#a8e63d]"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {resolveFeedback.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{resolveFeedback.message}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#edf1eb]">
              <button
                onClick={() => setResolvingReport(null)}
                className="rounded-2xl border border-[#e1e7df] px-4 py-2 text-xs font-bold text-[#525f57]"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveSubmit}
                disabled={isSubmittingResolve || resolutionReason.trim().length < 3}
                className="rounded-2xl bg-[#17201c] px-5 py-2 text-xs font-bold text-white hover:bg-[#283730] disabled:opacity-40"
              >
                {isSubmittingResolve ? "Saving..." : "Confirm Resolution"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
