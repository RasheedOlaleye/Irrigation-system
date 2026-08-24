import {
  get,
  ref,
  set,
  update,
  push,
  onValue,
  off,
} from "firebase/database";

import { database } from "./firebase";

import type {
  CropProfile,
  SystemConfig,
  Device,
  ActiveIrrigation,
  ManualWateringCommand,
  IrrigationLog,
  SensorLog,
} from "./types";


// ============================================================
// SYSTEM
// ============================================================

export async function getSystem(): Promise<SystemConfig | null> {
  const snapshot = await get(ref(database, "system"));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val() as SystemConfig;
}


export async function updateSystem(
  data: Partial<SystemConfig>
): Promise<void> {
  await update(ref(database, "system"), data);
}


// ============================================================
// CROP PROFILES
// ============================================================

export async function getCropProfiles(): Promise<
  Record<string, CropProfile>
> {
  const snapshot = await get(ref(database, "cropProfiles"));

  if (!snapshot.exists()) {
    return {};
  }

  return snapshot.val() as Record<string, CropProfile>;
}


export async function getCropProfile(
  crop: string
): Promise<CropProfile | null> {
  const snapshot = await get(
    ref(database, `cropProfiles/${crop}`)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val() as CropProfile;
}


// ============================================================
// ACTIVE IRRIGATION
// ============================================================

export async function getActiveIrrigation(
  deviceId: string
): Promise<ActiveIrrigation | null> {
  const snapshot = await get(
    ref(database, `activeIrrigation/${deviceId}`)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val() as ActiveIrrigation;
}


export async function setActiveCrop(
  deviceId: string,
  crop: string,
  profile: CropProfile
): Promise<void> {
  const activeIrrigation: ActiveIrrigation = {
    crop,
    cycleDurationSeconds: profile.cycleDurationSeconds,
    soakDurationSeconds: profile.soakDurationSeconds,
    cyclesPerDay: profile.cyclesPerDay,
    preferredIntervalMinutes:
      profile.preferredIntervalMinutes,
    minimumIntervalMinutes:
      profile.minimumIntervalMinutes,
    maxCyclesPerDay: profile.maxCyclesPerDay,
    scheduleStartTime: "08:00",
    enabled: true,
    updatedAt: Date.now(),
  };

  await set(
    ref(database, `activeIrrigation/${deviceId}`),
    activeIrrigation
  );

  await update(ref(database, "system"), {
    activeCrop: crop,
  });
}


// ============================================================
// DEVICES
// ============================================================

export async function getDevice(
  deviceId: string
): Promise<Device | null> {
  const snapshot = await get(
    ref(database, `devices/${deviceId}`)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val() as Device;
}


export function subscribeToDevice(
  deviceId: string,
  callback: (device: Device | null) => void
): () => void {
  const deviceRef = ref(
    database,
    `devices/${deviceId}`
  );

  const unsubscribe = onValue(deviceRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    callback(snapshot.val() as Device);
  });

  return unsubscribe;
}


// ============================================================
// MANUAL PUMP
// ============================================================

export async function requestManualWatering(
  deviceId: string,
  durationSeconds = 5
): Promise<string> {
  const requestId = push(
    ref(database, `commands/${deviceId}/manualWatering`)
  ).key;

  if (!requestId) {
    throw new Error("Unable to generate request ID");
  }

  const command: ManualWateringCommand = {
    requested: true,
    durationSeconds,
    requestedAt: Date.now(),
    requestId,
    status: "pending",
  };

  await set(
    ref(database, `commands/${deviceId}/manualWatering`),
    command
  );

  return requestId;
}


export async function getManualWateringCommand(
  deviceId: string
): Promise<ManualWateringCommand | null> {
  const snapshot = await get(
    ref(database, `commands/${deviceId}/manualWatering`)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val() as ManualWateringCommand;
}


// ============================================================
// IRRIGATION LOGS
// ============================================================

export async function addIrrigationLog(
  deviceId: string,
  log: IrrigationLog
): Promise<string> {
  const logsRef = ref(
    database,
    `logs/${deviceId}/irrigation`
  );

  const newLog = push(logsRef);

  if (!newLog.key) {
    throw new Error("Unable to create irrigation log");
  }

  await set(newLog, log);

  return newLog.key;
}


export async function getIrrigationLogs(
  deviceId: string
): Promise<Record<string, IrrigationLog>> {
  const snapshot = await get(
    ref(database, `logs/${deviceId}/irrigation`)
  );

  if (!snapshot.exists()) {
    return {};
  }

  return snapshot.val() as Record<string, IrrigationLog>;
}


// ============================================================
// SENSOR LOGS
// ============================================================

export async function addSensorLog(
  deviceId: string,
  log: SensorLog
): Promise<string> {
  const logsRef = ref(
    database,
    `logs/${deviceId}/sensor`
  );

  const newLog = push(logsRef);

  if (!newLog.key) {
    throw new Error("Unable to create sensor log");
  }

  await set(newLog, log);

  return newLog.key;
}


export async function getSensorLogs(
  deviceId: string
): Promise<Record<string, SensorLog>> {
  const snapshot = await get(
    ref(database, `logs/${deviceId}/sensor`)
  );

  if (!snapshot.exists()) {
    return {};
  }

  return snapshot.val() as Record<string, SensorLog>;
}


// ============================================================
// DEVICE CONFIGURATION
// ============================================================

export async function updateDevice(
  deviceId: string,
  data: Partial<Device>
): Promise<void> {
  await update(
    ref(database, `devices/${deviceId}`),
    data
  );
}