import 'dotenv/config';
import crypto from 'crypto';
import express, { Request, Response } from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { SensorTelemetry, VesselConfig, SafetyAlert, GPSWaypoint } from './src/types/iot';
import { calculateSafetyRisk } from './src/utils/riskEngine';
import {
  getDatabase,
  loadSystemConfig,
  saveSystemConfig,
  writeAuditLog,
} from './server/db/database';
import { SQLiteSessionStore } from './server/auth/sqliteSessionStore';
import { provisionInitialAdminFromEnv } from './server/auth/adminBootstrap';
import {
  createRequireAuth,
  createRequireRole,
  getClientIp,
  requireActiveAccount,
  requirePasswordChanged,
  verifyCsrf,
  type AuthenticatedRequest,
  DEFAULT_INACTIVITY_TIMEOUT_MS,
} from './server/auth/middleware';
import { createAuthRouter } from './server/routes/authRoutes';
import { createAdminRouter } from './server/routes/adminRoutes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const db = getDatabase();

app.set('trust proxy', 1);
app.use(express.json());

const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours absolute lifetime
const sessionSecret =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(`${process.cwd()}:smart-launch-local-session-secret`).digest('hex');

const sessionStore = new SQLiteSessionStore({
  db,
  ttlMs: SESSION_MAX_AGE_MS,
  inactivityTimeoutMs: DEFAULT_INACTIVITY_TIMEOUT_MS,
});

app.use(
  session({
    name: 'smart_launch.sid',
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: true,
    cookie: {
      httpOnly: true,
      maxAge: SESSION_MAX_AGE_MS,
      sameSite: 'lax',
      secure: false,
    },
  })
);

// Adapt cookie flags dynamically for HTTPS proxy environments (AI Studio preview iframe)
// while keeping SameSite=Lax; secure=false for http://localhost demonstration.
app.use((req, _res, next) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if (req.session && req.session.cookie) {
    if (isHttps) {
      req.session.cookie.secure = true;
      req.session.cookie.sameSite = 'none';
    } else {
      req.session.cookie.secure = false;
      req.session.cookie.sameSite = 'lax';
    }
  }
  next();
});

const requireAuth = createRequireAuth(db, DEFAULT_INACTIVITY_TIMEOUT_MS);
const requireRole = createRequireRole(db);

app.use('/api/auth', createAuthRouter(db, DEFAULT_INACTIVITY_TIMEOUT_MS));
app.use('/api/admin', createAdminRouter(db, DEFAULT_INACTIVITY_TIMEOUT_MS));

// In-memory telemetry & persisted vessel config in SQLite
let pendingCommand: string | null = null;

const defaultVesselConfig: VesselConfig = {
  vesselId: 'LAUNCH-BD-8902',
  vesselName: 'MV Sundarban-10',
  registrationNumber: 'M-01-8902',
  route: 'Dhaka (Sadarghat) - Chandpur - Barisal (Meghna & Buriganga River)',
  maxPassengerCapacity: 500,
  maxLoadKg: 2000, // 2000g model prototype capacity (or 45,000kg launch)
  maxLoadImbalancePercent: 10.0, // 10% prototype threshold from user code
  warningRollAngle: 5.0, // 5 deg warning from user code
  criticalRollAngle: 10.0, // 10 deg critical from user code
  warningPitchAngle: 5.0,
  criticalPitchAngle: 10.0,
  warningWaterLevelPercent: 25.0, // 25% warning from user code
  criticalWaterLevelPercent: 60.0, // 60% critical from user code
  dualHX711Mode: true, // User's tested hardware has dual HX711 (Left: 19/18, Right: 25/26)
  
  ultrasonicDetectionDistanceCm: 15, // User's tested gate detect distance: 15cm
  ultrasonicDebounceMs: 500,
  loadCellTareLeft: 0,
  loadCellScaleLeft: 695.416, // User's calibrated Left factor
  loadCellTareRight: 0,
  loadCellScaleRight: 706.785, // User's calibrated Right factor
  mpuRollOffset: 0.0,
  mpuPitchOffset: 0.0,
  waterDryAdc: 150,
  waterSubmergedAdc: 3200,
  
  esp32BaudRate: 115200,
  gpsUartBaudRate: 9600,
  apiHeartbeatIntervalSec: 2
};

let vesselConfig: VesselConfig = loadSystemConfig<VesselConfig>(db, 'vessel_config') ?? defaultVesselConfig;

// Seed route: Meghna River path from Sadarghat down towards Chandpur
const BANGLADESH_RIVER_ROUTE: [number, number][] = [
  [23.7042, 90.4183], // Sadarghat Launch Terminal, Buriganga River
  [23.6890, 90.4350], // Postogola
  [23.6420, 90.4780], // Fatullah, Narayanganj
  [23.5950, 90.5210], // Shitalakshya River Confluence
  [23.5300, 90.5750], // Munshiganj Dhaleshwari-Meghna confluence
  [23.4600, 90.6200], // Meghna River Midstream
  [23.3600, 90.6400], // Gazaria / Meghna Ghat
  [23.2300, 90.6500], // Chandpur Estuary (Padma-Meghna confluence)
];

let routeIndex = 0;
let lastTelemetryReceivedAt = Date.now();
let activeMode: 'SIMULATION' | 'REAL_HARDWARE' = 'SIMULATION';
let buzzerMuted = false;

// Initial state
let currentTelemetry: SensorTelemetry = {
  deviceId: vesselConfig.vesselId,
  vesselName: vesselConfig.vesselName,
  timestamp: new Date().toISOString(),
  mode: 'SIMULATION',
  
  passengerCount: 215,
  entryCount: 230,
  exitCount: 15,
  maxCapacity: vesselConfig.maxPassengerCapacity,
  capacityPercentage: 43,
  
  leftLoad: 9200,
  rightLoad: 9100,
  totalLoad: 18300,
  loadImbalancePercent: 1.1,
  loadStatus: 'BALANCED',
  dualHX711Connected: false,
  
  roll: 1.4,
  pitch: 0.8,
  accelX: 0.02,
  accelY: 0.01,
  accelZ: 0.99,
  gyroX: 0.1,
  gyroY: 0.1,
  gyroZ: 0.05,
  tiltStatus: 'STABLE',
  
  waterLevelRaw: 280,
  waterLevelPercent: 5.2,
  waterStatus: 'DRY',
  
  gps: {
    fixValid: true,
    latitude: BANGLADESH_RIVER_ROUTE[0][0],
    longitude: BANGLADESH_RIVER_ROUTE[0][1],
    speedKmh: 18.5,
    course: 142.0,
    satellites: 9,
    gpsTimestamp: new Date().toISOString(),
    isStale: false
  },
  
  riskScore: 10,
  riskStatus: 'SAFE',
  riskFactors: [
    {
      factor: 'Passenger Capacity',
      scoreContribution: 0,
      severity: 'SAFE',
      detail: '215 of 500 passengers onboard (43%). Normal loading.'
    }
  ],
  recommendedActions: ['All parameters within normal river navigation limits.'],
  
  buzzerState: 'OFF',
  buzzerMuted: false,
  
  hardwareHealth: {
    esp32Wifi: true,
    entryUltrasonic: true,
    exitUltrasonic: true,
    loadCellAmplifier: true,
    mpu6050: true,
    waterSensor: true,
    neo6mGps: true,
    activeBuzzer: true
  }
};

const telemetryHistory: SensorTelemetry[] = [];
let alertSeq = 102;
const alerts: SafetyAlert[] = [
  {
    id: 'ALT-101',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    level: 'SAFE',
    title: 'System Initialized & Sensors Calibrated',
    message: 'ESP32 booted, Wi-Fi connected, MPU6050 & NEO-6M GPS locked with 9 satellites.',
    category: 'HARDWARE',
    acknowledged: true,
    acknowledgedAt: new Date(Date.now() - 3500000).toISOString(),
    recommendedAction: 'Verify baseline tare values before passenger boarding begins.'
  }
];

const gpsRouteLog: GPSWaypoint[] = [
  {
    timestamp: new Date(Date.now() - 600000).toISOString(),
    latitude: BANGLADESH_RIVER_ROUTE[0][0],
    longitude: BANGLADESH_RIVER_ROUTE[0][1],
    speedKmh: 16.2,
    course: 140,
    riskStatus: 'SAFE'
  }
];

// SSE Clients for real-time live push to React UI
const sseClients: Response[] = [];

function broadcastTelemetry(telemetry: SensorTelemetry) {
  const payload = `data: ${JSON.stringify(telemetry)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(payload);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

// Risk calculation and alert generation helper
function evaluateAndStoreTelemetry(telemetry: SensorTelemetry) {
  // Run explainable safety risk engine
  const riskResult = calculateSafetyRisk({
    passengerCount: telemetry.passengerCount,
    maxCapacity: vesselConfig.maxPassengerCapacity,
    totalLoadKg: telemetry.totalLoad,
    maxLoadKg: vesselConfig.maxLoadKg,
    leftLoadKg: telemetry.leftLoad,
    rightLoadKg: telemetry.rightLoad,
    rollAngle: telemetry.roll,
    pitchAngle: telemetry.pitch,
    waterLevelPercent: telemetry.waterLevelPercent,
    waterLevelRaw: telemetry.waterLevelRaw,
    dualHX711Connected: telemetry.dualHX711Connected
  }, vesselConfig);

  telemetry.riskScore = riskResult.score;
  telemetry.riskStatus = riskResult.level;
  telemetry.riskFactors = riskResult.factors;
  telemetry.recommendedActions = riskResult.recommendedActions;
  telemetry.maxCapacity = vesselConfig.maxPassengerCapacity;
  telemetry.capacityPercentage = Math.round((telemetry.passengerCount / vesselConfig.maxPassengerCapacity) * 100);

  // Set buzzer state according to risk level
  if (telemetry.riskStatus === 'SAFE') {
    telemetry.buzzerState = 'OFF';
  } else if (telemetry.riskStatus === 'WARNING') {
    telemetry.buzzerState = 'INTERMITTENT_WARNING';
  } else if (telemetry.riskStatus === 'HIGH RISK') {
    telemetry.buzzerState = 'RAPID_HIGH_RISK';
  } else {
    telemetry.buzzerState = 'CONTINUOUS_ALARM';
  }
  telemetry.buzzerMuted = buzzerMuted;

  // Generate alert if Warning or higher and not recently triggered
  if (telemetry.riskStatus !== 'SAFE') {
    const lastAlert = alerts[0];
    const isNewHazard = !lastAlert || lastAlert.level !== telemetry.riskStatus || (Date.now() - new Date(lastAlert.timestamp).getTime() > 60000);
    
    if (isNewHazard) {
      let category: SafetyAlert['category'] = 'OVERCROWDING';
      if (riskResult.primaryHazard?.includes('Water')) category = 'WATER_INGRESS';
      else if (riskResult.primaryHazard?.includes('Roll') || riskResult.primaryHazard?.includes('Pitch')) category = 'STABILITY';
      else if (riskResult.primaryHazard?.includes('Imbalance')) category = 'IMBALANCE';

      const newAlert: SafetyAlert = {
        id: `ALT-${alertSeq++}`,
        timestamp: new Date().toISOString(),
        level: telemetry.riskStatus,
        title: `${telemetry.riskStatus}: ${riskResult.primaryHazard || 'Multi-Factor Safety Alert'}`,
        message: riskResult.factors.find(f => f.severity === telemetry.riskStatus)?.detail || 'Dangerous vessel stability threshold breach detected.',
        category,
        acknowledged: false,
        recommendedAction: telemetry.recommendedActions[0] || 'Take immediate corrective action.'
      };

      alerts.unshift(newAlert);
      if (alerts.length > 50) alerts.pop();
    }
  }

  // Record GPS coordinate if valid
  if (telemetry.gps.fixValid && telemetry.gps.latitude && telemetry.gps.longitude) {
    const lastPoint = gpsRouteLog[gpsRouteLog.length - 1];
    const dist = lastPoint
      ? Math.hypot(telemetry.gps.latitude - lastPoint.latitude, telemetry.gps.longitude - lastPoint.longitude)
      : 1;

    if (dist > 0.0002) {
      gpsRouteLog.push({
        timestamp: telemetry.timestamp,
        latitude: telemetry.gps.latitude,
        longitude: telemetry.gps.longitude,
        speedKmh: telemetry.gps.speedKmh || 0,
        course: telemetry.gps.course || 0,
        riskStatus: telemetry.riskStatus
      });
      if (gpsRouteLog.length > 500) gpsRouteLog.shift();
    }
  }

  // Keep sliding window of history
  telemetryHistory.push({ ...telemetry });
  if (telemetryHistory.length > 100) telemetryHistory.shift();

  currentTelemetry = telemetry;
  broadcastTelemetry(telemetry);
}

// Background simulation ticker (Runs when in SIMULATION mode)
setInterval(() => {
  if (activeMode !== 'SIMULATION') return;

  const now = new Date();
  // Gradually wander coordinates down Bangladesh river route
  const currentCoord = BANGLADESH_RIVER_ROUTE[routeIndex % BANGLADESH_RIVER_ROUTE.length];
  const nextCoord = BANGLADESH_RIVER_ROUTE[(routeIndex + 1) % BANGLADESH_RIVER_ROUTE.length];
  
  // Minor wave heave and sway
  const timeSec = Date.now() / 1000;
  const rollWave = Math.sin(timeSec * 0.7) * 2.2;
  const pitchWave = Math.cos(timeSec * 0.5) * 1.1;

  // Keep existing simulated parameters or slightly fluctuate
  const current = currentTelemetry;
  const simTelemetry: SensorTelemetry = {
    ...current,
    timestamp: now.toISOString(),
    mode: 'SIMULATION',
    roll: Number((current.roll + rollWave * 0.1).toFixed(1)),
    pitch: Number((current.pitch + pitchWave * 0.1).toFixed(1)),
    gps: {
      ...current.gps,
      fixValid: true,
      latitude: Number((currentCoord[0] + (Math.sin(timeSec * 0.05) * 0.004)).toFixed(5)),
      longitude: Number((currentCoord[1] + (Math.cos(timeSec * 0.05) * 0.004)).toFixed(5)),
      speedKmh: Number((16 + Math.sin(timeSec * 0.2) * 3).toFixed(1)),
      course: 145,
      satellites: 9,
      gpsTimestamp: now.toISOString(),
      isStale: false
    }
  };

  evaluateAndStoreTelemetry(simTelemetry);
}, 2000);

// API Endpoints
// 1. ESP32 Telemetry Receiver (HTTP POST from real ESP32 over Wi-Fi)
app.post('/api/telemetry', (req: Request, res: Response) => {
  const body = req.body;
  if (!body) {
    return res.status(400).json({ error: 'Missing telemetry payload' });
  }

  lastTelemetryReceivedAt = Date.now();
  activeMode = 'REAL_HARDWARE';

  const telemetry: SensorTelemetry = {
    deviceId: body.deviceId || vesselConfig.vesselId,
    vesselName: vesselConfig.vesselName,
    timestamp: body.timestamp || new Date().toISOString(),
    mode: 'REAL_HARDWARE',
    
    passengerCount: Math.max(0, Number(body.passengerCount) || 0),
    entryCount: Math.max(0, Number(body.entryCount) || 0),
    exitCount: Math.max(0, Number(body.exitCount) || 0),
    maxCapacity: vesselConfig.maxPassengerCapacity,
    capacityPercentage: Math.round(((body.passengerCount || 0) / vesselConfig.maxPassengerCapacity) * 100),
    
    leftLoad: body.leftLoad !== null && body.leftLoad !== undefined ? Number(body.leftLoad) : null,
    rightLoad: body.rightLoad !== null && body.rightLoad !== undefined ? Number(body.rightLoad) : null,
    totalLoad: body.totalLoad !== null && body.totalLoad !== undefined ? Number(body.totalLoad) : null,
    loadImbalancePercent: body.loadImbalancePercent !== undefined ? body.loadImbalancePercent : null,
    loadStatus: body.loadStatus || 'NOT_AVAILABLE',
    dualHX711Connected: Boolean(body.dualHX711Connected ?? vesselConfig.dualHX711Mode),
    
    roll: Number(body.roll) || 0.0,
    pitch: Number(body.pitch) || 0.0,
    accelX: body.accelX,
    accelY: body.accelY,
    accelZ: body.accelZ,
    gyroX: body.gyroX,
    gyroY: body.gyroY,
    gyroZ: body.gyroZ,
    tiltStatus: Math.abs(body.roll || 0) > vesselConfig.criticalRollAngle ? 'DANGEROUS_ROLL' : 'STABLE',
    
    waterLevelRaw: Number(body.waterLevelRaw) || 0,
    waterLevelPercent: body.waterLevelPercent !== undefined ? Number(body.waterLevelPercent) : null,
    waterStatus: (body.waterLevelPercent || 0) > vesselConfig.warningWaterLevelPercent ? 'CRITICAL_INGRESS' : 'DRY',
    
    gps: {
      fixValid: Boolean(body.gps?.fixValid),
      latitude: body.gps?.latitude !== undefined ? Number(body.gps.latitude) : null,
      longitude: body.gps?.longitude !== undefined ? Number(body.gps.longitude) : null,
      speedKmh: body.gps?.speedKmh !== undefined ? Number(body.gps.speedKmh) : null,
      course: body.gps?.course !== undefined ? Number(body.gps.course) : null,
      satellites: body.gps?.satellites !== undefined ? Number(body.gps.satellites) : null,
      gpsTimestamp: body.gps?.gpsTimestamp || null,
      isStale: false
    },
    
    riskScore: 0,
    riskStatus: 'SAFE',
    riskFactors: [],
    recommendedActions: [],
    buzzerState: 'OFF',
    buzzerMuted: buzzerMuted,
    
    hardwareHealth: {
      esp32Wifi: true,
      entryUltrasonic: body.hardwareHealth?.entryUltrasonic ?? true,
      exitUltrasonic: body.hardwareHealth?.exitUltrasonic ?? true,
      loadCellAmplifier: body.hardwareHealth?.loadCellAmplifier ?? true,
      mpu6050: body.hardwareHealth?.mpu6050 ?? true,
      waterSensor: body.hardwareHealth?.waterSensor ?? true,
      neo6mGps: body.hardwareHealth?.neo6mGps ?? (body.gps?.fixValid ?? false),
      activeBuzzer: body.hardwareHealth?.activeBuzzer ?? true
    }
  };

  evaluateAndStoreTelemetry(telemetry);

  const cmdToSend = pendingCommand;
  pendingCommand = null; // Clear after delivering to ESP32

  return res.json({
    status: 'success',
    receivedAt: new Date().toISOString(),
    riskScore: telemetry.riskScore,
    riskStatus: telemetry.riskStatus,
    buzzerAction: telemetry.buzzerState,
    pendingCommand: cmdToSend
  });
});

// Endpoint to queue a command for the ESP32 ('d', 'w', 't', 'm', 'z')
app.post(
  '/api/device/command',
  requireAuth,
  requireActiveAccount,
  requirePasswordChanged,
  requireRole('ADMIN', 'CAPTAIN'),
  verifyCsrf,
  (req: AuthenticatedRequest, res: Response) => {
    const { command } = req.body;
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'Missing command character' });
    }
    pendingCommand = command.trim().toLowerCase();
    console.log(`[Command Queued for ESP32 by ${req.currentUser?.email}]: '${pendingCommand}'`);
    res.json({ status: 'queued', command: pendingCommand });
  }
);

// 2. Telemetry polling endpoint (ADMIN, CAPTAIN, AUTHORITY)
app.get(
  '/api/telemetry/latest',
  requireAuth,
  requireActiveAccount,
  requirePasswordChanged,
  requireRole('ADMIN', 'CAPTAIN', 'AUTHORITY'),
  (_req: AuthenticatedRequest, res: Response) => {
    if (activeMode === 'REAL_HARDWARE') {
      const elapsed = Date.now() - lastTelemetryReceivedAt;
      if (elapsed > 8000) {
        currentTelemetry.hardwareHealth.esp32Wifi = false;
        currentTelemetry.gps.isStale = true;
      }
    }
    res.json({
      telemetry: currentTelemetry,
      mode: activeMode,
      lastHeartbeat: new Date(lastTelemetryReceivedAt).toISOString(),
      config: vesselConfig
    });
  }
);

// 3. Telemetry history endpoint (ADMIN, CAPTAIN, AUTHORITY)
app.get(
  '/api/telemetry/history',
  requireAuth,
  requireActiveAccount,
  requirePasswordChanged,
  requireRole('ADMIN', 'CAPTAIN', 'AUTHORITY'),
  (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      history: telemetryHistory,
      routePoints: gpsRouteLog
    });
  }
);

// 4. Server-Sent Events stream for live real-time push to browser (ADMIN, CAPTAIN, AUTHORITY)
app.get(
  '/api/events',
  requireAuth,
  requireActiveAccount,
  requirePasswordChanged,
  requireRole('ADMIN', 'CAPTAIN', 'AUTHORITY'),
  (req: AuthenticatedRequest, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    res.write(`data: ${JSON.stringify(currentTelemetry)}\n\n`);
    sseClients.push(res);

    req.on('close', () => {
      const idx = sseClients.indexOf(res);
      if (idx !== -1) sseClients.splice(idx, 1);
    });
  }
);

// 5. Simulation control: update state or toggle mode (ADMIN & CAPTAIN only)
app.post(
  '/api/simulation/state',
  requireAuth,
  requireActiveAccount,
  requirePasswordChanged,
  requireRole('ADMIN', 'CAPTAIN'),
  verifyCsrf,
  (req: AuthenticatedRequest, res: Response) => {
    const updates = req.body;
    if (!updates) return res.status(400).json({ error: 'No data provided' });

    if (updates.mode) {
      activeMode = updates.mode;
    }

    const updated: SensorTelemetry = {
      ...currentTelemetry,
      ...updates,
      mode: activeMode,
      timestamp: new Date().toISOString()
    };

    evaluateAndStoreTelemetry(updated);

    res.json({
      status: 'ok',
      telemetry: currentTelemetry
    });
  }
);

// 6. Config endpoints (Read for all authenticated roles; Write strictly ADMIN only)
app.get(
  '/api/config',
  requireAuth,
  requireActiveAccount,
  requirePasswordChanged,
  requireRole('ADMIN', 'CAPTAIN', 'AUTHORITY'),
  (_req: AuthenticatedRequest, res: Response) => {
    res.json(vesselConfig);
  }
);

app.post(
  '/api/config',
  requireAuth,
  requireActiveAccount,
  requirePasswordChanged,
  requireRole('ADMIN'),
  verifyCsrf,
  (req: AuthenticatedRequest, res: Response) => {
    const newConfig = req.body;
    vesselConfig = { ...vesselConfig, ...newConfig };
    saveSystemConfig(db, 'vessel_config', vesselConfig);
    evaluateAndStoreTelemetry({ ...currentTelemetry });

    writeAuditLog(db, {
      actorUserId: req.currentUser!.id,
      actorEmail: req.currentUser!.email,
      actorRole: req.currentUser!.role,
      eventType: 'CONFIG_UPDATED',
      details: `Updated vessel thresholds/configuration for ${vesselConfig.vesselName}.`,
      ipAddress: getClientIp(req),
    });

    res.json({ status: 'ok', config: vesselConfig });
  }
);

// 7. Alert management (Read for all authenticated roles; Acknowledge for ADMIN & CAPTAIN)
app.get(
  '/api/alerts',
  requireAuth,
  requireActiveAccount,
  requirePasswordChanged,
  requireRole('ADMIN', 'CAPTAIN', 'AUTHORITY'),
  (_req: AuthenticatedRequest, res: Response) => {
    res.json(alerts);
  }
);

app.post(
  '/api/alerts/acknowledge',
  requireAuth,
  requireActiveAccount,
  requirePasswordChanged,
  requireRole('ADMIN', 'CAPTAIN'),
  verifyCsrf,
  (req: AuthenticatedRequest, res: Response) => {
    const { alertId } = req.body;
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
    }
    res.json({ status: 'ok', alerts });
  }
);

// 8. Buzzer Mute Toggle (ADMIN & CAPTAIN)
app.post(
  '/api/buzzer/mute',
  requireAuth,
  requireActiveAccount,
  requirePasswordChanged,
  requireRole('ADMIN', 'CAPTAIN'),
  verifyCsrf,
  (_req: AuthenticatedRequest, res: Response) => {
    buzzerMuted = !buzzerMuted;
    currentTelemetry.buzzerMuted = buzzerMuted;
    res.json({ muted: buzzerMuted });
  }
);

// 9. SQL Schema download (ADMIN only)
app.get(
  '/api/schema/mysql',
  requireAuth,
  requireActiveAccount,
  requirePasswordChanged,
  requireRole('ADMIN'),
  (_req: AuthenticatedRequest, res: Response) => {
  const schemaSql = `-- MySQL Database Schema for IoT Smart Launch Overcrowding & Safety System
-- Project: IoT-Based Smart Launch Overcrowding Detection & Risk Assessment System

CREATE DATABASE IF NOT EXISTS \`smart_launch_db\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`smart_launch_db\`;

-- 1. Vessel Registry
CREATE TABLE IF NOT EXISTS \`vessels\` (
  \`vessel_id\` VARCHAR(50) PRIMARY KEY,
  \`vessel_name\` VARCHAR(100) NOT NULL,
  \`registration_number\` VARCHAR(50) NOT NULL UNIQUE,
  \`route\` VARCHAR(255) NOT NULL,
  \`capacity\` INT NOT NULL DEFAULT 500,
  \`rated_load_kg\` DECIMAL(10,2) NOT NULL DEFAULT 40000.00,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Sensor Metadata
CREATE TABLE IF NOT EXISTS \`sensors\` (
  \`sensor_id\` VARCHAR(50) PRIMARY KEY,
  \`vessel_id\` VARCHAR(50) NOT NULL,
  \`sensor_type\` ENUM('ULTRASONIC_ENTRY', 'ULTRASONIC_EXIT', 'LOAD_CELL_LEFT', 'LOAD_CELL_RIGHT', 'MPU6050_IMU', 'WATER_LEVEL', 'NEO6M_GPS', 'ACTIVE_BUZZER') NOT NULL,
  \`location\` VARCHAR(100),
  \`sensor_status\` ENUM('ACTIVE', 'CALIBRATING', 'FAULT', 'OFFLINE') DEFAULT 'ACTIVE',
  \`calibration_offset\` DECIMAL(10,4) DEFAULT 0.0000,
  FOREIGN KEY (\`vessel_id\`) REFERENCES \`vessels\`(\`vessel_id\`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Telemetry Sensor Data
CREATE TABLE IF NOT EXISTS \`sensor_data\` (
  \`data_id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
  \`vessel_id\` VARCHAR(50) NOT NULL,
  \`passenger_count\` INT NOT NULL DEFAULT 0,
  \`entry_count\` INT NOT NULL DEFAULT 0,
  \`exit_count\` INT NOT NULL DEFAULT 0,
  \`left_load_kg\` DECIMAL(10,2) NULL,
  \`right_load_kg\` DECIMAL(10,2) NULL,
  \`total_load_kg\` DECIMAL(10,2) NULL,
  \`load_imbalance_percent\` DECIMAL(5,2) NULL,
  \`roll_degrees\` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  \`pitch_degrees\` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  \`water_level_raw\` INT NOT NULL DEFAULT 0,
  \`water_level_percent\` DECIMAL(5,2) NULL,
  \`recorded_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_vessel_time\` (\`vessel_id\`, \`recorded_at\`),
  FOREIGN KEY (\`vessel_id\`) REFERENCES \`vessels\`(\`vessel_id\`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. GPS Location History
CREATE TABLE IF NOT EXISTS \`locations\` (
  \`location_id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
  \`vessel_id\` VARCHAR(50) NOT NULL,
  \`latitude\` DECIMAL(10,7) NULL,
  \`longitude\` DECIMAL(10,7) NULL,
  \`speed_kmh\` DECIMAL(6,2) NULL,
  \`course_degrees\` DECIMAL(6,2) NULL,
  \`satellites\` INT NULL,
  \`fix_valid\` TINYINT(1) DEFAULT 0,
  \`recorded_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_vessel_gps\` (\`vessel_id\`, \`recorded_at\`),
  FOREIGN KEY (\`vessel_id\`) REFERENCES \`vessels\`(\`vessel_id\`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Safety Risk Assessment Records
CREATE TABLE IF NOT EXISTS \`risk_assessments\` (
  \`risk_id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
  \`vessel_id\` VARCHAR(50) NOT NULL,
  \`data_id\` BIGINT NOT NULL,
  \`risk_score\` INT NOT NULL,
  \`risk_level\` ENUM('SAFE', 'WARNING', 'HIGH RISK', 'CRITICAL') NOT NULL,
  \`main_risk_factor\` VARCHAR(150),
  \`explainable_details\` TEXT,
  \`calculated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`vessel_id\`) REFERENCES \`vessels\`(\`vessel_id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`data_id\`) REFERENCES \`sensor_data\`(\`data_id\`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Alerts & Incident Escalation
CREATE TABLE IF NOT EXISTS \`alerts\` (
  \`alert_id\` VARCHAR(50) PRIMARY KEY,
  \`vessel_id\` VARCHAR(50) NOT NULL,
  \`alert_level\` ENUM('SAFE', 'WARNING', 'HIGH RISK', 'CRITICAL') NOT NULL,
  \`alert_title\` VARCHAR(150) NOT NULL,
  \`alert_message\` TEXT NOT NULL,
  \`category\` ENUM('OVERCROWDING', 'STABILITY', 'WATER_INGRESS', 'IMBALANCE', 'HARDWARE') NOT NULL,
  \`acknowledged\` TINYINT(1) DEFAULT 0,
  \`acknowledged_at\` TIMESTAMP NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`vessel_id\`) REFERENCES \`vessels\`(\`vessel_id\`) ON DELETE CASCADE
) ENGINE=InnoDB;
`;
  res.setHeader('Content-Type', 'text/plain');
  res.send(schemaSql);
});

// Endpoint to download the updated ESP32 Arduino firmware file
app.get('/firmware/smart_launch_esp32.ino', (req: Request, res: Response, next) => {
  if ('import' in req.query || 'raw' in req.query) {
    return next();
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.sendFile(path.join(__dirname, 'firmware', 'smart_launch_esp32.ino'));
});

async function startServer() {
  await provisionInitialAdminFromEnv(db);

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const host = process.env.HOST || (process.env.K_SERVICE || process.env.APP_URL ? '0.0.0.0' : '127.0.0.1');
  app.listen(PORT, host, () => {
    console.log(`[Smart Launch IoT Server] Running on http://localhost:${PORT} (bound ${host})`);
    console.log(`[Mode] Initialized in ${activeMode} mode`);
  });
}

startServer();
