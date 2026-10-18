"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  ShieldCheck,
  Info,
  DollarSign,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { DateFilterPreset } from "@/lib/owner-analytics";

interface OwnerReportsSectionProps {
  ownerId: number;
  venueId?: number;
  preset: DateFilterPreset;
  startDate?: string;
  endDate?: string;
  courts?: any[];
  currency?: string;
}

export function OwnerReportsSection({
  ownerId,
  venueId,
  preset,
  startDate,
  endDate,
  courts = [],
  currency = "VND",
}: OwnerReportsSectionProps) {
  const [reportCourtId, setReportCourtId] = useState<string>("ALL");
  const [reportBookingStatus, setReportBookingStatus] = useState<string>("ALL");
  const [reportPaymentStatus, setReportPaymentStatus] = useState<string>("ALL");
  const [revenueGroupBy, setRevenueGroupBy] = useState<"day" | "week" | "month">("day");

  function downloadBookingsReport() {
    let url = `/api/owner/reports/bookings?ownerId=${ownerId}&preset=${preset}`;
    if (venueId) url += `&venueId=${venueId}`;
    if (reportCourtId !== "ALL") url += `&courtId=${reportCourtId}`;
    if (reportBookingStatus !== "ALL") url += `&status=${reportBookingStatus}`;
    if (reportPaymentStatus !== "ALL") url += `&paymentStatus=${reportPaymentStatus}`;
    if (preset === "custom" && startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }
    window.open(url, "_blank");
  }

  function downloadRevenueReport() {
    let url = `/api/owner/reports/revenue?ownerId=${ownerId}&preset=${preset}&groupBy=${revenueGroupBy}`;
    if (venueId) url += `&venueId=${venueId}`;
    if (preset === "custom" && startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-6">
      {/* 1. EXPORT ACTION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bookings CSV Export */}
        <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-[#eaf7d5] p-2 text-[#2e5910]">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-[#17201c]">Bookings Detailed Report</h3>
                <p className="text-xs text-[#717c74]">Complete reservation logs with customer and payment audit.</p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5 text-xs">
              <div>
                <label className="block font-bold text-[#55635a] mb-1">Target Court</label>
                <select
                  value={reportCourtId}
                  onChange={(e) => setReportCourtId(e.target.value)}
                  className="w-full rounded-xl border border-[#d2d9cf] bg-[#f9faf7] p-2 text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">All Courts in Active Venue</option>
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#55635a] mb-1">Booking Status</label>
                  <select
                    value={reportBookingStatus}
                    onChange={(e) => setReportBookingStatus(e.target.value)}
                    className="w-full rounded-xl border border-[#d2d9cf] bg-[#f9faf7] p-2 text-xs font-semibold focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#55635a] mb-1">Payment Status</label>
                  <select
                    value={reportPaymentStatus}
                    onChange={(e) => setReportPaymentStatus(e.target.value)}
                    className="w-full rounded-xl border border-[#d2d9cf] bg-[#f9faf7] p-2 text-xs font-semibold focus:outline-none"
                  >
                    <option value="ALL">All Payments</option>
                    <option value="PAID">PAID</option>
                    <option value="PENDING">PENDING</option>
                    <option value="FAILED">FAILED</option>
                    <option value="REFUNDED">REFUNDED</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={downloadBookingsReport}
            className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#17201c] px-4 py-2.5 text-xs font-bold text-[#a8e63d] shadow-sm hover:bg-[#25322c] transition"
          >
            <Download size={14} /> Download Bookings CSV
          </button>
        </div>

        {/* Revenue Summary CSV Export */}
        <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-[#eaf7d5] p-2 text-[#2e5910]">
                <DollarSign size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-[#17201c]">Revenue Summary Report</h3>
                <p className="text-xs text-[#717c74]">Aggregated timeline revenue, paid vs unpaid balances.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#55635a] mb-1">Aggregation Interval</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["day", "week", "month"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setRevenueGroupBy(g)}
                      className={`rounded-xl border py-2 text-xs font-bold capitalize transition ${
                        revenueGroupBy === g
                          ? "border-[#17201c] bg-[#17201c] text-[#a8e63d]"
                          : "border-[#d2d9cf] bg-[#f9faf7] text-[#55635a] hover:bg-[#e4e8e0]"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-[#f9faf7] p-3 border border-[#e1e7df] space-y-1 text-[#627065]">
                <div className="flex items-center justify-between">
                  <span>Selected Window:</span>
                  <span className="font-bold text-[#17201c] uppercase">{preset}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Currency:</span>
                  <span className="font-bold text-[#17201c]">{currency}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={downloadRevenueReport}
            className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#17201c] px-4 py-2.5 text-xs font-bold text-[#a8e63d] shadow-sm hover:bg-[#25322c] transition"
          >
            <Download size={14} /> Download Revenue CSV
          </button>
        </div>
      </div>

      {/* 2. SECURITY & COMPLIANCE NOTICE */}
      <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2 text-blue-700 shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div className="text-xs space-y-1">
            <h4 className="font-black text-[#17201c]">Data Security & Export Disclaimer</h4>
            <p className="text-[#627065] leading-relaxed">
              <strong>Spreadsheet Injection Protection:</strong> All exported CSV records are safely sanitized to
              neutralize spreadsheet formula injection characters (<code className="bg-gray-100 px-1 py-0.5 rounded">=</code>,{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded">+</code>, <code className="bg-gray-100 px-1 py-0.5 rounded">-</code>,{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded">@</code>) in accordance with OWASP security guidelines.
            </p>
            <p className="text-[#717c74] leading-relaxed italic pt-1">
              Notice: Exported business reports are operational summaries derived from persisted database transactions and
              venue schedules. They are intended for internal operational reviews and do not claim to be accounting-certified
              or tax-compliant filings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
