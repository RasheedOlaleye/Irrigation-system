"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  subscribeToDevice,
  getActiveIrrigation,
  getCropProfiles,
  requestManualWatering,
} from "@/src/lib/database";

import type {
  Device,
  ActiveIrrigation,
  CropProfile,
} from "@/src/lib/types";

const DEVICE_ID = "ESP32_001";

export default function Dashboard() {
  const [device, setDevice] = useState<Device | null>(null);

  const [activeIrrigation, setActiveIrrigation] =
    useState<ActiveIrrigation | null>(null);

  const [cropProfiles, setCropProfiles] =
    useState<Record<string, CropProfile>>({});

  const [loading, setLoading] = useState(true);
  const [watering, setWatering] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [
          irrigation,
          profiles,
        ] = await Promise.all([
          getActiveIrrigation(DEVICE_ID),
          getCropProfiles(),
        ]);

        if (!mounted) return;

        setActiveIrrigation(irrigation);
        setCropProfiles(profiles);
      } catch (error) {
        console.error(
          "Failed to load irrigation data:",
          error
        );

        if (mounted) {
          setMessage(
            "Unable to load irrigation settings."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    /*
     * Real-time Firebase listener
     */
    const unsubscribe = subscribeToDevice(
      DEVICE_ID,
      (updatedDevice) => {
        if (mounted) {
          setDevice(updatedDevice);
        }
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  /*
   * Manual watering
   */
  async function handleManualWatering() {
    if (watering) return;

    setWatering(true);
    setMessage("");

    try {
      const duration =
        activeIrrigation?.cycleDurationSeconds ?? 5;

      await requestManualWatering(
        DEVICE_ID,
        duration
      );

      setMessage(
        "Manual watering request sent to the system."
      );
    } catch (error) {
      console.error(
        "Manual watering failed:",
        error
      );

      setMessage(
        "Unable to send the watering request."
      );
    } finally {
      setWatering(false);
    }
  }

  /*
   * Values from Firebase
   */
  const online = device?.online ?? false;

  const pumpRunning =
    device?.pump?.state === "on";

  const soilState =
    device?.sensor?.moistureState ?? "unknown";

  const plannedCycles =
    device?.irrigation?.plannedCyclesToday ?? 0;

  const completedCycles =
    device?.irrigation?.completedCyclesToday ?? 0;

  const skippedCycles =
    device?.irrigation?.skippedCyclesToday ?? 0;

  const currentCycle =
    device?.irrigation?.currentCycle ?? 0;

  const remainingCycles = Math.max(
    plannedCycles -
      completedCycles -
      skippedCycles,
    0
  );

  const cropName =
    activeIrrigation?.crop
      ? cropProfiles[
          activeIrrigation.crop
        ]?.name ?? activeIrrigation.crop
      : "No plant selected";

  /*
   * Format timestamp
   */
  function formatDate(timestamp: number) {
    if (!timestamp) return "Not available";

    return new Date(timestamp).toLocaleString(
      undefined,
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

  function formatNextCycle(timestamp: number) {
    if (!timestamp) {
      return "Not scheduled";
    }

    return formatDate(timestamp);
  }

  /*
   * State label
   */
  function getStateLabel(state?: string) {
    switch (state) {
      case "watering":
        return "Watering";

      case "manual_watering":
        return "Manual watering";

      case "soaking":
        return "Soaking";

      case "waiting_interval":
        return "Waiting for next cycle";

      case "checking_sensor":
        return "Checking soil";

      case "day_complete":
        return "Today's schedule complete";

      case "idle":
        return "Idle";

      case "error":
        return "System error";

      case "offline":
        return "Offline";

      default:
        return "Waiting";
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm font-semibold text-blue-600">
                Smart Irrigation
              </p>

              <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                Dashboard
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Monitor and control your irrigation system.
              </p>
            </div>

            {/* Device status */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

              <span
                className={`h-3 w-3 rounded-full ${
                  online
                    ? "bg-emerald-500"
                    : "bg-slate-300"
                }`}
              />

              <div>
                <p className="text-xs text-slate-400">
                  Device
                </p>

                <p className="text-sm font-semibold text-slate-800">
                  {online
                    ? "Online"
                    : "Offline"}
                </p>
              </div>

            </div>

          </div>

        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Message */}
        {message && (
          <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {message}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
            Loading irrigation system...
          </div>
        )}

        {/* Overview cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* Soil */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-slate-500">
                  Soil condition
                </p>

                <p className="mt-2 text-2xl font-bold capitalize text-slate-900">
                  {soilState}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
                💧
              </div>

            </div>

            <p className="mt-4 text-xs text-slate-400">
              Last checked:{" "}
              {formatDate(
                device?.sensor?.lastCheckedAt ?? 0
              )}
            </p>

          </div>

          {/* Pump */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-slate-500">
                  Pump
                </p>

                <p
                  className={`mt-2 text-2xl font-bold ${
                    pumpRunning
                      ? "text-blue-600"
                      : "text-slate-900"
                  }`}
                >
                  {pumpRunning
                    ? "Running"
                    : "Off"}
                </p>
              </div>

              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${
                  pumpRunning
                    ? "bg-blue-100"
                    : "bg-slate-100"
                }`}
              >
                ⚙️
              </div>

            </div>

            <p className="mt-4 text-xs text-slate-400">
              {device?.pump?.lastStartedAt
                ? `Last started ${formatDate(
                    device.pump.lastStartedAt
                  )}`
                : "No recent activity"}
            </p>

          </div>

          {/* Completed cycles */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-slate-500">
                  Completed cycles
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {completedCycles}
                  <span className="ml-1 text-sm font-medium text-slate-400">
                    / {plannedCycles}
                  </span>
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                ✓
              </div>

            </div>

            <p className="mt-4 text-xs text-slate-400">
              {remainingCycles} cycle
              {remainingCycles === 1
                ? ""
                : "s"} remaining
            </p>

          </div>

          {/* Current crop */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div className="min-w-0">
                <p className="text-sm text-slate-500">
                  Current plant
                </p>

                <p className="mt-2 truncate text-2xl font-bold capitalize text-slate-900">
                  {cropName}
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
                🌱
              </div>

            </div>

            <Link
              href="/plant"
              className="mt-4 inline-block text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Change plant →
            </Link>

          </div>

        </div>

        {/* Main grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Irrigation status */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-sm font-semibold text-blue-600">
                  Irrigation
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Today&apos;s watering
                </h2>
              </div>

              <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                {getStateLabel(device?.state)}
              </div>

            </div>

            {/* Progress */}
            <div className="mt-7">

              <div className="mb-2 flex items-center justify-between text-sm">

                <span className="text-slate-500">
                  Daily progress
                </span>

                <span className="font-semibold text-slate-900">
                  {completedCycles +
                    skippedCycles}{" "}
                  / {plannedCycles}
                </span>

              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-100">

                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-500"
                  style={{
                    width:
                      plannedCycles > 0
                        ? `${Math.min(
                            ((completedCycles +
                              skippedCycles) /
                              plannedCycles) *
                              100,
                            100
                          )}%`
                        : "0%",
                  }}
                />

              </div>

            </div>

            {/* Cycle information */}
            <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4">

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">
                  Planned
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {plannedCycles}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">
                  Completed
                </p>

                <p className="mt-1 text-xl font-bold text-emerald-600">
                  {completedCycles}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">
                  Skipped
                </p>

                <p className="mt-1 text-xl font-bold text-amber-600">
                  {skippedCycles}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">
                  Current cycle
                </p>

                <p className="mt-1 text-xl font-bold text-blue-600">
                  {currentCycle}
                </p>
              </div>

            </div>

            {/* Next cycle */}
            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                  ⏱️
                </div>

                <div>
                  <p className="text-xs text-blue-600">
                    Next watering cycle
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatNextCycle(
                      device?.irrigation
                        ?.nextCycleAt ?? 0
                    )}
                  </p>
                </div>

              </div>

            </div>

          </div>

          {/* Manual control */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <p className="text-sm font-semibold text-blue-600">
              Manual control
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Water plant
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Start one watering cycle manually. The system
              will use the configured pump duration for{" "}
              <span className="font-semibold text-slate-700">
                {cropName}
              </span>
              .
            </p>

            <button
              onClick={handleManualWatering}
              disabled={
                watering ||
                !online ||
                !activeIrrigation
              }
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {watering ? (
                <>
                  <span className="animate-spin">
                    ⟳
                  </span>

                  Sending request...
                </>
              ) : (
                <>
                  💧 Water Now
                </>
              )}
            </button>

            {!online && (
              <p className="mt-3 text-center text-xs text-slate-400">
                Device must be online to receive commands.
              </p>
            )}

            {!activeIrrigation && online && (
              <p className="mt-3 text-center text-xs text-amber-600">
                Select a plant before watering.
              </p>
            )}

          </div>

        </div>

        {/* Configuration */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm font-semibold text-blue-600">
                Current configuration
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                {cropName}
              </h2>
            </div>

            <Link
              href="/plant"
              className="rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              Change plant
            </Link>

          </div>

          {activeIrrigation ? (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">

              <ConfigItem
                label="Pump duration"
                value={`${activeIrrigation.cycleDurationSeconds}s`}
              />

              <ConfigItem
                label="Cycles per day"
                value={`${activeIrrigation.cyclesPerDay}`}
              />

              <ConfigItem
                label="Watering interval"
                value={formatInterval(
                  activeIrrigation.preferredIntervalMinutes
                )}
              />

              <ConfigItem
                label="Soak time"
                value={`${activeIrrigation.soakDurationSeconds}s`}
              />

            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
              No plant has been configured yet.
              <Link
                href="/plant"
                className="ml-1 font-semibold text-blue-600"
              >
                Configure a plant
              </Link>
            </div>
          )}

        </div>

        {/* Device information */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <p className="text-sm font-semibold text-blue-600">
              Device
            </p>

            <div className="mt-4 space-y-4">

              <InfoRow
                label="Device ID"
                value={DEVICE_ID}
              />

              <InfoRow
                label="Firmware"
                value={
                  device?.firmwareVersion ??
                  "Unknown"
                }
              />

              <InfoRow
                label="Device state"
                value={getStateLabel(device?.state)}
              />

              <InfoRow
                label="Last seen"
                value={formatDate(
                  device?.lastSeen ?? 0
                )}
              />

            </div>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <p className="text-sm font-semibold text-blue-600">
              Quick links
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3">

              <Link
                href="/plant"
                className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50"
              >
                <p className="font-semibold text-slate-900">
                  🌱 Plant settings
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Configure the crop and irrigation schedule.
                </p>
              </Link>

              <Link
                href="/logs"
                className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50"
              >
                <p className="font-semibold text-slate-900">
                  📋 Irrigation logs
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  View watering history and system activity.
                </p>
              </Link>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}


/*
 * Configuration card
 */
function ConfigItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}


/*
 * Device information row
 */
function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">

      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="max-w-[60%] truncate text-right text-sm font-semibold text-slate-900">
        {value}
      </span>

    </div>
  );
}


/*
 * Format minutes
 */
function formatInterval(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}