export type MoistureState = "dry" | "wet" | "unknown";

export type DeviceState =
  | "offline"
  | "idle"
  | "waiting_interval"
  | "checking_sensor"
  | "watering"
  | "soaking"
  | "manual_watering"
  | "day_complete"
  | "error";

export type PumpState = "on" | "off";

export type IrrigationLogStatus =
  | "completed"
  | "skipped"
  | "failed";

export interface CropProfile {
  name: string;
  cycleDurationSeconds: number;
  soakDurationSeconds: number;
  cyclesPerDay: number;
  preferredIntervalMinutes: number;
  minimumIntervalMinutes: number;
  maxCyclesPerDay: number;
  enabled: boolean;
}

export interface SystemConfig {
  name: string;
  ownerName: string;
  deviceId: string;
  activeCrop: string;
  enabled: boolean;
  createdAt: number;
}

export interface SensorStatus {
  moistureState: MoistureState;
  rawValue: number;
  lastCheckedAt: number;
}

export interface PumpStatus {
  state: PumpState;
  lastStartedAt: number;
  lastStoppedAt: number;
}

export interface IrrigationStatus {
  plannedCyclesToday: number;
  completedCyclesToday: number;
  skippedCyclesToday: number;
  lastCycleAt: number;
  nextCycleAt: number;
  currentCycle: number;
}

export interface Device {
  name: string;
  online: boolean;
  state: DeviceState;
  lastSeen: number;
  firmwareVersion: string;
  sensor: SensorStatus;
  pump: PumpStatus;
  irrigation: IrrigationStatus;
}

export interface ActiveIrrigation {
  crop: string;
  cycleDurationSeconds: number;
  soakDurationSeconds: number;
  cyclesPerDay: number;
  preferredIntervalMinutes: number;
  minimumIntervalMinutes: number;
  maxCyclesPerDay: number;
  scheduleStartTime: string;
  enabled: boolean;
  updatedAt: number;
}

export interface ManualWateringCommand {
  requested: boolean;
  durationSeconds: number;
  requestedAt: number;
  requestId: string;
  status: "idle" | "pending" | "completed" | "failed";
}

export interface IrrigationLog {
  timestamp: number;
  type: "automatic" | "manual";
  cycleNumber?: number;
  status: IrrigationLogStatus;
  reason?: string;
  soilBefore?: MoistureState;
  soilAfter?: MoistureState;
  pumpDurationSeconds?: number;
}

export interface SensorLog {
  timestamp: number;
  moistureState: MoistureState;
  rawValue: number;
}