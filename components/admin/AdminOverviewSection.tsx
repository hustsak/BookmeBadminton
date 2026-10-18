"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Building2,
  CalendarCheck,
  CalendarX,
  Trophy,
  DollarSign,
  TrendingUp,
  BarChart3,
  Clock,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

function formatVND(value: number) {
  return `${value.toLocaleString("en-US")} ₫`;
}

export function AdminOverviewSection() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [datePreset, setDatePreset] = useState<"all" | "7d" | "30d" | "custom">("30d");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      let query = "";
      if (datePreset === "7d") {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        query = `?startDate=${d.toISOString().slice(0, 10)}&endDate=${new Date().toISOString().slice(0, 10)}`;
      } else if (datePreset === "30d") {
        const d = new Date();
        d.setDate(d.getDate() - 29);
        query = `?startDate=${d.toISOString().slice(0, 10)}&endDate=${new Date().toISOString().slice(0, 10)}`;
      } else if (datePreset === "custom" && startDate && endDate) {
        query = `?startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await fetch(`/api/admin/overview${query}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load admin overview metrics.");
      }
      setData(json.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to admin analytics API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [datePreset]);

  const kpis = data?.kpis;
  const trends = data?.trends;

  return (
    <div className="space-y-6">
      {/* Date Filter & Control Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#e1e7df] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#54801b]" />
          <span className="text-xs font-bold text-[#17201c]">Filter Period:</span>
          <div className="flex gap-1.5 bg-[#f4f6f2] p-1 rounded-xl">
            <button
              onClick={() => setDatePreset("7d")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                datePreset === "7d" ? "bg-white text-[#17201c] shadow-xs" : "text-[#7c867f] hover:text-[#17201c]"
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDatePreset("30d")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                datePreset === "30d" ? "bg-white text-[#17201c] shadow-xs" : "text-[#7c867f] hover:text-[#17201c]"
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDatePreset("all")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                datePreset === "all" ? "bg-white text-[#17201c] shadow-xs" : "text-[#7c867f] hover:text-[#17201c]"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDatePreset("custom")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                datePreset === "custom" ? "bg-white text-[#17201c] shadow-xs" : "text-[#7c867f] hover:text-[#17201c]"
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {datePreset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-[#e1e7df] px-2.5 py-1 text-xs text-[#17201c] bg-white"
            />
            <span className="text-xs text-[#7c867f]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border border-[#e1e7df] px-2.5 py-1 text-xs text-[#17201c] bg-white"
            />
            <button
              onClick={fetchOverview}
              className="rounded-xl bg-[#17201c] px-3 py-1 text-xs font-bold text-white hover:bg-[#283730]"
            >
              Apply
            </button>
          </div>
        )}

        <button
          onClick={fetchOverview}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-[#e1e7df] px-3 py-1.5 text-xs font-bold text-[#525f57] hover:bg-[#f8faf6] hover:text-[#17201c]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {loading && !data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-[#edf1eb] p-5 animate-pulse" />
          ))}
        </div>
      )}

      {/* KPI Cards Grid */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Users */}
          <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs transition hover:border-[#a8e63d]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#7c867f]">Registered Users</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0fae1] text-[#456e18]">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#17201c] tracking-tight">
                {kpis.totalUsers}
              </span>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-[#525f57]">
                <span className="font-semibold text-[#3e6810]">{kpis.activeUsers} active</span>
                <span>•</span>
                <span className="text-amber-700">{kpis.suspendedUsers} suspended</span>
              </div>
            </div>
          </div>

          {/* Card 2: Venues & Courts */}
          <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs transition hover:border-[#a8e63d]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#7c867f]">Venues & Courts</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf4ff] text-[#1d63bd]">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#17201c] tracking-tight">
                {kpis.totalVenues}
              </span>
              <span className="ml-1 text-xs font-bold text-[#7c867f]">venues</span>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-[#525f57]">
                <span className="font-semibold text-[#17201c]">{kpis.totalCourts} courts</span>
                <span>({kpis.activeCourts} active courts)</span>
              </div>
            </div>
          </div>

          {/* Card 3: Total Bookings */}
          <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs transition hover:border-[#a8e63d]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#7c867f]">Total Bookings</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0fae1] text-[#365711]">
                <CalendarCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#17201c] tracking-tight">
                {kpis.totalBookings}
              </span>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-[#525f57]">
                <span className="font-semibold text-[#3e6810]">{kpis.upcomingBookings} upcoming</span>
                <span>•</span>
                <span>{kpis.completedBookings} completed</span>
              </div>
            </div>
          </div>

          {/* Card 4: Verified Revenue */}
          <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs transition hover:border-[#a8e63d]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#7c867f]">Verified Paid Revenue</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#17201c] text-[#a8e63d]">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-xl sm:text-2xl font-extrabold text-[#17201c] tracking-tight">
                {formatVND(kpis.verifiedPaidRevenue)}
              </span>
              <div className="mt-1 text-[11px] text-[#525f57]">
                Strictly calculated from confirmed paid records
              </div>
            </div>
          </div>

          {/* Card 5: Cancelled Bookings */}
          <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs transition hover:border-[#a8e63d]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#7c867f]">Cancelled Bookings</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <CalendarX className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#17201c] tracking-tight">
                {kpis.cancelledBookings}
              </span>
              <div className="mt-1 text-[11px] text-[#7c867f]">
                Rate: {kpis.cancellationRate.toFixed(1)}% of total bookings
              </div>
            </div>
          </div>

          {/* Card 6: Open Matches */}
          <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs transition hover:border-[#a8e63d]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#7c867f]">Open Matches</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                <Trophy className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#17201c] tracking-tight">
                {kpis.openMatches}
              </span>
              <div className="mt-1 text-[11px] text-[#525f57]">
                {kpis.totalMatches} total scheduled matches
              </div>
            </div>
          </div>

          {/* Card 7: Completed Matches */}
          <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs transition hover:border-[#a8e63d]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#7c867f]">Completed Matches</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0fae1] text-[#365711]">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#17201c] tracking-tight">
                {kpis.completedMatches}
              </span>
              <div className="mt-1 text-[11px] text-[#525f57]">
                Scores & ratings verified
              </div>
            </div>
          </div>

          {/* Card 8: Pending Moderation */}
          <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs transition hover:border-[#a8e63d]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#7c867f]">Moderation Queue</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#17201c] tracking-tight">
                {kpis.pendingReports}
              </span>
              <div className="mt-1 text-[11px] text-[#525f57]">
                Reported reviews requiring review
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics & Charts Grid */}
      {trends && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: User Registrations Trend */}
          <div className="rounded-3xl border border-[#e1e7df] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#17201c]">New User Registrations</h3>
                <p className="text-[11px] text-[#7c867f]">Daily registration volume (last 30 days)</p>
              </div>
              <BarChart3 className="h-4 w-4 text-[#54801b]" />
            </div>

            {trends.userRegistrationTrend.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#7c867f]">
                No recent registration data recorded in this period.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-end gap-1.5 h-36 pt-4">
                  {trends.userRegistrationTrend.slice(-14).map((d: any) => {
                    const maxVal = Math.max(1, ...trends.userRegistrationTrend.map((t: any) => t.count));
                    const heightPercent = Math.max(8, (d.count / maxVal) * 100);
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-[#a8e63d] hover:bg-[#5b871c] rounded-t-md transition-all relative"
                        >
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-[#17201c] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm transition">
                            {d.count}
                          </span>
                        </div>
                        <span className="text-[9px] text-[#7c867f] truncate">
                          {d.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Chart 2: Booking Status Breakdown */}
          <div className="rounded-3xl border border-[#e1e7df] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#17201c]">Booking Status Distribution</h3>
                <p className="text-[11px] text-[#7c867f]">Platform booking volume by current status</p>
              </div>
              <Layers className="h-4 w-4 text-[#54801b]" />
            </div>

            <div className="space-y-4 pt-2">
              {trends.bookingStatusDistribution.map((item: any) => {
                const total = Math.max(1, kpis?.totalBookings || 1);
                const percent = Math.min(100, Math.round((Math.max(0, item.count) / total) * 100));
                let color = "bg-[#a8e63d]";
                if (item.status === "COMPLETED") color = "bg-[#17201c]";
                if (item.status === "CANCELLED") color = "bg-red-500";

                return (
                  <div key={item.status} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-[#17201c]">
                      <span>{item.status}</span>
                      <span>
                        {Math.max(0, item.count)} ({percent}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-[#f4f6f2] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className={`h-full ${color} rounded-full transition-all`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 3: Peak Booking Days & Hours */}
          <div className="rounded-3xl border border-[#e1e7df] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#17201c]">Peak Booking Days</h3>
                <p className="text-[11px] text-[#7c867f]">Distribution across days of the week</p>
              </div>
              <Calendar className="h-4 w-4 text-[#54801b]" />
            </div>

            <div className="grid grid-cols-7 gap-2 pt-2 text-center">
              {trends.peakWeekdays.map((item: any) => {
                const maxCount = Math.max(1, ...trends.peakWeekdays.map((w: any) => w.count));
                const intensity = (item.count / maxCount) * 100;
                return (
                  <div
                    key={item.dayName}
                    className="flex flex-col items-center justify-between rounded-xl border border-[#edf1eb] p-2.5"
                    style={{
                      backgroundColor: item.count > 0 ? `rgba(168, 230, 61, ${Math.max(0.12, intensity / 100)})` : "#fbfcf9",
                    }}
                  >
                    <span className="text-[10px] font-bold text-[#7c867f] uppercase">{item.dayName.slice(0, 3)}</span>
                    <span className="text-base font-extrabold text-[#17201c] my-1">{item.count}</span>
                    <span className="text-[9px] text-[#525f57]">slots</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 4: Popular Venues */}
          <div className="rounded-3xl border border-[#e1e7df] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#17201c]">Top Venues by Bookings</h3>
                <p className="text-[11px] text-[#7c867f]">Most booked badminton clubs on the platform</p>
              </div>
              <Building2 className="h-4 w-4 text-[#54801b]" />
            </div>

            <div className="space-y-3">
              {trends.popularVenues.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#7c867f]">
                  No venues found.
                </div>
              ) : (
                trends.popularVenues.map((v: any, idx: number) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-[#edf1eb] bg-[#fbfcf9]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#17201c] text-[10px] font-extrabold text-white">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-[#17201c]">{v.name}</p>
                        <p className="text-[10px] text-[#7c867f]">{v.location} • {v._count.courts} courts</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-[#365711]">
                        {v._count.bookings} bookings
                      </span>
                      <p className="text-[10px] text-[#7c867f]">{v._count.matches} matches</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
