"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  DollarSign,
  Activity,
  Wrench,
  Clock,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { DateFilterPreset } from "@/lib/owner-analytics";

interface OwnerCourtsSectionProps {
  ownerId: number;
  venueId?: number;
  preset: DateFilterPreset;
  startDate?: string;
  endDate?: string;
  currency?: string;
  onEditPricing?: (courtId: number) => void;
}

function formatCurrency(amount: number, currency: string = "VND"): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${amount.toLocaleString("en-US")}₫`;
}

export function OwnerCourtsSection({
  ownerId,
  venueId,
  preset,
  startDate,
  endDate,
  currency = "VND",
  onEditPricing,
}: OwnerCourtsSectionProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCourtData() {
    setIsLoading(true);
    setError(null);
    try {
      let url = `/api/owner/analytics/courts?ownerId=${ownerId}&preset=${preset}`;
      if (venueId) url += `&venueId=${venueId}`;
      if (preset === "custom" && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.message || "Failed to load courts performance data.");
      }
    } catch (err) {
      setError("Network error while loading court performance.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCourtData();
  }, [ownerId, venueId, preset, startDate, endDate]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-[#e1e7df] bg-white p-5 h-64"></div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-[#e1e7df] bg-white p-8 text-center">
        <AlertCircle size={32} className="mx-auto text-amber-500 mb-2" />
        <h4 className="text-sm font-bold text-[#17201c]">{error || "No court data found."}</h4>
        <button
          onClick={loadCourtData}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#17201c] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-black"
        >
          <RefreshCw size={13} /> Try Again
        </button>
      </div>
    );
  }

  const { courts, summary } = data;
  const maxCourtRevenue = Math.max(...courts.map((c: any) => c.revenueCollected), 1);

  return (
    <div className="space-y-6">
      {/* 1. COURTS PERFORMANCE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courts.map((court: any) => {
          const revenueShare = Math.round((court.revenueCollected / maxCourtRevenue) * 100);

          return (
            <div
              key={court.courtId}
              className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs transition hover:shadow-sm"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-[#f0f3ed]">
                <div>
                  <h3 className="text-base font-black text-[#17201c]">{court.courtName}</h3>
                  <span className="text-xs text-[#717c74] font-medium">{court.venueName}</span>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-[#eaf7d5] px-2.5 py-0.5 text-xs font-black text-[#2e5910]">
                    {court.utilizationRate.toFixed(1)}% util
                  </span>
                  <div className="text-[10px] text-[#7a867e] mt-1 font-semibold">
                    {formatCurrency(court.pricePerHour, currency)}/hr
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-xl bg-[#f9faf7] p-2.5 border border-[#e1e7df]">
                  <span className="text-[10px] font-bold text-[#55635a] uppercase">Collected Revenue</span>
                  <div className="font-black text-[#2e5910] text-sm mt-0.5">
                    {formatCurrency(court.revenueCollected, currency)}
                  </div>
                </div>

                <div className="rounded-xl bg-[#f9faf7] p-2.5 border border-[#e1e7df]">
                  <span className="text-[10px] font-bold text-[#55635a] uppercase">Bookings</span>
                  <div className="font-black text-[#17201c] text-sm mt-0.5">
                    {court.confirmedBookings} confirmed
                  </div>
                </div>

                <div className="rounded-xl bg-[#f9faf7] p-2.5 border border-[#e1e7df]">
                  <span className="text-[10px] font-bold text-[#55635a] uppercase">Booked / Available</span>
                  <div className="font-black text-[#17201c] text-xs mt-0.5">
                    {court.bookedHours.toFixed(1)} / {court.availableHours.toFixed(1)} hrs
                  </div>
                </div>

                <div className="rounded-xl bg-[#f9faf7] p-2.5 border border-[#e1e7df]">
                  <span className="text-[10px] font-bold text-amber-700 uppercase">Maintenance</span>
                  <div className="font-black text-amber-800 text-xs mt-0.5">
                    {court.maintenanceHours.toFixed(1)} hrs blocked
                  </div>
                </div>
              </div>

              {/* Relative Revenue Bar */}
              <div className="mt-4 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#717c74]">
                  <span>Revenue Share</span>
                  <span>{revenueShare}% of top court</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#f2f4ef] overflow-hidden">
                  <div
                    style={{ width: `${revenueShare}%` }}
                    className="h-full rounded-full bg-[#17201c] transition-all duration-300"
                  />
                </div>
              </div>

              {/* Quick Action */}
              {onEditPricing && (
                <button
                  type="button"
                  onClick={() => onEditPricing(court.courtId)}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#d2d9cf] bg-white py-1.5 text-xs font-bold text-[#17201c] hover:bg-[#f5f8f3]"
                >
                  <SlidersHorizontal size={12} /> Manage Surface & Pricing
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 2. COURT COMPARISON MATRIX */}
      <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs">
        <div className="pb-3 border-b border-[#f0f3ed]">
          <h3 className="text-sm font-black text-[#17201c]">Court Performance Comparison Matrix</h3>
          <p className="text-xs text-[#717c74]">
            Direct side-by-side comparison across all courts in the active venue.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#e1e7df] text-[11px] font-black uppercase text-[#717c74]">
              <tr>
                <th className="pb-2.5">Court Name</th>
                <th className="pb-2.5 text-right">Price / Hour</th>
                <th className="pb-2.5 text-right">Booked Hours</th>
                <th className="pb-2.5 text-right">Available Hours</th>
                <th className="pb-2.5 text-right">Maintenance Downtime</th>
                <th className="pb-2.5 text-right">Utilization</th>
                <th className="pb-2.5 text-right">Collected Revenue</th>
                <th className="pb-2.5 text-right">Avg Booking Value</th>
                <th className="pb-2.5 text-right">Cancel Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f5ef]">
              {courts.map((c: any) => (
                <tr key={c.courtId} className="hover:bg-[#f9faf7]">
                  <td className="py-3 font-bold text-[#17201c]">{c.courtName}</td>
                  <td className="py-3 text-right font-semibold text-[#55635a]">
                    {formatCurrency(c.pricePerHour, currency)}
                  </td>
                  <td className="py-3 text-right font-black text-[#17201c]">{c.bookedHours.toFixed(1)} hrs</td>
                  <td className="py-3 text-right text-[#55635a]">{c.availableHours.toFixed(1)} hrs</td>
                  <td className="py-3 text-right text-amber-700 font-semibold">{c.maintenanceHours.toFixed(1)} hrs</td>
                  <td className="py-3 text-right">
                    <span className="rounded-md bg-[#eaf7d5] px-2 py-0.5 font-bold text-[#2e5910]">
                      {c.utilizationRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 text-right font-black text-[#2e5910]">
                    {formatCurrency(c.revenueCollected, currency)}
                  </td>
                  <td className="py-3 text-right font-semibold text-[#17201c]">
                    {formatCurrency(c.averageBookingValue, currency)}
                  </td>
                  <td className="py-3 text-right text-[#717c74]">{c.cancellationRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
