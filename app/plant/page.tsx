"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getCropProfiles,
  setActiveCrop,
} from "@/src/lib/database";

import type { CropProfile } from "@/src/lib/types";

const DEVICE_ID = "ESP32_001";

export default function PlantPage() {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [crop, setCrop] = useState<CropProfile | null>(null);
  const [cropKey, setCropKey] = useState("");

  const [profiles, setProfiles] = useState<
    Record<string, CropProfile>
  >({});

  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  /*
   * Load crop profiles from Firebase
   */
  useEffect(() => {
    async function loadProfiles() {
      try {
        setLoadingProfiles(true);

        const data = await getCropProfiles();

        setProfiles(data);
      } catch (err) {
        console.error("Failed to load crop profiles:", err);
        setError(
          "Unable to load plant profiles. Please try again."
        );
      } finally {
        setLoadingProfiles(false);
      }
    }

    loadProfiles();
  }, []);

  /*
   * Find plant from user's message
   */
  function findPlant() {
    if (!message.trim()) return;

    setLoading(true);
    setError("");
    setCrop(null);
    setCropKey("");

    try {
      const text = message.trim().toLowerCase();

      const matchedKey = Object.keys(profiles).find((key) => {
        const profile = profiles[key];

        const cropName = profile.name.toLowerCase();

        return (
          text.includes(key.toLowerCase()) ||
          text.includes(cropName)
        );
      });

      if (!matchedKey) {
        setError(
          "I couldn't find that plant yet. Try a crop such as tomato, pepper, lettuce, cucumber, carrot, or spinach."
        );

        return;
      }

      setCropKey(matchedKey);
      setCrop(profiles[matchedKey]);
    } catch (err) {
      console.error("Plant search error:", err);

      setError(
        "Unable to find the plant. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Apply selected crop configuration
   */
  async function useSettings() {
    if (!crop || !cropKey) return;

    setSaving(true);
    setError("");

    try {
      await setActiveCrop(
        DEVICE_ID,
        cropKey,
        crop
      );

      router.push("/");
    } catch (err) {
      console.error(
        "Failed to save crop settings:",
        err
      );

      setError(
        "Unable to save the crop settings. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * Format minutes for display
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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[90vh] max-w-2xl items-center">
        <div className="w-full">

          {/* Header */}
          <div className="mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-2xl shadow-sm">
              🌱
            </div>

            <p className="text-sm font-semibold text-blue-600">
              Plant Setup
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              What are you planting?
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
              Tell us what you want to grow and the irrigation
              system will configure the watering schedule using
              the crop profile.
            </p>
          </div>

          {/* Chat container */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

            <div className="mb-6 space-y-4">

              {/* System message */}
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  🌱
                </div>

                <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-sm text-slate-700">
                  What plant would you like to grow?
                </div>
              </div>

              {/* User message */}
              {message && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3 text-sm text-white">
                    {message}
                  </div>
                </div>
              )}

              {/* Loading */}
              {(loading || loadingProfiles) && (
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
                    🌱
                  </div>

                  <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-sm text-slate-500">
                    {loadingProfiles
                      ? "Loading plant profiles..."
                      : "Looking for your plant..."}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Crop result */}
              {crop && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">

                  {/* Crop heading */}
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                      🌿
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                        Crop detected
                      </p>

                      <h2 className="text-xl font-bold text-slate-900">
                        {crop.name}
                      </h2>
                    </div>
                  </div>

                  <p className="mb-5 text-sm leading-6 text-slate-600">
                    I found a watering profile for {crop.name}.
                    The system will distribute the planned pump
                    cycles throughout the day instead of relying
                    on a moisture percentage.
                  </p>

                  {/* Crop settings */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                    {/* Cycles */}
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-400">
                        Cycles / Day
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {crop.cyclesPerDay}
                      </p>
                    </div>

                    {/* Pump duration */}
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-400">
                        Pump / Cycle
                      </p>

                      <p className="mt-1 text-lg font-bold text-blue-600">
                        {crop.cycleDurationSeconds}s
                      </p>
                    </div>

                    {/* Interval */}
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-400">
                        Interval
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {formatInterval(
                          crop.preferredIntervalMinutes
                        )}
                      </p>
                    </div>

                    {/* Soak */}
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-400">
                        Soak Time
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {crop.soakDurationSeconds}s
                      </p>
                    </div>

                  </div>

                  {/* Additional information */}
                  <div className="mt-4 rounded-xl border border-blue-100 bg-white p-4">

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">
                        Minimum interval
                      </span>

                      <span className="text-sm font-semibold text-slate-900">
                        {formatInterval(
                          crop.minimumIntervalMinutes
                        )}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-sm text-slate-500">
                        Maximum cycles
                      </span>

                      <span className="text-sm font-semibold text-slate-900">
                        {crop.maxCyclesPerDay} / day
                      </span>
                    </div>

                  </div>

                  {/* Apply button */}
                  <button
                    onClick={useSettings}
                    disabled={saving}
                    className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? "Applying settings..."
                      : `Use ${crop.name} Settings`}
                  </button>

                </div>
              )}

            </div>

            {/* Chat input */}
            <div className="flex gap-3 border-t border-slate-100 pt-5">

              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    findPlant();
                  }
                }}
                disabled={loadingProfiles || loading}
                placeholder="e.g. I want to plant tomatoes"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
              />

              <button
                onClick={findPlant}
                disabled={
                  loading ||
                  loadingProfiles ||
                  !message.trim()
                }
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>

            </div>

          </div>

          {/* Back */}
          <div className="mt-5 text-center">
            <button
              onClick={() => router.push("/setup")}
              className="text-sm font-medium text-slate-500 transition hover:text-blue-600"
            >
              ← Back to system setup
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}