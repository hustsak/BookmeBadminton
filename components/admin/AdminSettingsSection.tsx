"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Save,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Globe,
  Mail,
  Phone,
  Clock,
  ShieldCheck,
  Users,
} from "lucide-react";

export function AdminSettingsSection() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [platformName, setPlatformName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [defaultTimezone, setDefaultTimezone] = useState("Asia/Ho_Chi_Minh");
  const [defaultCurrency, setDefaultCurrency] = useState("VND");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [minBookingDuration, setMinBookingDuration] = useState(1);
  const [maxBookingDuration, setMaxBookingDuration] = useState(4);
  const [defaultMaxMatchPlayers, setDefaultMaxMatchPlayers] = useState(4);
  const [changeReason, setChangeReason] = useState("");

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load platform settings.");
      }
      const c = json.data;
      setConfig(c);
      setPlatformName(c.platformName || "BookMeBadminton");
      setContactEmail(c.contactEmail || "support@bookmebadminton.com");
      setContactPhone(c.contactPhone || "+84 901 234 567");
      setDefaultTimezone(c.defaultTimezone || "Asia/Ho_Chi_Minh");
      setDefaultCurrency(c.defaultCurrency || "VND");
      setCancellationPolicy(c.cancellationPolicy || "Free cancellation up to 6 hours before slot start time.");
      setMinBookingDuration(c.minBookingDuration || 1);
      setMaxBookingDuration(c.maxBookingDuration || 4);
      setDefaultMaxMatchPlayers(c.defaultMaxMatchPlayers || 4);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformName.trim()) {
      setError("Platform name is required.");
      return;
    }
    if (minBookingDuration > maxBookingDuration) {
      setError("Minimum duration cannot exceed maximum duration.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformName: platformName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          defaultTimezone,
          defaultCurrency,
          cancellationPolicy: cancellationPolicy.trim(),
          minBookingDuration: Number(minBookingDuration),
          maxBookingDuration: Number(maxBookingDuration),
          defaultMaxMatchPlayers: Number(defaultMaxMatchPlayers),
          reason: changeReason.trim() || "Operational settings updated by administrator",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update platform settings.");
      }

      setConfig(json.data);
      setSuccess("Platform configuration updated and recorded in audit log.");
      setChangeReason("");
    } catch (err: any) {
      setError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !config) {
    return (
      <div className="rounded-3xl border border-[#edf1eb] bg-white p-12 text-center text-xs text-[#7c867f]">
        Loading platform settings...
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="rounded-3xl border border-[#e1e7df] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-[#edf1eb]">
          <div>
            <h2 className="text-base font-extrabold text-[#17201c]">Platform Configuration</h2>
            <p className="text-xs text-[#7c867f]">
              Global operational defaults, booking boundaries, and platform contact details
            </p>
          </div>
          {config?.updatedAt && (
            <span className="text-[11px] text-[#7c867f]">
              Last updated: {new Date(config.updatedAt).toLocaleString()}
            </span>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#a8e63d] bg-[#f0fae1] p-4 text-xs font-semibold text-[#365711]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-6 space-y-6">
          {/* Section 1: Platform Brand & Contact */}
          <div>
            <h3 className="text-xs font-extrabold text-[#17201c] uppercase tracking-wider mb-3">
              1. Platform Brand & Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#17201c] mb-1">Platform Name *</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7c867f]" />
                  <input
                    type="text"
                    required
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    className="w-full rounded-2xl border border-[#e1e7df] pl-9 pr-3 py-2 text-xs font-medium text-[#17201c] focus:outline-none focus:border-[#a8e63d]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17201c] mb-1">Support Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7c867f]" />
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full rounded-2xl border border-[#e1e7df] pl-9 pr-3 py-2 text-xs font-medium text-[#17201c] focus:outline-none focus:border-[#a8e63d]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17201c] mb-1">Contact Hotline</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7c867f]" />
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full rounded-2xl border border-[#e1e7df] pl-9 pr-3 py-2 text-xs font-medium text-[#17201c] focus:outline-none focus:border-[#a8e63d]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Localization */}
          <div className="pt-4 border-t border-[#edf1eb]">
            <h3 className="text-xs font-extrabold text-[#17201c] uppercase tracking-wider mb-3">
              2. Localization & Currency
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#17201c] mb-1">Default Timezone</label>
                <select
                  value={defaultTimezone}
                  onChange={(e) => setDefaultTimezone(e.target.value)}
                  className="w-full rounded-2xl border border-[#e1e7df] p-2 text-xs font-medium text-[#17201c] bg-white"
                >
                  <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (UTC+7)</option>
                  <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
                  <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17201c] mb-1">Platform Currency</label>
                <select
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  className="w-full rounded-2xl border border-[#e1e7df] p-2 text-xs font-medium text-[#17201c] bg-white"
                >
                  <option value="VND">Vietnamese Dong (VND ₫)</option>
                  <option value="USD">US Dollar (USD $)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Booking Rules & Durations */}
          <div className="pt-4 border-t border-[#edf1eb]">
            <h3 className="text-xs font-extrabold text-[#17201c] uppercase tracking-wider mb-3">
              3. Booking Boundaries & Match Limits
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#17201c] mb-1">
                  Min Booking Duration (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={minBookingDuration}
                  onChange={(e) => setMinBookingDuration(Number(e.target.value))}
                  className="w-full rounded-2xl border border-[#e1e7df] p-2 text-xs font-medium text-[#17201c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17201c] mb-1">
                  Max Booking Duration (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={maxBookingDuration}
                  onChange={(e) => setMaxBookingDuration(Number(e.target.value))}
                  className="w-full rounded-2xl border border-[#e1e7df] p-2 text-xs font-medium text-[#17201c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17201c] mb-1">
                  Default Match Player Limit
                </label>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={defaultMaxMatchPlayers}
                  onChange={(e) => setDefaultMaxMatchPlayers(Number(e.target.value))}
                  className="w-full rounded-2xl border border-[#e1e7df] p-2 text-xs font-medium text-[#17201c]"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-[#17201c] mb-1">
                Booking Cancellation Policy Notice
              </label>
              <textarea
                rows={2}
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
                className="w-full rounded-2xl border border-[#e1e7df] p-3 text-xs font-medium text-[#17201c] focus:outline-none focus:border-[#a8e63d]"
              />
            </div>
          </div>

          {/* Section 4: Audit Reason & Save */}
          <div className="pt-4 border-t border-[#edf1eb]">
            <label className="block text-xs font-bold text-[#17201c] mb-1">
              Reason for Changes (recorded in Audit Log)
            </label>
            <input
              type="text"
              placeholder="e.g. Updating operating rules for tournament season..."
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              className="w-full rounded-2xl border border-[#e1e7df] p-2.5 text-xs text-[#17201c] focus:outline-none focus:border-[#a8e63d]"
            />

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={fetchSettings}
                className="rounded-2xl border border-[#e1e7df] px-4 py-2 text-xs font-bold text-[#525f57] hover:bg-[#f8faf6]"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 rounded-2xl bg-[#17201c] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#283730] transition disabled:opacity-40"
              >
                <Save className="h-4 w-4 text-[#a8e63d]" />
                {saving ? "Saving Changes..." : "Save Platform Settings"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
