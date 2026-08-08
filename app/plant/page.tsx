"use client";

import { useState } from "react";
import { get, ref, update } from "firebase/database";
import { database } from "@/src/lib/firebase";
import { useRouter } from "next/navigation";

type CropProfile = {
  name: string;
  minMoisture: number;
  targetMoisture: number;
  maxMoisture: number;
  maxPumpRuntimeSeconds: number;
  minimumWateringIntervalSeconds: number;
  maximumDailyWateringCycles: number;
};

export default function PlantPage() {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [crop, setCrop] = useState<CropProfile | null>(null);
  const [cropKey, setCropKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function findPlant() {
    if (!message.trim()) return;

    setLoading(true);
    setError("");
    setCrop(null);

    try {
      const snapshot = await get(ref(database, "cropProfiles"));

      if (!snapshot.exists()) {
        setError("No crop profiles are available.");
        return;
      }

      const profiles = snapshot.val();

      const text = message.toLowerCase();

      const matchedKey = Object.keys(profiles).find((key) => {
        const profile = profiles[key];

        return (
          text.includes(key.toLowerCase()) ||
          text.includes(profile.name.toLowerCase())
        );
      });

      if (!matchedKey) {
        setError(
          "I couldn't find that plant yet. Try a crop such as tomato, pepper, lettuce, or carrot."
        );
        return;
      }

      setCropKey(matchedKey);
      setCrop(profiles[matchedKey]);
    } catch (err) {
      console.error(err);
      setError("Unable to find the plant. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function useSettings() {
    if (!crop || !cropKey) return;

    setSaving(true);
    setError("");

    try {
      await update(ref(database), {
        "system/activeCrop": cropKey,

        [`activeConfigurations/ESP32_001`]: {
          crop: cropKey,
          minMoisture: crop.minMoisture,
          targetMoisture: crop.targetMoisture,
          maxMoisture: crop.maxMoisture,
          maxPumpRuntimeSeconds: crop.maxPumpRuntimeSeconds,
          minimumWateringIntervalSeconds:
            crop.minimumWateringIntervalSeconds,
          maximumDailyWateringCycles:
            crop.maximumDailyWateringCycles,
          updatedAt: Date.now(),
        },
      });

      router.push("/");
    } catch (err) {
      console.error(err);
      setError("Unable to save the crop settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[90vh] max-w-2xl items-center">
        <div className="w-full">

          <div className="mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-2xl">
              🌱
            </div>

            <p className="text-sm font-semibold text-blue-600">
              Plant Setup
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              What are you planting?
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
              Tell us what you want to grow and we&apos;ll configure the
              irrigation system using the crop profile.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

            <div className="mb-6 space-y-4">

              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  🌱
                </div>

                <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-sm text-slate-700">
                  What plant would you like to grow?
                </div>
              </div>

              {message && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3 text-sm text-white">
                    {message}
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
                    🌱
                  </div>

                  <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-sm text-slate-500">
                    Looking for your plant...
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {crop && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">

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
                    I found a configuration for {crop.name}. Your irrigation
                    system will use these moisture thresholds.
                  </p>

                  <div className="grid grid-cols-3 gap-3">

                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-400">
                        Minimum
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {crop.minMoisture}%
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-400">
                        Target
                      </p>

                      <p className="mt-1 text-lg font-bold text-blue-600">
                        {crop.targetMoisture}%
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-400">
                        Maximum
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {crop.maxMoisture}%
                      </p>
                    </div>

                  </div>

                  <button
                    onClick={useSettings}
                    disabled={saving}
                    className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving
                      ? "Applying settings..."
                      : `Use ${crop.name} Settings`}
                  </button>

                </div>
              )}

            </div>

            <div className="flex gap-3 border-t border-slate-100 pt-5">

              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    findPlant();
                  }
                }}
                placeholder="e.g. I want to plant tomatoes"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <button
                onClick={findPlant}
                disabled={loading || !message.trim()}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>

            </div>

          </div>

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