export type RiskLevel = 'SAFE' | 'WARNING' | 'HIGH RISK' | 'CRITICAL';

export interface GPSData {
  fixValid: boolean;
  latitude: number | null;
  longitude: number | null;
  speedKmh: number | null;
  course: number | null;
  satellites: number | null;
  gpsTimestamp: string | null;
  isStale?: boolean;
}

export interface SensorTelemetry {
  deviceId: string;
  vesselName: string;
  timestamp: string;
  mode: 'SIMULATION' | 'REAL_HARDWARE';
  
  // Passenger Counting (2x HC-SR04)
  passengerCount: number;
  entryCount: number;
  exitCount: number;
  maxCapacity: number;
  capacityPercentage: number;
  
  // Load Monitoring (2x Load Cells + HX711)
  leftLoad: number | null; // kg
  rightLoad: number | null; // kg
  totalLoad: number | null; // kg
  loadImbalancePercent: number | null; // % difference between L & R
  loadStatus: 'BALANCED' | 'MODERATE_IMBALANCE' | 'SEVERE_IMBALANCE' | 'OVERLOAD' | 'NOT_AVAILABLE';
  dualHX711Connected: boolean; // Indicates if hardware has 2 independent HX711 channels or single combined bridge
  
  // Vessel Tilt & Stability (MPU6050)
  roll: number; // degrees (-45 to +45)
  pitch: number; // degrees (-45 to +45)
  accelX?: number; // m/s^2 or g
  accelY?: number;
  accelZ?: number;
  gyroX?: number; // deg/s
  gyroY?: number;
  gyroZ?: number;
  tiltStatus: 'STABLE' | 'MODERATE_TILT' | 'DANGEROUS_ROLL' | 'DANGEROUS_PITCH';
  
  // Water Level (Bilge/Hull Sensor)
  waterLevelRaw: number; // ADC 0-4095 on ESP32
  waterLevelPercent: number | null; // Calibrated 0-100%
  waterStatus: 'DRY' | 'NORMAL_BILGE' | 'ELEVATED' | 'CRITICAL_INGRESS';
  
  // GPS (u-blox NEO-6M)
  gps: GPSData;
  
  // Safety Risk Assessment Engine
  riskScore: number; // 0 - 100
  riskStatus: RiskLevel;
  riskFactors: {
    factor: string;
    scoreContribution: number;
    severity: 'SAFE' | 'WARNING' | 'HIGH RISK' | 'CRITICAL';
    detail: string;
  }[];
  recommendedActions: string[];
  
  // Active Buzzer State
  buzzerState: 'OFF' | 'INTERMITTENT_WARNING' | 'RAPID_HIGH_RISK' | 'CONTINUOUS_ALARM';
  buzzerMuted: boolean;
  
  // Hardware status
  hardwareHealth: {
    esp32Wifi: boolean;
    entryUltrasonic: boolean;
    exitUltrasonic: boolean;
    loadCellAmplifier: boolean;
    mpu6050: boolean;
    waterSensor: boolean;
    neo6mGps: boolean;
    activeBuzzer: boolean;
  };
}

export interface VesselConfig {
  vesselId: string;
  vesselName: string;
  registrationNumber: string;
  route: string;
  maxPassengerCapacity: number;
  maxLoadKg: number;
  maxLoadImbalancePercent: number;
  warningRollAngle: number;
  criticalRollAngle: number;
  warningPitchAngle: number;
  criticalPitchAngle: number;
  warningWaterLevelPercent: number;
  criticalWaterLevelPercent: number;
  dualHX711Mode: boolean; // false = combined bridge with 1 HX711; true = dual HX711 modules
  
  // Calibration parameters
  ultrasonicDetectionDistanceCm: number;
  ultrasonicDebounceMs: number;
  loadCellTareLeft: number;
  loadCellScaleLeft: number;
  loadCellTareRight: number;
  loadCellScaleRight: number;
  mpuRollOffset: number;
  mpuPitchOffset: number;
  waterDryAdc: number;
  waterSubmergedAdc: number;
  
  // Network / Hardware
  esp32BaudRate: number;
  gpsUartBaudRate: number;
  apiHeartbeatIntervalSec: number;
}

export interface SafetyAlert {
  id: string;
  timestamp: string;
  level: RiskLevel;
  title: string;
  message: string;
  category: 'OVERCROWDING' | 'STABILITY' | 'WATER_INGRESS' | 'IMBALANCE' | 'HARDWARE';
  acknowledged: boolean;
  acknowledgedAt?: string;
  recommendedAction: string;
}

export interface GPSWaypoint {
  timestamp: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  course: number;
  riskStatus: RiskLevel;
}
