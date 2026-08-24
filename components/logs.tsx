"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Filter, Search, TrendingUp } from "lucide-react";

import {
  subscribeToIrrigationLogs,
} from "@/src/lib/database";

import type { IrrigationLog } from "@/src/lib/types";

const DEVICE_ID = "ESP32_001";

type FilterType = "all" | "successful" | "skipped" | "manual" | "failed";

export default function LogsPage() {
  const [logs, setLogs] = useState<IrrigationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  /*
   * Subscribe to Firebase logs
   */
  useEffect(() => {
    setLoading(true);
    setError("");

    const unsubscribe = subscribeToIrrigationLogs(
      DEVICE_ID,
      (data) => {
        setLogs(data);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  /*
   * Sort newest first
   */
  const sortedLogs = useMemo(() => {
    return [...logs].sort(
      (a, b) =>
        (b.timestamp ?? 0) -
        (a.timestamp ?? 0)
    );
  }, [logs]);

  /*
   * Filter logs
   */
  const filteredLogs = useMemo(() => {
    let filtered = sortedLogs;

    // Apply status filter
    if (filterType === "successful") {
      filtered = filtered.filter(
        (log) => log.status === "completed"
      );
    } else if (filterType === "skipped") {
      filtered = filtered.filter(
        (log) => log.status === "skipped"
      );
    } else if (filterType === "failed") {
      filtered = filtered.filter(
        (log) => log.status === "failed"
      );
    } else if (filterType === "manual") {
      filtered = filtered.filter(
        (log) =>
          log.type === "manual" ||
          log.trigger === "manual"
      );
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          (log.crop || "").toLowerCase().includes(term) ||
          (log.status || "").toLowerCase().includes(term) ||
          (log.type || "").toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [sortedLogs, filterType, searchTerm]);

  /*
   * Statistics
   */
  const statistics = useMemo(() => {
    const total = logs.length;
    const successful = logs.filter(
      (log) =>
        log.status === "completed" ||
        log.status === "success"
    ).length;
    const skipped = logs.filter(
      (log) => log.status === "skipped"
    ).length;
    const failed = logs.filter(
      (log) => log.status === "failed"
    ).length;
    const manual = logs.filter(
      (log) =>
        log.type === "manual" ||
        log.trigger === "manual"
    ).length;

    return {
      total,
      successful,
      skipped,
      failed,
      manual,
      successRate:
        total > 0
          ? Math.round((successful / total) * 100)
          : 0,
    };
  }, [logs]);

  /*
   * Format date
   */
  function formatDate(timestamp?: number) {
    if (!timestamp) {
      return "Unknown";
    }

    return new Date(timestamp).toLocaleString(
      undefined,
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

  /*
   * CSV escaping
   */
  function escapeCSV(value: any): string {
    if (value === null || value === undefined) {
      return "";
    }

    const stringValue = String(value);

    // If the value contains comma, double quote, or newline, wrap it in quotes
    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      // Escape double quotes by doubling them
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  /*
   * Export to CSV
   */
  function exportToCSV() {
    if (filteredLogs.length === 0) {
      alert("No logs to export");
      return;
    }

    // Headers
    const headers = [
      "Date & Time",
      "Crop",
      "Status",
      "Type",
      "Duration (s)",
      "Soak Duration (s)",
      "Notes",
    ];

    // Rows
    const rows = filteredLogs.map((log) => [
      formatDate(log.timestamp),
      escapeCSV(log.crop || "-"),
      escapeCSV(log.status || "-"),
      escapeCSV(log.type || "-"),
      escapeCSV(log.durationSeconds || "-"),
      escapeCSV(log.soakDurationSeconds || "-"),
      escapeCSV(log.notes || "-"),
    ]);

    // Build CSV
    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Download
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `irrigation-logs-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              Irrigation Logs
            </h1>
            <p className="text-slate-400">
              Device: {DEVICE_ID}
            </p>
          </div>
          <button
            onClick={exportToCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Total Waterings"
            value={statistics.total}
            icon="💧"
            color="bg-blue-500/10 border-blue-500/20"
          />
          <StatCard
            label="Successful"
            value={statistics.successful}
            icon="✓"
            color="bg-emerald-500/10 border-emerald-500/20"
          />
          <StatCard
            label="Skipped"
            value={statistics.skipped}
            icon="⊘"
            color="bg-yellow-500/10 border-yellow-500/20"
          />
          <StatCard
            label="Failed"
            value={statistics.failed}
            icon="✕"
            color="bg-red-500/10 border-red-500/20"
          />
          <StatCard
            label="Success Rate"
            value={`${statistics.successRate}%`}
            icon={<TrendingUp size={20} />}
            color="bg-purple-500/10 border-purple-500/20"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by crop, status, type..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="flex gap-2">
            <Filter
              className="text-slate-400 hidden sm:block"
              size={18}
            />
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(
                  e.target.value as FilterType
                )
              }
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Logs</option>
              <option value="successful">
                Successful
              </option>
              <option value="skipped">Skipped</option>
              <option value="failed">Failed</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-slate-400">
              {searchTerm || filterType !== "all"
                ? "No logs match your filters"
                : "No logs yet"}
            </p>
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900/50 border-b border-slate-700">
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">
                      Date & Time
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">
                      Crop
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">
                      Duration (s)
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">
                      Soak (s)
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(
                    (log, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-200">
                          {formatDate(
                            log.timestamp
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-200 font-medium">
                          {log.crop || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={
                              log.status ||
                              "unknown"
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <TypeBadge
                            type={log.type || "-"}
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {log.durationSeconds ||
                            "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {log.soakDurationSeconds ||
                            "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">
                          {log.notes || "-"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-slate-900/30 border-t border-slate-700 text-sm text-slate-400">
              Showing {filteredLogs.length} of{" "}
              {logs.length} logs
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/*
 * Status Badge Component
 */
function StatusBadge({
  status,
}: {
  status: string;
}) {
  const statusConfig: Record<string, { color: string; label: string }> = {
    success: {
      color: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
      label: "Success",
    },
    completed: {
      color: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
      label: "Completed",
    },
    skipped: {
      color: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
      label: "Skipped",
    },
    failed: {
      color: "bg-red-500/20 text-red-300 border border-red-500/30",
      label: "Failed",
    },
    pending: {
      color: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
      label: "Pending",
    },
  };

  const config =
    statusConfig[status] ||
    statusConfig["pending"];

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold ${config.color}`}
    >
      {config.label}
    </span>
  );
}

/*
 * Type Badge Component
 */
function TypeBadge({ type }: { type: string }) {
  const typeConfig: Record<string, { icon: string; label: string }> = {
    scheduled: { icon: "📅", label: "Scheduled" },
    manual: { icon: "👆", label: "Manual" },
    automatic: { icon: "⚙️", label: "Automatic" },
  };

  const config = typeConfig[type] || typeConfig["automatic"];

  return (
    <span className="flex items-center gap-1 text-slate-300">
      {config.icon} {config.label}
    </span>
  );
}

/*
 * Stat Card Component
 */
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string | React.ReactNode;
  color: string;
}) {
  return (
    <div
      className={`p-4 rounded-lg border ${color} backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-400 text-sm">
          {label}
        </p>
        <span className="text-xl">
          {typeof icon === "string"
            ? icon
            : icon}
        </span>
      </div>
      <p className="text-2xl font-bold text-white">
        {value}
      </p>
    </div>
  );
}