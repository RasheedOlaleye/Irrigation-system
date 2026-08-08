"use client";

import { useState } from "react";
import { ref, update } from "firebase/database";
import { database } from "@/src/lib/firebase";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [systemName, setSystemName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleContinue() {
    setError("");

    if (!name.trim() || !systemName.trim()) {
      setError("Please fill in both fields.");
      return;
    }

    try {
      setLoading(true);

      const systemRef = ref(database, "system");

      await update(systemRef, {
        ownerName: name.trim(),
        name: systemName.trim(),
        setupCompleted: true,
      });

      router.push("/plant");
    } catch (err) {
      console.error(err);
      setError("Unable to save your settings. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[90vh] max-w-xl items-center justify-center">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">

          <div className="mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-2xl">
              🌱
            </div>

            <p className="mb-2 text-sm font-medium text-blue-600">
              Smart Irrigation
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Let&apos;s set up your system
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Tell us a little about you and your irrigation system.
              You can change these settings later.
            </p>
          </div>

          <div className="space-y-6">

            <div>
              <label
                htmlFor="systemName"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                What should we call your system?
              </label>

              <input
                id="systemName"
                type="text"
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                placeholder="e.g. My Smart Garden"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                What&apos;s your name?
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rasheed"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              onClick={handleContinue}
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Continue"}
            </button>

          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            Your information is stored locally in your irrigation system
            configuration.
          </p>

        </div>
      </div>
    </main>
  );
}