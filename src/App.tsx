/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SensorTelemetry, VesselConfig, SafetyAlert, GPSWaypoint } from './types/iot';
import { Navbar, ActiveTab } from './components/Navbar';
import { SimulationDrawer } from './components/SimulationDrawer';
import { DashboardView } from './views/DashboardView';
import { LiveMonitoringView } from './views/LiveMonitoringView';
import { VesselTrackingView } from './views/VesselTrackingView';
import { AlertsView } from './views/AlertsView';
import { AnalyticsView } from './views/AnalyticsView';
import { CalibrationView } from './views/CalibrationView';
import { SettingsView } from './views/SettingsView';
import { HardwareDocsView } from './views/HardwareDocsView';
import { buzzerAudio } from './utils/buzzerAudio';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ActiveTab>('dashboard');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [mode, setMode] = useState<'SIMULATION' | 'REAL_HARDWARE'>('SIMULATION');
  const [buzzerMuted, setBuzzerMuted] = useState(false);

  // Configuration State
  const [config, setConfig] = useState<VesselConfig>({
    vesselId: 'LAUNCH-BD-8902',
    vesselName: 'MV Sundarban-10',
    registrationNumber: 'M-01-8902',
    route: 'Dhaka (Sadarghat) - Chandpur - Barisal (Meghna & Buriganga River)',
    maxPassengerCapacity: 500,
    maxLoadKg: 45000,
    maxLoadImbalancePercent: 18.0,
    warningRollAngle: 5.0,
    criticalRollAngle: 10.0,
    warningPitchAngle: 5.0,
    criticalPitchAngle: 10.0,
    warningWaterLevelPercent: 25.0,
    criticalWaterLevelPercent: 60.0,
    dualHX711Mode: true,
    ultrasonicDetectionDistanceCm: 15,
    ultrasonicDebounceMs: 500,
    loadCellTareLeft: 0,
    loadCellScaleLeft: 695.416,
    loadCellTareRight: 0,
    loadCellScaleRight: 706.785,
    mpuRollOffset: 0.0,
    mpuPitchOffset: 0.0,
    waterDryAdc: 150,
    waterSubmergedAdc: 3200,
    esp32BaudRate: 115200,
    gpsUartBaudRate: 9600,
    apiHeartbeatIntervalSec: 2
  });

  // Telemetry State
  const [telemetry, setTelemetry] = useState<SensorTelemetry>({
    deviceId: 'LAUNCH-BD-8902',
    vesselName: 'MV Sundarban-10',
    timestamp: new Date().toISOString(),
    mode: 'SIMULATION',
    passengerCount: 12,
    entryCount: 15,
    exitCount: 3,
    maxCapacity: 50,
    capacityPercentage: 24,
    leftLoad: 420.5,
    rightLoad: 415.0,
    totalLoad: 835.5,
    loadImbalancePercent: 0.7,
    loadStatus: 'BALANCED',
    dualHX711Connected: true,
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
      latitude: 23.7042,
      longitude: 90.4183,
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
  });

  const [history, setHistory] = useState<SensorTelemetry[]>([]);
  const [routeHistory, setRouteHistory] = useState<GPSWaypoint[]>([]);
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);

  // 1. Initial Load of Config, History, Alerts
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(data => {
        if (data && data.vesselName) setConfig(data);
      })
      .catch(() => {});

    fetch('/api/telemetry/history')
      .then(r => r.json())
      .then(data => {
        if (data.history) setHistory(data.history);
        if (data.routePoints) setRouteHistory(data.routePoints);
      })
      .catch(() => {});

    fetch('/api/alerts')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAlerts(data);
      })
      .catch(() => {});
  }, []);

  // 2. Real-Time Telemetry via Server-Sent Events (SSE)
  useEffect(() => {
    const sse = new EventSource('/api/events');

    sse.onmessage = (event) => {
      try {
        const data: SensorTelemetry = JSON.parse(event.data);
        setTelemetry(data);
        setMode(data.mode);

        // Update sliding history
        setHistory(prev => {
          const next = [...prev, data];
          return next.slice(-60);
        });

        // Update GPS route waypoint if valid
        if (data.gps.fixValid && data.gps.latitude && data.gps.longitude) {
          setRouteHistory(prev => {
            const last = prev[prev.length - 1];
            const moved = !last || Math.hypot(data.gps.latitude! - last.latitude, data.gps.longitude! - last.longitude) > 0.0002;
            if (moved) {
              return [...prev, {
                timestamp: data.timestamp,
                latitude: data.gps.latitude!,
                longitude: data.gps.longitude!,
                speedKmh: data.gps.speedKmh ?? 0,
                course: data.gps.course ?? 145,
                riskStatus: data.riskStatus
              }].slice(-300);
            }
            return prev;
          });
        }

        // Trigger or update Web Audio Active Buzzer
        if (!buzzerMuted) {
          buzzerAudio.setPattern(data.buzzerState);
        } else {
          buzzerAudio.setPattern('OFF');
        }
      } catch (err) {
        console.error('Failed to parse SSE telemetry packet:', err);
      }
    };

    sse.onerror = () => {
      // If SSE errors out, poll latest every 2s
      const timer = setInterval(() => {
        fetch('/api/telemetry/latest')
          .then(r => r.json())
          .then(res => {
            if (res.telemetry) {
              setTelemetry(res.telemetry);
              setMode(res.mode);
            }
          })
          .catch(() => {});
      }, 2000);

      return () => clearInterval(timer);
    };

    return () => {
      sse.close();
    };
  }, [buzzerMuted]);

  // Periodic Alert Sync
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/alerts')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setAlerts(data);
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleUpdateSimulation = (updates: Partial<SensorTelemetry>) => {
    fetch('/api/simulation/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
      .then(r => r.json())
      .then(res => {
        if (res.telemetry) setTelemetry(res.telemetry);
      });
  };

  const handleToggleMode = (newMode: 'SIMULATION' | 'REAL_HARDWARE') => {
    setMode(newMode);
    fetch('/api/simulation/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: newMode })
    });
  };

  const handleToggleBuzzerMute = () => {
    const nextMute = !buzzerMuted;
    setBuzzerMuted(nextMute);
    buzzerAudio.setMuted(nextMute);
    fetch('/api/buzzer/mute', { method: 'POST' });
  };

  const handleSaveConfig = (updated: Partial<VesselConfig>) => {
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    })
      .then(r => r.json())
      .then(res => {
        if (res.config) setConfig(res.config);
      });
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    fetch('/api/alerts/acknowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId })
    })
      .then(r => r.json())
      .then(res => {
        if (res.alerts) setAlerts(res.alerts);
      });
  };

  const handleSendCommand = (cmd: string) => {
    fetch('/api/device/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd })
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-cyan-500 selection:text-black">
      {/* Navbar with Mode switcher & Tabs */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        telemetry={telemetry}
        mode={mode}
        onToggleMode={handleToggleMode}
        buzzerMuted={buzzerMuted}
        onToggleBuzzerMute={handleToggleBuzzerMute}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            telemetry={telemetry}
            config={config}
            alerts={alerts}
            onOpenSimulator={() => setIsSimulatorOpen(true)}
            onNavigateToTab={setCurrentTab}
          />
        )}

        {currentTab === 'live-monitoring' && (
          <LiveMonitoringView
            telemetry={telemetry}
            config={config}
            history={history}
          />
        )}

        {currentTab === 'vessel-tracking' && (
          <VesselTrackingView
            telemetry={telemetry}
            config={config}
            routeHistory={routeHistory}
          />
        )}

        {currentTab === 'alerts' && (
          <AlertsView
            alerts={alerts}
            onAcknowledgeAlert={handleAcknowledgeAlert}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsView
            history={history}
            config={config}
          />
        )}

        {currentTab === 'calibration' && (
          <CalibrationView
            config={config}
            telemetry={telemetry}
            onSaveConfig={handleSaveConfig}
            onSendCommand={handleSendCommand}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            config={config}
            onSaveConfig={handleSaveConfig}
          />
        )}

        {currentTab === 'hardware' && (
          <HardwareDocsView onSendCommand={handleSendCommand} />
        )}
      </main>

      {/* Interactive Simulation Drawer */}
      <SimulationDrawer
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        telemetry={telemetry}
        config={config}
        onUpdateSimulation={handleUpdateSimulation}
      />

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-3 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-between items-center gap-2">
          <span>AIoT Smart Launch Overcrowding Detection &amp; Safety Risk Assessment System</span>
          <span>Sadarghat &bull; Buriganga &bull; Meghna River Corridor &bull; ESP32 &amp; NEO-6M GNSS</span>
        </div>
      </footer>
    </div>
  );
}
