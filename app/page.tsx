
"use client";

import { useEffect, useState } from "react";
import { get, ref, update } from "firebase/database";
import { database } from "@/src/lib/firebase";
import AppShell from "@/components/AppShell";

type SystemData = {
  name?: string;
  ownerName?: string;
  activeCrop?: string | null;
  setupCompleted?: boolean;
};

type CropData = {
  name?: string;
  minMoisture?: number;
  targetMoisture?: number;
  maxMoisture?: number;
};

export default function Dashboard() {
  const [system, setSystem] = useState<SystemData | null>(null);
  const [crop, setCrop] = useState<CropData | null>(null);

  const [moisture, setMoisture] = useState(48);
  const [pumpOn, setPumpOn] = useState(false);
  const [cycles, setCycles] = useState(3);

  const [loading, setLoading] = useState(true);
  const [watering, setWatering] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const systemSnapshot = await get(ref(database, "system"));

        if (!systemSnapshot.exists()) {
          return;
        }

        const systemData = systemSnapshot.val();

        setSystem(systemData);

        if (systemData.activeCrop) {
          const cropSnapshot = await get(
            ref(
              database,
              `cropProfiles/${systemData.activeCrop}`
            )
          );

          if (cropSnapshot.exists()) {
            setCrop(cropSnapshot.val());
          }
        }

        /*
         * Temporary values until the ESP32 is connected.
         *
         * Later these will come from Firebase:
         *
         * devices/ESP32_001/moisture
         * devices/ESP32_001/pump
         * devices/ESP32_001/cycles
         */

        setMoisture(48);
        setPumpOn(false);
        setCycles(3);
      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  async function triggerManualWatering() {
    if (watering) return;

    try {
      setWatering(true);

      await update(ref(database, "system/manualPumpRequest"), {
        requested: true,
        requestedAt: Date.now(),
        durationSeconds: 10,
      });

      /*
       * IMPORTANT:
       * We do NOT set pumpOn to true here.
       *
       * This button sends a REQUEST.
       * The ESP32 will eventually receive the request,
       * activate the relay, and report the actual pump state.
       */

      console.log("Manual watering request sent.");
    } catch (error) {
      console.error(
        "Failed to trigger manual watering:",
        error
      );
    } finally {
      setWatering(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="text-sm text-slate-500">
            Loading your garden...
          </div>
        </main>
      </AppShell>
    );
  }

  const moistureStatus =
    crop?.targetMoisture &&
    moisture >= crop.targetMoisture
      ? "Healthy"
      : "Needs water";

  return (
    <AppShell>
      <main className="min-h-screen bg-slate-50">

        {/* Header */}
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                Smart Irrigation
              </p>

              <h1 className="mt-1 text-lg font-bold text-slate-900">
                {system?.name || "My Smart Garden"}
              </h1>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="text-xs font-medium text-emerald-700">
                System Online
              </span>
            </div>

          </div>
        </header>

        {/* Content */}
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

          {/* Welcome */}
          <div className="mb-7">
            <p className="text-sm text-slate-500">
              Welcome back,
            </p>

            <h2 className="text-2xl font-bold text-slate-900">
              {system?.ownerName || "User"} 👋
            </h2>
          </div>

          {/* Main metrics */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            {/* Soil Moisture */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Soil Moisture
                  </p>

                  <p className="mt-3 text-4xl font-bold text-slate-900">
                    {moisture}%
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
                  💧
                </div>

              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{
                    width: `${moisture}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-xs font-medium text-blue-600">
                {moistureStatus}
              </p>

            </div>

            {/* Pump */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Pump Status
                  </p>

                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    {pumpOn ? "ON" : "OFF"}
                  </p>
                </div>

                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    pumpOn
                      ? "bg-blue-100"
                      : "bg-slate-100"
                  }`}
                >
                  🚰
                </div>

              </div>

              <div className="mt-5 flex items-center gap-2">

                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    pumpOn
                      ? "bg-blue-600"
                      : "bg-slate-300"
                  }`}
                />

                <span className="text-xs text-slate-500">
                  {pumpOn
                    ? "Watering plant"
                    : "Pump is idle"}
                </span>

              </div>

            </div>

            {/* Current Plant */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Current Plant
                  </p>

                  <p className="mt-3 text-2xl font-bold capitalize text-slate-900">
                    {crop?.name ||
                      system?.activeCrop ||
                      "Not selected"}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
                  🌱
                </div>

              </div>

              <p className="mt-5 text-xs text-slate-500">
                Target moisture:{" "}
                <span className="font-semibold text-slate-700">
                  {crop?.targetMoisture ?? "--"}%
                </span>
              </p>

            </div>

            {/* Today's Cycles */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Today&apos;s Cycles
                  </p>

                  <p className="mt-3 text-4xl font-bold text-slate-900">
                    {cycles}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
                  🔄
                </div>

              </div>

              <p className="mt-5 text-xs text-slate-500">
                Automatic watering cycles
              </p>

            </div>

          </div>

          {/* Manual Watering */}
          <div className="mt-6 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-start gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
                  🚰
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">
                    Manual Watering
                  </h3>

                  <p className="mt-1 max-w-lg text-sm leading-5 text-slate-500">
                    Start a short watering cycle manually if
                    your plant needs water immediately.
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    Default duration: 10 seconds
                  </p>
                </div>

              </div>

              <button
                onClick={triggerManualWatering}
                disabled={watering}
                className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {watering
                  ? "Sending request..."
                  : "Start Watering"}
              </button>

            </div>

          </div>

          {/* Lower section */}
          <div className="mt-6 grid gap-5 lg:grid-cols-3">

            {/* Moisture Overview */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">

              <div className="flex items-center justify-between">

                <div>
                  <h3 className="font-semibold text-slate-900">
                    Moisture Overview
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Current soil moisture level
                  </p>
                </div>

                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                  Live
                </span>

              </div>

              <div className="mt-8 flex items-center justify-center">

                <div className="relative flex h-52 w-52 items-center justify-center rounded-full border-[18px] border-blue-100">

                  <div className="text-center">

                    <p className="text-4xl font-bold text-slate-900">
                      {moisture}%
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Soil moisture
                    </p>

                  </div>

                </div>

              </div>

            </div>

            {/* Plant Configuration */}
            <div className="rounded-2xl bg-blue-600 p-6 text-white shadow-sm">

              <p className="text-sm font-medium text-blue-100">
                Plant configuration
              </p>

              <h3 className="mt-2 text-xl font-bold">
                {crop?.name ||
                  system?.activeCrop ||
                  "No plant selected"}
              </h3>

              <p className="mt-3 text-sm leading-6 text-blue-100">
                Your irrigation thresholds are configured
                based on the selected crop profile.
              </p>

              <button
                onClick={() => {
                  window.location.href = "/plant";
                }}
                className="mt-6 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
              >
                Change plant
              </button>

            </div>

          </div>

        </div>

      </main>
    </AppShell>
  );
}
