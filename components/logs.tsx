"use client";

import { useEffect, useMemo, useState } from "react";

import {
  subscribeToIrrigationLogs,
} from "@/src/lib/database";

import type { IrrigationLog } from "@/src/lib/types";

const DEVICE_ID = "ESP32_001";

export default function LogsPage() {
    const [logs, setLogs] = useState<IrrigationLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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
     * Statistics
     */
    const totalWaterings = logs.length;

    const successfulWaterings = logs.filter(
        (log) =>
            log.status === "completed" ||
            log.status === "success"
    ).length;

    const skippedWaterings = logs.filter(
        (log) => log.status === "skipped"
    ).length;

    const manualWaterings = logs.filter(
        (log) =>
            log.type === "manual" ||
            log.trigger === "manual"
    ).length;

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
}

  /*
   * CSV escaping
    */