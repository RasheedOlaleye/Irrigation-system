"use client";

import { useEffect, useState } from "react";

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

export function useIrrigation() {
  const [device, setDevice] = useState<Device | null>(null);

  const [activeIrrigation, setActiveIrrigation] =
    useState<ActiveIrrigation | null>(null);

  const [cropProfiles, setCropProfiles] =
    useState<Record<string, CropProfile>>({});

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [irrigation, profiles] =
          await Promise.all([
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
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

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

  async function manualWater(
    durationSeconds?: number
  ) {
    return requestManualWatering(
      DEVICE_ID,
      durationSeconds ??
        activeIrrigation?.cycleDurationSeconds ??
        5
    );
  }

  return {
    device,
    activeIrrigation,
    cropProfiles,
    loading,
    manualWater,
  };
}