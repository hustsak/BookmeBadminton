"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Activity,
  Layers,
  Clock,
} from "lucide-react";
import { OwnerOverviewKPIs, MetricWithComparison } from "@/lib/owner-analytics";

interface OwnerKpiGridProps {
  kpis: OwnerOverviewKPIs | null;
  isLoading: boolean;
  currency?: string;
}

function formatCurrency(amount: number, currency: string = "VND"): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${amount.toLocaleString("en-US")}₫`;
}

interface KpiCardProps {
  title: string;
  subtitle?: string;
  metric: MetricWithComparison;
  isCurrency?: boolean;
  isPercent?: boolean;
  currency?: string;
  icon: React.ReactNode;
  invertColor?: boolean; // For cancellation rate, increase is bad!
  tooltip?: string;
}

function KpiCard({
  title,
  subtitle,
  metric,
  isCurrency,
  isPercent,
  currency = "VND",
  icon,
  invertColor = false,
  tooltip,
}: KpiCardProps) {
  const displayValue = isCurrency
    ? formatCurrency(metric.value, currency)
    : isPercent
    ? `${metric.value.toFixed(1)}%`
    : metric.value.toLocaleString();

  const prevDisplayValue = isCurrency
    ? formatCurrency(metric.previousValue, currency)
    : isPercent
    ? `${metric.previousValue.toFixed(1)}%`
    : metric.previousValue.toLocaleString();

  const change = metric.changePercent;
  const hasChange = change !== null && !isNaN(change);

  let isPositiveGood = true;
  if (invertColor) {
    isPositiveGood = false;
  }

  const isGreen = hasChange && ((change > 0 && isPositiveGood) || (change < 0 && !isPositiveGood));
  const isRed = hasChange && ((change < 0 && isPositiveGood) || (change > 0 && !isPositiveGood));

  return (
    <div className="rounded-2xl border border-[#e1e7df] bg-white p-4 shadow-2xs transition hover:shadow-xs hover:border-[#ccd5c9]">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-bold text-[#6a776f] uppercase tracking-wider">{title}</span>
        <div className="rounded-xl bg-[#f2f5ef] p-2 text-[#3c6b12]">{icon}</div>
      </div>

      <div className="mt-2">
        <div className="text-xl sm:text-2xl font-black text-[#17201c] tracking-tight">{displayValue}</div>
        {subtitle && <p className="text-[11px] text-[#717c74] mt-0.5">{subtitle}</p>}
      </div>

      {/* Comparison with preceding period */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-[#f0f3ed] text-[11px]">
        {hasChange ? (
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-bold ${
              isGreen
                ? "bg-[#eaf7d5] text-[#2d590e]"
                : isRed
                ? "bg-[#fde8e8] text-[#9b1c1c]"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {change > 0 ? (
              <TrendingUp size={12} className="shrink-0" />
            ) : change < 0 ? (
              <TrendingDown size={12} className="shrink-0" />
            ) : null}
            {change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`}
          </span>
        ) : (
          <span className="rounded-md bg-gray-100 px-1.5 py-0.5 font-semibold text-gray-500 text-[10px]">
            New period
          </span>
        )}
        <span className="text-[#7a867e] text-[10px] truncate">vs {prevDisplayValue} prev</span>
      </div>
    </div>
  );
}

export function OwnerKpiGrid({ kpis, isLoading, currency = "VND" }: OwnerKpiGridProps) {
  if (isLoading || !kpis) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-[#e1e7df] bg-white p-4 h-32">
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-3 bg-gray-100 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  const effectiveCurrency = kpis.currency || currency;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* 1. Confirmed Paid Revenue */}
      <KpiCard
        title="Paid Revenue"
        subtitle="Verified collected payments"
        metric={kpis.confirmedPaidRevenue}
        isCurrency
        currency={effectiveCurrency}
        icon={<DollarSign size={16} />}
      />

      {/* 2. Total Booking Revenue */}
      <KpiCard
        title="Total Booking Value"
        subtitle="Gross value (non-cancelled)"
        metric={kpis.bookingRevenue}
        isCurrency
        currency={effectiveCurrency}
        icon={<CreditCard size={16} />}
      />

      {/* 3. Outstanding Payments */}
      <KpiCard
        title="Outstanding Balance"
        subtitle="Unpaid booking balances"
        metric={kpis.outstandingPayments}
        isCurrency
        currency={effectiveCurrency}
        icon={<AlertCircle size={16} />}
        invertColor
      />

      {/* 4. Court Utilization Rate */}
      <KpiCard
        title="Court Utilization"
        subtitle="Booked / Available hours"
        metric={kpis.courtUtilizationRate}
        isPercent
        icon={<Activity size={16} />}
      />

      {/* 5. Total Bookings */}
      <KpiCard
        title="Total Bookings"
        subtitle="All reservations logged"
        metric={kpis.totalBookings}
        icon={<CalendarCheck size={16} />}
      />

      {/* 6. Confirmed Bookings */}
      <KpiCard
        title="Confirmed Bookings"
        subtitle="Completed & active slots"
        metric={kpis.confirmedBookings}
        icon={<CheckCircle2 size={16} />}
      />

      {/* 7. Cancelled Bookings */}
      <KpiCard
        title="Cancelled Bookings"
        subtitle={`Cancellation rate: ${kpis.cancellationRate.value.toFixed(1)}%`}
        metric={kpis.cancelledBookings}
        icon={<XCircle size={16} />}
        invertColor
      />

      {/* 8. Average Revenue Per Booking */}
      <KpiCard
        title="Avg Booking Value"
        subtitle="Paid revenue / bookings"
        metric={kpis.averageRevenuePerBooking}
        isCurrency
        currency={effectiveCurrency}
        icon={<Layers size={16} />}
      />
    </div>
  );
}
