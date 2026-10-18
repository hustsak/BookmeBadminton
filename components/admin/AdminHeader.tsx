"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ExternalLink, Activity, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function AdminHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user } = useApp();

  return (
    <div className="mb-6 rounded-3xl border border-[#e1e7df] bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#17201c] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#a8e63d]">
              <ShieldAlert className="h-3 w-3" />
              Platform Administration
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#525f57]">
              <Activity className="h-3 w-3 text-[#54801b] animate-pulse" />
              Single-Platform Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17201c] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[#7c867f] mt-1 max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-[#edf1eb] bg-[#f8faf6] px-3.5 py-2">
            <div className="h-2 w-2 rounded-full bg-[#54801b] ring-4 ring-[#a8e63d]/30" />
            <div className="text-left">
              <p className="text-[10px] font-medium text-[#7c867f] leading-none">Logged in as</p>
              <p className="text-xs font-bold text-[#17201c]">
                {user?.name || "Platform Administrator"}
              </p>
            </div>
            <span className="rounded-md bg-[#17201c] px-1.5 py-0.5 text-[9px] font-bold text-[#a8e63d]">
              ADMIN
            </span>
          </div>

          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-2xl border border-[#e1e7df] bg-white px-3.5 py-2 text-xs font-bold text-[#17201c] transition hover:bg-[#f0fae1] hover:text-[#2d4d0f]"
          >
            <ExternalLink className="h-3.5 w-3.5 text-[#54801b]" />
            View Public Site
          </Link>
        </div>
      </div>
    </div>
  );
}
