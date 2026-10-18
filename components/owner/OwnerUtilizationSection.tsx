"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  Clock,
  Calendar,
  AlertTriangle,
  Flame,
  Moon,
  Layers,
  Wrench,
  CheckCircle2,
  RefreshCw,
  Info,
} from "lucide-react";
import { DateFilterPreset } from "@/lib/owner-analytics";

interface OwnerUtilizationSectionProps {
  ownerId: number;
  venueId?: number;
  courtId?: number;
  preset: DateFilterPreset;
  startDate?: string;
  endDate?: string;
}

export function OwnerUtilizationSection({
  ownerId,
  venueId,
  courtId,
  preset,
  startDate,
  endDate,
}: OwnerUtilizationSectionProps) {
  const [utilData, setUtilData] = useState<any>(null);
  const [peakData, setPeakData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      let query = `ownerId=${ownerId}&preset=${preset}`;
      if (venueId) query += `&venueId=${venueId}`;
      if (courtId) query += `&courtId=${courtId}`;
      if (preset === "custom" && startDate && endDate) {
        query += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const [resUtil, resPeak] = await Promise.all([
        fetch(`/api/owner/analytics/utilization?${query}`),
        fetch(`/api/owner/analytics/peak-hours?${query}`),
      ]);

      const [jsonUtil, jsonPeak] = await Promise.all([resUtil.json(), resPeak.json()]);

      if (jsonUtil.success && jsonPeak.success) {
        setUtilData(jsonUtil.data);
        setPeakData(jsonPeak.data);
      } else {
        setError(jsonUtil.message || jsonPeak.message || "Failed to load utilization analytics.");
      }
    } catch (err) {
      setError("Network error while loading court utilization.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [ownerId, venueId, courtId, preset, startDate, endDate]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse rounded-2xl border border-[#e1e7df] bg-white p-6 h-40"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="animate-pulse rounded-2xl border border-[#e1e7df] bg-white p-6 h-64"></div>
          <div className="animate-pulse rounded-2xl border border-[#e1e7df] bg-white p-6 h-64"></div>
        </div>
      </div>
    );
  }

  if (error || !utilData || !peakData) {
    return (
      <div className="rounded-2xl border border-[#e1e7df] bg-white p-8 text-center">
        <AlertTriangle size={32} className="mx-auto text-amber-500 mb-2" />
        <h4 className="text-sm font-bold text-[#17201c]">{error || "No utilization data available."}</h4>
        <button
          onClick={loadData}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#17201c] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-black"
        >
          <RefreshCw size={13} /> Try Again
        </button>
      </div>
    );
  }

  const { summary, courts } = utilData;
  const { weekdayBreakdown, hourlyBreakdown, popularTimeSlots, leastUtilizedTimeSlots, averageLeadTimeHours } = peakData;

  const maxHourlyCount = Math.max(...hourlyBreakdown.map((h: any) => h.bookingCount), 1);
  const maxWeekdayHours = Math.max(...weekdayBreakdown.map((w: any) => w.bookedHours), 1);

  return (
    <div className="space-y-6">
      {/* 1. SUMMARY UTILIZATION METRICS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-2xl border border-[#e1e7df] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-[#717c74] uppercase">Overall Utilization</span>
          <div className="text-2xl font-black text-[#2e5910] mt-1">
            {summary.overallUtilizationRate.toFixed(1)}%
          </div>
          <span className="text-[10px] text-[#55635a]">Booked / Available hrs</span>
        </div>

        <div className="rounded-2xl border border-[#e1e7df] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-[#717c74] uppercase">Booked Hours</span>
          <div className="text-2xl font-black text-[#17201c] mt-1">
            {summary.totalBookedHours.toFixed(1)} hrs
          </div>
          <span className="text-[10px] text-[#55635a]">Valid reservations</span>
        </div>

        <div className="rounded-2xl border border-[#e1e7df] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-[#717c74] uppercase">Operating Hours</span>
          <div className="text-2xl font-black text-[#17201c] mt-1">
            {summary.totalAvailableHours.toFixed(1)} hrs
          </div>
          <span className="text-[10px] text-[#55635a]">Excluding maintenance</span>
        </div>

        <div className="rounded-2xl border border-[#e1e7df] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-[#717c74] uppercase">Maintenance Impact</span>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {summary.totalMaintenanceHours.toFixed(1)} hrs
          </div>
          <span className="text-[10px] text-amber-800">Downtime blocked</span>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-[#e1e7df] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-[#717c74] uppercase">Avg Lead Time</span>
          <div className="text-2xl font-black text-[#17201c] mt-1">
            {averageLeadTimeHours < 24
              ? `${averageLeadTimeHours.toFixed(0)} hrs`
              : `${(averageLeadTimeHours / 24).toFixed(1)} days`}
          </div>
          <span className="text-[10px] text-[#55635a]">Booking advance notice</span>
        </div>
      </div>

      {/* 2. PEAK VS QUIET SLOTS SPOTLIGHT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most Popular Booking Times */}
        <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#f0f3ed]">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-[#fee2e2] p-2 text-red-600">
                <Flame size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#17201c]">Most Popular Peak Times</h3>
                <p className="text-xs text-[#717c74]">Highest customer demand slots.</p>
              </div>
            </div>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">High Demand</span>
          </div>

          <div className="mt-4 space-y-2.5">
            {popularTimeSlots.length === 0 ? (
              <p className="text-xs text-[#717c74] py-4 text-center">No booking data available.</p>
            ) : (
              popularTimeSlots.map((slot: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#fdfaf8] border border-[#f5ece5]"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#17201c] text-white text-[11px] font-black">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-[#17201c]">{slot.label}</span>
                  </div>
                  <span className="text-xs font-black text-red-600">{slot.bookingCount} bookings</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Least Utilized / Quiet Times */}
        <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#f0f3ed]">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-[#f0f4ff] p-2 text-blue-600">
                <Moon size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#17201c]">Least Utilized Time Slots</h3>
                <p className="text-xs text-[#717c74]">Off-peak opportunities for promotions.</p>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Off-Peak</span>
          </div>

          <div className="mt-4 space-y-2.5">
            {leastUtilizedTimeSlots.length === 0 ? (
              <p className="text-xs text-[#717c74] py-4 text-center">No booking data available.</p>
            ) : (
              leastUtilizedTimeSlots.map((slot: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#f8faff] border border-[#e5edff]"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3c507a] text-white text-[11px] font-black">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-[#17201c]">{slot.label}</span>
                  </div>
                  <span className="text-xs font-black text-blue-700">{slot.bookingCount} bookings</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. HOURLY BOOKING DISTRIBUTION HEATMAP */}
      <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs">
        <div className="pb-3 border-b border-[#f0f3ed]">
          <h3 className="text-sm font-black text-[#17201c]">Hourly Slot Demand Distribution</h3>
          <p className="text-xs text-[#717c74]">
            Concentration of booked slots across the operating day (06:00 - 23:00).
          </p>
        </div>

        <div className="mt-5 flex items-end gap-1.5 sm:gap-2 overflow-x-auto pb-2 h-48 pt-4">
          {hourlyBreakdown.map((item: any, idx: number) => {
            const barHeight = Math.max(4, Math.round((item.bookingCount / maxHourlyCount) * 100));
            const isHigh = item.bookingCount >= maxHourlyCount * 0.75 && item.bookingCount > 0;
            const isMedium = item.bookingCount >= maxHourlyCount * 0.4 && !isHigh;

            return (
              <div
                key={idx}
                className="flex flex-col items-center flex-1 min-w-[32px] group relative h-full justify-end"
              >
                {/* Tooltip */}
                <div className="pointer-events-none absolute -top-10 z-20 hidden group-hover:flex flex-col items-center bg-[#17201c] text-white px-2 py-0.5 rounded text-[10px] whitespace-nowrap shadow-md">
                  <span>{item.hour}</span>
                  <span className="font-bold">{item.bookingCount} bookings</span>
                </div>

                <div
                  style={{ height: `${barHeight}%` }}
                  className={`w-full max-w-[16px] rounded-t-sm transition-all duration-300 ${
                    isHigh ? "bg-red-500" : isMedium ? "bg-[#a8e63d]" : "bg-[#d8e0d4]"
                  }`}
                />

                <span className="text-[10px] font-bold text-[#717c74] mt-2 text-center">
                  {item.hour.slice(0, 2)}h
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. WEEKDAY DISTRIBUTION */}
      <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs">
        <div className="pb-3 border-b border-[#f0f3ed]">
          <h3 className="text-sm font-black text-[#17201c]">Utilization by Weekday</h3>
          <p className="text-xs text-[#717c74]">Booked hours and utilization rate across days of the week.</p>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-7 gap-2.5">
          {weekdayBreakdown.map((day: any) => (
            <div
              key={day.dayOfWeek}
              className="rounded-xl border border-[#e1e7df] bg-[#f9faf7] p-3 text-center space-y-1.5"
            >
              <div className="text-xs font-black text-[#17201c]">{day.dayName}</div>
              <div className="text-lg font-black text-[#2e5910]">{day.utilizationPercent.toFixed(0)}%</div>
              <div className="text-[11px] text-[#717c74]">{day.bookedHours.toFixed(1)} hrs</div>
              <span className="text-[10px] text-[#55635a] block">({day.bookingsCount} bookings)</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. PER-COURT UTILIZATION BREAKDOWN TABLE */}
      <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs">
        <div className="pb-3 border-b border-[#f0f3ed]">
          <h3 className="text-sm font-black text-[#17201c]">Court Utilization & Availability Details</h3>
          <p className="text-xs text-[#717c74]">
            Operating hours minus maintenance blocks vs valid booked court hours.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e1e7df] text-[11px] font-black uppercase text-[#717c74]">
                <th className="pb-2.5">Court</th>
                <th className="pb-2.5 text-right">Booked Hours</th>
                <th className="pb-2.5 text-right">Available Hours</th>
                <th className="pb-2.5 text-right">Maintenance</th>
                <th className="pb-2.5 text-right">Utilization Rate</th>
                <th className="pb-2.5 text-right">Cancellation Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f5ef]">
              {courts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-[#717c74]">
                    No court utilization data found.
                  </td>
                </tr>
              ) : (
                courts.map((c: any) => (
                  <tr key={c.courtId} className="hover:bg-[#f9faf7]">
                    <td className="py-3 font-bold text-[#17201c]">
                      {c.courtName} <span className="text-[#717c74] font-normal">({c.venueName})</span>
                    </td>
                    <td className="py-3 text-right font-black text-[#17201c]">{c.bookedHours.toFixed(1)} hrs</td>
                    <td className="py-3 text-right font-semibold text-[#55635a]">
                      {c.availableHours.toFixed(1)} hrs
                    </td>
                    <td className="py-3 text-right text-amber-700 font-semibold">
                      {c.maintenanceHours > 0 ? `${c.maintenanceHours.toFixed(1)} hrs` : "0 hrs"}
                    </td>
                    <td className="py-3 text-right">
                      <span className="rounded-md bg-[#eaf7d5] px-2 py-0.5 font-bold text-[#2e5910]">
                        {c.utilizationRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`rounded-md px-2 py-0.5 font-bold ${
                          c.cancellationRate > 15
                            ? "bg-[#fde8e8] text-[#9b1c1c]"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {c.cancellationRate.toFixed(1)}%
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
