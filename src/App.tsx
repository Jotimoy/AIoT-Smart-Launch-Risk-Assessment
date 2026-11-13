/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SensorTelemetry, VesselConfig, SafetyAlert, GPSWaypoint } from './types/iot';
import type { UserRole } from './types/auth';
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
import { AdminUsersView } from './views/AdminUsersView';
import { AdminAuditLogsView } from './views/AdminAuditLogsView';
import { LoginView } from './views/LoginView';
import { ChangePasswordView } from './views/ChangePasswordView';
import { AccessDeniedView } from './views/AccessDeniedView';
import { useAuth } from './context/AuthContext';
import { apiFetch } from './utils/apiClient';
import { buzzerAudio } from './utils/buzzerAudio';
import { webSerialBridge } from './utils/webSerialBridge';
import { Loader2 } from 'lucide-react';

const TAB_TO_PATH: Record<ActiveTab, string> = {
  dashboard: '/dashboard',
  'live-monitoring': '/live-monitoring',
  'vessel-tracking': '/vessel-tracking',
  alerts: '/alerts',
  analytics: '/analytics',
  'admin-users': '/admin/users',
  'admin-audit': '/admin/audit-logs',
  calibration: '/calibration',
  settings: '/settings',
  hardware: '/hardware',
  'change-password': '/change-password',
};

const TAB_ALLOWED_ROLES: Record<ActiveTab, UserRole[]> = {
  dashboard: ['ADMIN', 'CAPTAIN', 'AUTHORITY'],
  'live-monitoring': ['ADMIN', 'CAPTAIN', 'AUTHORITY'],
  'vessel-tracking': ['ADMIN', 'CAPTAIN', 'AUTHORITY'],
  alerts: ['ADMIN', 'CAPTAIN', 'AUTHORITY'],
  analytics: ['ADMIN', 'CAPTAIN', 'AUTHORITY'],
  'change-password': ['ADMIN', 'CAPTAIN', 'AUTHORITY'],
  'admin-users': ['ADMIN'],
  'admin-audit': ['ADMIN'],
  calibration: ['ADMIN'],
  settings: ['ADMIN'],
  hardware: ['ADMIN'],
};

function resolveTabFromPath(pathname: string): ActiveTab | 'UNAUTHORIZED_PATH' {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/' || clean === '/login' || clean === '/dashboard' || clean === '/admin' || clean === '/captain' || clean === '/authority') {
    return 'dashboard';
  }
  const match = (Object.entries(TAB_TO_PATH) as [ActiveTab, string][]).find(([, p]) => p === clean);
  if (match) return match[0];
  return 'UNAUTHORIZED_PATH';
}

export default function App() {
  const { user, loading, logout } = useAuth();

  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [currentTab, setCurrentTab] = useState<ActiveTab>(() => {
    const resolved = resolveTabFromPath(window.location.pathname || '/');
    return resolved === 'UNAUTHORIZED_PATH' ? 'dashboard' : resolved;
  });
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

  const navigateToTab = useCallback((tab: ActiveTab) => {
    setCurrentTab(tab);
    const nextPath = TAB_TO_PATH[tab];
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setCurrentPath(nextPath);
  }, []);

  // Sync browser back/forward navigation
  useEffect(() => {
    const onPopState = () => {
      const pathname = window.location.pathname || '/';
      setCurrentPath(pathname);
      const resolved = resolveTabFromPath(pathname);
      if (resolved !== 'UNAUTHORIZED_PATH') {
        setCurrentTab(resolved);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Redirect URL cleanly upon authentication state changes
  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (window.location.pathname !== '/login') {
        window.history.replaceState({}, '', '/login');
        setCurrentPath('/login');
      }
      setIsSimulatorOpen(false);
      return;
    }

    if (user.mustChangePassword) {
      if (window.location.pathname !== '/change-password') {
        window.history.replaceState({}, '', '/change-password');
        setCurrentPath('/change-password');
      }
      return;
    }

    // Authenticated & verified password: land on role dashboard if coming from / or /login or /change-password
    const cur = window.location.pathname || '/';
    if (cur === '/' || cur === '/login' || cur === '/change-password') {
      const roleLanding =
        user.role === 'ADMIN' ? '/dashboard' :
        user.role === 'CAPTAIN' ? '/dashboard' : '/dashboard';
      window.history.replaceState({}, '', roleLanding);
      setCurrentPath(roleLanding);
      setCurrentTab('dashboard');
    }
  }, [user, loading]);

  const isFullyAuthenticated = Boolean(user && !user.mustChangePassword);

  // 1. Initial Load of Config, History, Alerts (Authenticated only)
  useEffect(() => {
    if (!isFullyAuthenticated) return;

    apiFetch('/api/config')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data && data.vesselName) setConfig(data);
      })
      .catch(() => {});

    apiFetch('/api/telemetry/history')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.history) setHistory(data.history);
        if (data?.routePoints) setRouteHistory(data.routePoints);
      })
      .catch(() => {});

    apiFetch('/api/alerts')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (Array.isArray(data)) setAlerts(data);
      })
      .catch(() => {});
  }, [isFullyAuthenticated]);

  // 2. Real-Time Telemetry via Server-Sent Events (Authenticated only)
  useEffect(() => {
    if (!isFullyAuthenticated) return;

    const sse = new EventSource('/api/events', { withCredentials: true });
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;

    sse.onmessage = (event) => {
      try {
        const data: SensorTelemetry = JSON.parse(event.data);
        setTelemetry(data);
        setMode(data.mode);

        setHistory(prev => [...prev, data].slice(-60));

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
      if (!fallbackTimer) {
        fallbackTimer = setInterval(() => {
          apiFetch('/api/telemetry/latest')
            .then(r => (r.ok ? r.json() : null))
            .then(res => {
              if (res?.telemetry) {
                setTelemetry(res.telemetry);
                setMode(res.mode);
              }
            })
            .catch(() => {});
        }, 2000);
      }
    };

    return () => {
      sse.close();
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, [buzzerMuted, isFullyAuthenticated]);

  // Periodic Alert Sync (Authenticated only)
  useEffect(() => {
    if (!isFullyAuthenticated) return;
    const interval = setInterval(() => {
      apiFetch('/api/alerts')
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (Array.isArray(data)) setAlerts(data);
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [isFullyAuthenticated]);

  // Handlers
  const handleUpdateSimulation = (updates: Partial<SensorTelemetry>) => {
    apiFetch('/api/simulation/state', {
      method: 'POST',
      body: JSON.stringify(updates)
    })
      .then(r => (r.ok ? r.json() : null))
      .then(res => {
        if (res?.telemetry) setTelemetry(res.telemetry);
      });
  };

  const handleToggleMode = (newMode: 'SIMULATION' | 'REAL_HARDWARE') => {
    setMode(newMode);
    apiFetch('/api/simulation/state', {
      method: 'POST',
      body: JSON.stringify({ mode: newMode })
    });
  };

  const handleToggleBuzzerMute = () => {
    const nextMute = !buzzerMuted;
    setBuzzerMuted(nextMute);
    buzzerAudio.setMuted(nextMute);
    apiFetch('/api/buzzer/mute', { method: 'POST' });
  };

  const handleSaveConfig = (updated: Partial<VesselConfig>) => {
    apiFetch('/api/config', {
      method: 'POST',
      body: JSON.stringify(updated)
    })
      .then(r => (r.ok ? r.json() : null))
      .then(res => {
        if (res?.config) setConfig(res.config);
      });
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    apiFetch('/api/alerts/acknowledge', {
      method: 'POST',
      body: JSON.stringify({ alertId })
    })
      .then(r => (r.ok ? r.json() : null))
      .then(res => {
        if (res?.alerts) setAlerts(res.alerts);
      });
  };

  const handleSendCommand = (cmd: string) => {
    webSerialBridge.sendCommand(cmd);
    apiFetch('/api/device/command', {
      method: 'POST',
      body: JSON.stringify({ command: cmd })
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-mono text-[#64748B] dark:text-[#94A3B8]">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-600 dark:text-cyan-400" />
          <span>Verifying secure session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  if (user.mustChangePassword) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] transition-colors duration-200">
        <ChangePasswordView forced />
      </div>
    );
  }

  const isReadOnlyAuthority = user.role === 'AUTHORITY';
  const resolvedFromUrl = resolveTabFromPath(currentPath);
  const isDirectAdminAttempt = currentPath.startsWith('/admin') && user.role !== 'ADMIN';
  const isTabForbidden =
    resolvedFromUrl === 'UNAUTHORIZED_PATH' ||
    isDirectAdminAttempt ||
    !TAB_ALLOWED_ROLES[currentTab].includes(user.role);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col font-sans antialiased selection:bg-cyan-500 selection:text-white dark:selection:text-black transition-colors duration-200">
      {/* Navbar with Role-Based Tabs, User Badge, Theme Toggle & Sign Out */}
      <Navbar
        currentTab={currentTab}
        onTabChange={navigateToTab}
        telemetry={telemetry}
        mode={mode}
        onToggleMode={handleToggleMode}
        buzzerMuted={buzzerMuted}
        onToggleBuzzerMute={handleToggleBuzzerMute}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        userRole={user.role}
        userFullName={user.fullName}
        onLogout={logout}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isTabForbidden ? (
          <AccessDeniedView
            role={user.role}
            attemptedPath={currentPath}
            onReturnDashboard={() => navigateToTab('dashboard')}
          />
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                telemetry={telemetry}
                config={config}
                alerts={alerts}
                onOpenSimulator={() => setIsSimulatorOpen(true)}
                onNavigateToTab={navigateToTab}
                readOnly={isReadOnlyAuthority}
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
                readOnly={isReadOnlyAuthority}
              />
            )}

            {currentTab === 'analytics' && (
              <AnalyticsView
                history={history}
                config={config}
              />
            )}

            {currentTab === 'admin-users' && user.role === 'ADMIN' && (
              <AdminUsersView />
            )}

            {currentTab === 'admin-audit' && user.role === 'ADMIN' && (
              <AdminAuditLogsView />
            )}

            {currentTab === 'calibration' && user.role === 'ADMIN' && (
              <CalibrationView
                config={config}
                telemetry={telemetry}
                onSaveConfig={handleSaveConfig}
                onSendCommand={handleSendCommand}
              />
            )}

            {currentTab === 'settings' && user.role === 'ADMIN' && (
              <SettingsView
                config={config}
                onSaveConfig={handleSaveConfig}
              />
            )}

            {currentTab === 'hardware' && user.role === 'ADMIN' && (
              <HardwareDocsView onSendCommand={handleSendCommand} />
            )}

            {currentTab === 'change-password' && (
              <ChangePasswordView onDone={() => navigateToTab('dashboard')} />
            )}
          </>
        )}
      </main>

      {/* Interactive Simulation Drawer (Admin & Captain only) */}
      {!isReadOnlyAuthority && (
        <SimulationDrawer
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          telemetry={telemetry}
          config={config}
          onUpdateSimulation={handleUpdateSimulation}
        />
      )}

      {/* Footer */}
      <footer className="bg-white dark:bg-[#0B1120] border-t border-[#E2E8F0] dark:border-[#334155] py-3 text-center text-xs text-[#64748B] dark:text-[#94A3B8] font-mono transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-between items-center gap-2">
          <span>AIoT Smart Launch Overcrowding Detection &amp; Safety Risk Assessment System</span>
          <span>Sadarghat &bull; Buriganga &bull; Meghna River Corridor &bull; ESP32 &amp; NEO-6M GNSS</span>
        </div>
      </footer>
    </div>
  );
}
