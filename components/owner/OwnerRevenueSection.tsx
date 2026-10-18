"use client";

import React, { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  PieChart,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { DateFilterPreset } from "@/lib/owner-analytics";

interface OwnerRevenueSectionProps {
  ownerId: number;
  venueId?: number;
  preset: DateFilterPreset;
  startDate?: string;
  endDate?: string;
  currency?: string;
}

function formatCurrency(amount: number, currency: string = "VND"): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${amount.toLocaleString("en-US")}₫`;
}

export function OwnerRevenueSection({
  ownerId,
  venueId,
  preset,
  startDate,
  endDate,
  currency = "VND",
}: OwnerRevenueSectionProps) {
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchRevenueData() {
    setIsLoading(true);
    setError(null);
    try {
      let url = `/api/owner/analytics/revenue?ownerId=${ownerId}&preset=${preset}&groupBy=${groupBy}`;
      if (venueId) url += `&venueId=${venueId}`;
      if (preset === "custom" && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.message || "Failed to load revenue analytics.");
      }
    } catch (err: any) {
      setError("Network error while loading revenue analytics.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchRevenueData();
  }, [ownerId, venueId, preset, startDate, endDate, groupBy]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse rounded-2xl border border-[#e1e7df] bg-white p-6 h-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="animate-pulse rounded-2xl border border-[#e1e7df] bg-white p-6 h-48"></div>
          <div className="animate-pulse rounded-2xl border border-[#e1e7df] bg-white p-6 h-48"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-[#e1e7df] bg-white p-8 text-center">
        <AlertCircle size={32} className="mx-auto text-amber-500 mb-2" />
        <h4 className="text-sm font-bold text-[#17201c]">{error || "No data available."}</h4>
        <button
          onClick={fetchRevenueData}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#17201c] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-black"
        >
          <RefreshCw size={13} /> Try Again
        </button>
      </div>
    );
  }

  const { timeline, breakdownByCourt, breakdownByPaymentMethod, paidVsOutstanding, growthRate } = data;
  const maxRevenue = Math.max(...timeline.map((t: any) => Math.max(t.collectedRevenue, t.bookingValue)), 1);

  return (
    <div className="space-y-6">
      {/* 1. TIMELINE REVENUE TREND CHART */}
      <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#f0f3ed]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-[#17201c]">Revenue Trend</h3>
              {growthRate !== null && !isNaN(growthRate) && (
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${
                    growthRate >= 0 ? "bg-[#eaf7d5] text-[#2d590e]" : "bg-[#fde8e8] text-[#9b1c1c]"
                  }`}
                >
                  <TrendingUp size={12} />
                  {growthRate >= 0 ? `+${growthRate.toFixed(1)}% growth` : `${growthRate.toFixed(1)}% growth`}
                </span>
              )}
            </div>
            <p className="text-xs text-[#717c74] mt-0.5">
              Verified collected revenue vs total booking value over time.
            </p>
          </div>

          {/* GroupBy Switcher */}
          <div className="flex items-center bg-[#f2f4ef] rounded-xl p-1 gap-1 self-start sm:self-auto">
            {(["day", "week", "month"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`rounded-lg px-3 py-1 text-xs font-bold capitalize transition ${
                  groupBy === g ? "bg-white text-[#17201c] shadow-2xs" : "text-[#627065] hover:text-[#17201c]"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-[#55635a]">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-[#a8e63d]"></span>
            <span>Collected Paid Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-[#e2e7df]"></span>
            <span>Unpaid Booking Value</span>
          </div>
        </div>

        {/* Chart Visualization */}
        {timeline.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#717c74]">
            No booking revenue recorded for this period.
          </div>
        ) : (
          <div className="mt-6 flex items-end gap-2 overflow-x-auto pb-2 h-56 pt-6">
            {timeline.map((item: any, idx: number) => {
              const paidHeight = Math.max(4, Math.round((item.collectedRevenue / maxRevenue) * 100));
              const totalHeight = Math.max(4, Math.round((item.bookingValue / maxRevenue) * 100));

              return (
                <div
                  key={idx}
                  className="flex flex-col items-center flex-1 min-w-[38px] group relative h-full justify-end"
                >
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-[#17201c] text-white px-2.5 py-1 rounded-lg text-[10px] whitespace-nowrap shadow-lg">
                    <span className="font-bold">{item.label}</span>
                    <span>Paid: {formatCurrency(item.collectedRevenue, currency)}</span>
                    <span className="text-gray-300">Bookings: {item.bookingsCount}</span>
                  </div>

                  {/* Dual Bar Column */}
                  <div className="w-full flex items-end justify-center gap-1 h-44">
                    {/* Collected Bar */}
                    <div
                      style={{ height: `${paidHeight}%` }}
                      className="w-full max-w-[14px] bg-[#a8e63d] rounded-t-sm transition-all duration-300 group-hover:brightness-95"
                    />
                    {/* Unpaid / Gross difference bar if larger */}
                    {item.bookingValue > item.collectedRevenue && (
                      <div
                        style={{ height: `${totalHeight}%` }}
                        className="w-full max-w-[14px] bg-[#dce3d8] rounded-t-sm transition-all duration-300"
                      />
                    )}
                  </div>

                  <span className="text-[10px] font-bold text-[#717c74] mt-2 truncate max-w-[40px] text-center">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. PAID VS OUTSTANDING BALANCE COMPARISON */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#f0f3ed]">
            <div>
              <h3 className="text-sm font-black text-[#17201c]">Paid vs. Outstanding Balance</h3>
              <p className="text-xs text-[#717c74]">Collection efficiency on confirmed reservations.</p>
            </div>
            <div className="rounded-xl bg-[#f2f4ef] p-2 text-[#3c6b12]">
              <PieChart size={18} />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {/* Visual Progress Bar */}
            <div className="h-4 w-full rounded-full bg-[#f2f4ef] overflow-hidden flex">
              <div
                style={{ width: `${paidVsOutstanding.paidPercentage}%` }}
                className="bg-[#2e5910] h-full transition-all duration-500"
              />
              <div
                style={{ width: `${paidVsOutstanding.outstandingPercentage}%` }}
                className="bg-amber-400 h-full transition-all duration-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl bg-[#f5f8f3] p-3 border border-[#e1e7df]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#2e5910]">
                  <CheckCircle2 size={14} /> Collected Revenue
                </div>
                <div className="text-lg font-black text-[#17201c] mt-1">
                  {formatCurrency(paidVsOutstanding.collectedRevenue, currency)}
                </div>
                <span className="text-[11px] text-[#4d5a52] font-semibold">
                  {paidVsOutstanding.paidPercentage.toFixed(1)}% of total value
                </span>
              </div>

              <div className="rounded-xl bg-[#fffbf0] p-3 border border-[#f3e5b8]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                  <AlertCircle size={14} /> Outstanding Balance
                </div>
                <div className="text-lg font-black text-[#17201c] mt-1">
                  {formatCurrency(paidVsOutstanding.outstandingBalance, currency)}
                </div>
                <span className="text-[11px] text-amber-800 font-semibold">
                  {paidVsOutstanding.outstandingPercentage.toFixed(1)}% uncollected
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. REVENUE BY PAYMENT METHOD */}
        <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#f0f3ed]">
            <div>
              <h3 className="text-sm font-black text-[#17201c]">Revenue by Payment Method</h3>
              <p className="text-xs text-[#717c74]">Distribution across settlement channels.</p>
            </div>
            <div className="rounded-xl bg-[#f2f4ef] p-2 text-[#3c6b12]">
              <CreditCard size={18} />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {breakdownByPaymentMethod.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#717c74]">No payments logged for this period.</p>
            ) : (
              breakdownByPaymentMethod.map((pm: any, idx: number) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[#17201c]">{pm.method}</span>
                    <span className="text-[#3c6b12]">
                      {formatCurrency(pm.amount, currency)} ({pm.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#717c74]">
                    <span>{pm.transactionCount} transactions</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#f2f4ef] overflow-hidden">
                    <div
                      style={{ width: `${pm.percentage}%` }}
                      className="h-full bg-[#17201c] rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. REVENUE BY COURT BREAKDOWN */}
      <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs">
        <div className="pb-3 border-b border-[#f0f3ed] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-[#17201c]">Court Revenue Breakdown</h3>
            <p className="text-xs text-[#717c74]">Revenue generation and utilization per individual court.</p>
          </div>
          <div className="rounded-xl bg-[#f2f4ef] p-2 text-[#3c6b12]">
            <Layers size={18} />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e1e7df] text-[11px] font-black uppercase text-[#717c74]">
                <th className="pb-2.5">Court</th>
                <th className="pb-2.5">Venue</th>
                <th className="pb-2.5 text-right">Collected Revenue</th>
                <th className="pb-2.5 text-right">Total Booking Value</th>
                <th className="pb-2.5 text-right">Bookings</th>
                <th className="pb-2.5 text-right">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f5ef]">
              {breakdownByCourt.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-[#717c74]">
                    No court revenue data available.
                  </td>
                </tr>
              ) : (
                breakdownByCourt.map((court: any) => (
                  <tr key={court.courtId} className="hover:bg-[#f9faf7]">
                    <td className="py-3 font-bold text-[#17201c]">{court.courtName}</td>
                    <td className="py-3 text-[#55635a]">{court.venueName}</td>
                    <td className="py-3 text-right font-black text-[#2e5910]">
                      {formatCurrency(court.collectedRevenue, currency)}
                    </td>
                    <td className="py-3 text-right font-semibold text-[#55635a]">
                      {formatCurrency(court.bookingValue, currency)}
                    </td>
                    <td className="py-3 text-right font-bold text-[#17201c]">{court.bookingsCount}</td>
                    <td className="py-3 text-right">
                      <span className="rounded-md bg-[#eaf7d5] px-2 py-0.5 font-bold text-[#2e5910]">
                        {court.utilizationRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
