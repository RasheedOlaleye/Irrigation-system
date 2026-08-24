"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Search, TrendingUp } from "lucide-react";

import { subscribeToIrrigationLogs } from "@/src/lib/database";
import type { IrrigationLog, IrrigationLogStatus, MoistureState } from "@/src/lib/types";

const DEVICE_ID = "ESP32_001";

// Firebase returns a Record — we enrich each entry with its key
interface IrrigationLogEntry extends IrrigationLog {
  id: string;
}

type FilterType = "all" | "completed" | "skipped" | "failed" | "manual" | "automatic";

export default function LogsPage() {
  const [logs, setLogs] = useState<IrrigationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  /*
   * Subscribe to Firebase logs
   * subscribeToIrrigationLogs returns Record<string, IrrigationLog>
   * — convert to array and attach the Firebase push key as `id`
   */
  useEffect(() => {
    setLoading(true);
    setError("");

    const unsubscribe = subscribeToIrrigationLogs(
      DEVICE_ID,
      (data: Record<string, IrrigationLog>) => {
        const entries: IrrigationLogEntry[] = Object.entries(data).map(
          ([id, log]) => ({ id, ...log })
        );
        setLogs(entries);
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
      (a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)
    );
  }, [logs]);

  /*
   * Filter logs
   */
  const filteredLogs = useMemo(() => {
    let filtered = sortedLogs;

    if (filterType === "completed") {
      filtered = filtered.filter((log) => log.status === "completed");
    } else if (filterType === "skipped") {
      filtered = filtered.filter((log) => log.status === "skipped");
    } else if (filterType === "failed") {
      filtered = filtered.filter((log) => log.status === "failed");
    } else if (filterType === "manual") {
      filtered = filtered.filter((log) => log.type === "manual");
    } else if (filterType === "automatic") {
      filtered = filtered.filter((log) => log.type === "automatic");
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.status.toLowerCase().includes(term) ||
          log.type.toLowerCase().includes(term) ||
          (log.reason ?? "").toLowerCase().includes(term) ||
          (log.soilBefore ?? "").toLowerCase().includes(term) ||
          (log.soilAfter ?? "").toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [sortedLogs, filterType, searchTerm]);

  /*
   * Statistics — only valid IrrigationLogStatus values
   */
  const statistics = useMemo(() => {
    const total = logs.length;
    const completed = logs.filter((l) => l.status === "completed").length;
    const skipped = logs.filter((l) => l.status === "skipped").length;
    const failed = logs.filter((l) => l.status === "failed").length;
    const manual = logs.filter((l) => l.type === "manual").length;

    return {
      total,
      completed,
      skipped,
      failed,
      manual,
      successRate:
        total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [logs]);

  /*
   * Format date
   */
  function formatDate(timestamp?: number) {
    if (!timestamp) return "Unknown";
    return new Date(timestamp).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  /*
   * CSV escaping
   */
  function escapeCSV(value: unknown): string {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /*
   * Export to CSV — uses only fields that exist on IrrigationLog
   */
  function exportToCSV() {
    if (filteredLogs.length === 0) {
      alert("No logs to export");
      return;
    }

    const headers = [
      "Date & Time",
      "Type",
      "Cycle #",
      "Status",
      "Pump Duration (s)",
      "Soil Before",
      "Soil After",
      "Reason",
    ];

    const rows = filteredLogs.map((log) => [
      escapeCSV(formatDate(log.timestamp)),
      escapeCSV(log.type),
      escapeCSV(log.cycleNumber ?? "-"),
      escapeCSV(log.status),
      escapeCSV(log.pumpDurationSeconds ?? "-"),
      escapeCSV(log.soilBefore ?? "-"),
      escapeCSV(log.soilAfter ?? "-"),
      escapeCSV(log.reason ?? "-"),
    ]);

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `irrigation-logs-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
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
            <p className="text-slate-400">Device: {DEVICE_ID}</p>
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

        {/* Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total" value={statistics.total} icon="💧" color="bg-blue-500/10 border-blue-500/20" />
          <StatCard label="Completed" value={statistics.completed} icon="✓" color="bg-emerald-500/10 border-emerald-500/20" />
          <StatCard label="Skipped" value={statistics.skipped} icon="⊘" color="bg-yellow-500/10 border-yellow-500/20" />
          <StatCard label="Failed" value={statistics.failed} icon="✕" color="bg-red-500/10 border-red-500/20" />
          <StatCard label="Manual" value={statistics.manual} icon="👆" color="bg-purple-500/10 border-purple-500/20" />
          <StatCard label="Success Rate" value={`${statistics.successRate}%`} icon={<TrendingUp size={16} />} color="bg-sky-500/10 border-sky-500/20" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by status, type, reason, soil state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Logs</option>
            <option value="completed">Completed</option>
            <option value="skipped">Skipped</option>
            <option value="failed">Failed</option>
            <option value="manual">Manual</option>
            <option value="automatic">Automatic</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Table */}
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
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">Date & Time</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">Cycle #</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">Pump (s)</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">Soil Before</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">Soil After</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-200 whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={log.type} />
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {log.cycleNumber ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        {log.pumpDurationSeconds ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        {log.soilBefore
                          ? <SoilBadge state={log.soilBefore} />
                          : <span className="text-slate-500">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        {log.soilAfter
                          ? <SoilBadge state={log.soilAfter} />
                          : <span className="text-slate-500">-</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">
                        {log.reason ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-slate-900/30 border-t border-slate-700 text-sm text-slate-400">
              Showing {filteredLogs.length} of {logs.length} logs
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IrrigationLogStatus }) {
  const config: Record<IrrigationLogStatus, { color: string; label: string }> = {
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
  };

  const { color, label } = config[status];

  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: "automatic" | "manual" }) {
  return type === "manual" ? (
    <span className="flex items-center gap-1 text-purple-300 text-xs font-medium">
      👆 Manual
    </span>
  ) : (
    <span className="flex items-center gap-1 text-sky-300 text-xs font-medium">
      ⚙️ Automatic
    </span>
  );
}

function SoilBadge({ state }: { state: MoistureState }) {
  const config: Record<MoistureState, { color: string; label: string }> = {
    dry: {
      color: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
      label: "Dry",
    },
    wet: {
      color: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
      label: "Wet",
    },
    unknown: {
      color: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
      label: "Unknown",
    },
  };

  const { color, label } = config[state];

  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

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
    <div className={`p-4 rounded-lg border ${color} backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-400 text-xs">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}