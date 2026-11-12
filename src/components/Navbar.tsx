import React from 'react';
import { RiskLevel, SensorTelemetry } from '../types/iot';
import {
  Ship,
  Activity,
  MapPin,
  AlertTriangle,
  BarChart3,
  Sliders,
  Settings,
  Cpu,
  Volume2,
  VolumeX,
  Radio,
  SlidersHorizontal,
  Flame
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'live-monitoring'
  | 'vessel-tracking'
  | 'alerts'
  | 'analytics'
  | 'calibration'
  | 'settings'
  | 'hardware';

interface NavbarProps {
  currentTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  telemetry: SensorTelemetry;
  mode: 'SIMULATION' | 'REAL_HARDWARE';
  onToggleMode: (mode: 'SIMULATION' | 'REAL_HARDWARE') => void;
  buzzerMuted: boolean;
  onToggleBuzzerMute: () => void;
  onOpenSimulator: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  telemetry,
  mode,
  onToggleMode,
  buzzerMuted,
  onToggleBuzzerMute,
  onOpenSimulator
}) => {
  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'SAFE':
        return 'bg-emerald-950 text-emerald-400 border-emerald-500/50';
      case 'WARNING':
        return 'bg-amber-950 text-amber-400 border-amber-500/50';
      case 'HIGH RISK':
        return 'bg-orange-950 text-orange-400 border-orange-500/50';
      case 'CRITICAL':
        return 'bg-rose-950 text-rose-300 border-rose-500/80 animate-pulse';
    }
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Ship className="w-4 h-4" /> },
    { id: 'live-monitoring', label: 'Live Monitoring', icon: <Activity className="w-4 h-4" /> },
    { id: 'vessel-tracking', label: 'Vessel Tracking', icon: <MapPin className="w-4 h-4" /> },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: telemetry.riskStatus !== 'SAFE' ? telemetry.riskStatus : undefined
    },
    { id: 'analytics', label: 'History & Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'calibration', label: 'Calibration', icon: <Sliders className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    { id: 'hardware', label: 'Hardware & Code', icon: <Cpu className="w-4 h-4" /> }
  ];

  return (
    <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
      {/* Top Meta Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60">
        {/* Brand & Vessel Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-900/30 border border-cyan-400/40">
            <Ship className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white tracking-wide">
                AIoT Smart Launch Risk Assessment
              </h1>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold uppercase ${getRiskBadge(telemetry.riskStatus)}`}>
                {telemetry.riskStatus} ({telemetry.riskScore}/100)
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>Vessel: <strong className="text-slate-200">{telemetry.vesselName}</strong></span>
              <span className="text-slate-600">•</span>
              <span>ID: <strong className="font-mono text-cyan-400">{telemetry.deviceId}</strong></span>
              <span className="hidden md:inline text-slate-600">•</span>
              <span className="hidden md:inline text-slate-400 text-[11px]">Buriganga & Meghna River</span>
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mode Selector */}
          <div className="bg-slate-900 p-0.5 rounded-lg border border-slate-800 flex items-center text-xs font-mono">
            <button
              onClick={() => onToggleMode('SIMULATION')}
              className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1.5 ${
                mode === 'SIMULATION'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse"></span>
              SIMULATION
            </button>
            <button
              onClick={() => onToggleMode('REAL_HARDWARE')}
              className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1.5 ${
                mode === 'REAL_HARDWARE'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3 h-3 text-cyan-300" />
              ESP32 HARDWARE
            </button>
          </div>

          {/* Buzzer Sound Toggle */}
          <button
            onClick={onToggleBuzzerMute}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 font-mono transition ${
              buzzerMuted
                ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                : telemetry.buzzerState !== 'OFF'
                ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse'
                : 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40 hover:bg-indigo-900/60'
            }`}
            title={buzzerMuted ? 'Buzzer is MUTED (click to unmute)' : 'Buzzer is ACTIVE (click to mute)'}
          >
            {buzzerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden sm:inline font-bold">
              {buzzerMuted ? 'Muted' : 'Buzzer ON'}
            </span>
          </button>

          {/* Open Simulation Drawer */}
          {mode === 'SIMULATION' && (
            <button
              onClick={onOpenSimulator}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold font-mono flex items-center gap-1.5 shadow-md shadow-amber-900/40 border border-amber-400/30"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Simulate Sensors</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto no-scrollbar space-x-1 sm:space-x-2 py-1.5 text-xs sm:text-sm font-medium">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-rose-900 text-rose-300 border border-rose-500/40">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
