import React from 'react';
import { RiskLevel, SensorTelemetry } from '../types/iot';
import type { UserRole } from '../types/auth';
import { useTheme } from '../context/ThemeContext';
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
  Sun,
  Moon,
  Users,
  ClipboardList,
  LogOut,
  KeyRound,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'live-monitoring'
  | 'vessel-tracking'
  | 'alerts'
  | 'analytics'
  | 'admin-users'
  | 'admin-audit'
  | 'calibration'
  | 'settings'
  | 'hardware'
  | 'change-password';

interface NavbarProps {
  currentTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  telemetry: SensorTelemetry;
  mode: 'SIMULATION' | 'REAL_HARDWARE';
  onToggleMode: (mode: 'SIMULATION' | 'REAL_HARDWARE') => void;
  buzzerMuted: boolean;
  onToggleBuzzerMute: () => void;
  onOpenSimulator: () => void;
  userRole: UserRole;
  userFullName: string;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  telemetry,
  mode,
  onToggleMode,
  buzzerMuted,
  onToggleBuzzerMute,
  onOpenSimulator,
  userRole,
  userFullName,
  onLogout,
}) => {
  const { theme, toggleTheme } = useTheme();

  const canOperate = userRole === 'ADMIN' || userRole === 'CAPTAIN';
  const isAdmin = userRole === 'ADMIN';

  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'SAFE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-500/50';
      case 'WARNING':
        return 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-500/50';
      case 'HIGH RISK':
        return 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-500/50';
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-700 border-rose-400 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-500/80 animate-pulse';
    }
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'ADMIN':
        return 'bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-500/40';
      case 'CAPTAIN':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-500/40';
      case 'AUTHORITY':
        return 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-500/40';
    }
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string; roles: UserRole[] }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Ship className="w-4 h-4" />, roles: ['ADMIN', 'CAPTAIN', 'AUTHORITY'] },
    { id: 'live-monitoring', label: 'Live Monitoring', icon: <Activity className="w-4 h-4" />, roles: ['ADMIN', 'CAPTAIN', 'AUTHORITY'] },
    { id: 'vessel-tracking', label: 'Vessel Tracking', icon: <MapPin className="w-4 h-4" />, roles: ['ADMIN', 'CAPTAIN', 'AUTHORITY'] },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: telemetry.riskStatus !== 'SAFE' ? telemetry.riskStatus : undefined,
      roles: ['ADMIN', 'CAPTAIN', 'AUTHORITY'],
    },
    { id: 'analytics', label: 'History & Analytics', icon: <BarChart3 className="w-4 h-4" />, roles: ['ADMIN', 'CAPTAIN', 'AUTHORITY'] },
    { id: 'admin-users', label: 'User Management', icon: <Users className="w-4 h-4" />, roles: ['ADMIN'] },
    { id: 'admin-audit', label: 'Audit Logs', icon: <ClipboardList className="w-4 h-4" />, roles: ['ADMIN'] },
    { id: 'calibration', label: 'Calibration', icon: <Sliders className="w-4 h-4" />, roles: ['ADMIN'] },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />, roles: ['ADMIN'] },
    { id: 'hardware', label: 'Hardware & Code', icon: <Cpu className="w-4 h-4" />, roles: ['ADMIN'] },
  ];

  const visibleNavItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <header className="bg-white dark:bg-[#111827] border-b border-[#E2E8F0] dark:border-[#334155] sticky top-0 z-40 shadow-sm dark:shadow-xl transition-colors duration-200">
      {/* Top Meta Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] dark:border-[#334155]/70">
        {/* Brand & Vessel Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-md shadow-cyan-500/20 dark:shadow-cyan-900/30 border border-cyan-400/40">
            <Ship className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-wide">
                AIoT Smart Launch Risk Assessment
              </h1>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold uppercase ${getRiskBadge(telemetry.riskStatus)}`}>
                {telemetry.riskStatus} ({telemetry.riskScore}/100)
              </span>
              <span
                data-testid="active-role-badge"
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold uppercase ${getRoleBadge(userRole)}`}
              >
                {userRole}
              </span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] flex items-center gap-2 flex-wrap">
              <span>Vessel: <strong className="text-[#0F172A] dark:text-slate-200">{telemetry.vesselName}</strong></span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>ID: <strong className="font-mono text-cyan-700 dark:text-cyan-400">{telemetry.deviceId}</strong></span>
              <span className="hidden md:inline text-slate-300 dark:text-slate-600">•</span>
              <span className="hidden md:inline text-[#64748B] dark:text-slate-400 text-[11px]">
                Signed in as <strong className="text-[#0F172A] dark:text-slate-200">{userFullName}</strong>
              </span>
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {canOperate ? (
            <>
              {/* Mode Selector */}
              <div className="bg-[#F1F5F9] dark:bg-[#1F2937] p-0.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] flex items-center text-xs font-mono">
                <button
                  onClick={() => onToggleMode('SIMULATION')}
                  className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1.5 cursor-pointer ${
                    mode === 'SIMULATION'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${mode === 'SIMULATION' ? 'bg-amber-200' : 'bg-amber-500'} animate-pulse`}></span>
                  SIMULATION
                </button>
                <button
                  onClick={() => onToggleMode('REAL_HARDWARE')}
                  className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1.5 cursor-pointer ${
                    mode === 'REAL_HARDWARE'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200'
                  }`}
                >
                  <Radio className={`w-3 h-3 ${mode === 'REAL_HARDWARE' ? 'text-white' : 'text-cyan-600 dark:text-cyan-300'}`} />
                  ESP32 HARDWARE
                </button>
              </div>

              {/* Buzzer Sound Toggle */}
              <button
                onClick={onToggleBuzzerMute}
                className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 font-mono transition cursor-pointer ${
                  buzzerMuted
                    ? 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0] hover:text-[#0F172A] dark:bg-[#1F2937] dark:text-slate-400 dark:border-[#334155] dark:hover:text-slate-200'
                    : telemetry.buzzerState !== 'OFF'
                    ? 'bg-rose-50 text-rose-700 border-rose-400 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-500 animate-pulse'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-500/40 dark:hover:bg-indigo-900/60'
                }`}
                title={buzzerMuted ? 'Buzzer is MUTED (click to unmute)' : 'Buzzer is ACTIVE (click to mute)'}
              >
                {buzzerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span className="hidden sm:inline font-bold">
                  {buzzerMuted ? 'Muted' : 'Buzzer ON'}
                </span>
              </button>
            </>
          ) : (
            <span className="px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-mono font-bold">
              READ-ONLY OVERSIGHT
            </span>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            data-testid="theme-toggle"
            className="p-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] hover:bg-[#F1F5F9] dark:bg-[#1F2937] dark:hover:bg-slate-700 text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5 text-xs font-mono font-semibold shadow-xs transition-all duration-200 cursor-pointer"
          >
            {theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500 transition-transform duration-300 rotate-0" />
            ) : (
              <Moon className="w-4 h-4 text-cyan-400 transition-transform duration-300 rotate-0" />
            )}
            <span className="hidden lg:inline">
              {theme === 'light' ? 'Light' : 'Dark'}
            </span>
          </button>

          {/* Open Simulation Drawer */}
          {canOperate && mode === 'SIMULATION' && (
            <button
              onClick={onOpenSimulator}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold font-mono flex items-center gap-1.5 shadow-sm shadow-amber-900/20 border border-amber-400/30 cursor-pointer transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Simulate Sensors</span>
            </button>
          )}

          {/* Change Password Shortcut */}
          <button
            type="button"
            onClick={() => onTabChange('change-password')}
            title="Change Password"
            aria-label="Change Password"
            className="p-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] hover:bg-[#F1F5F9] dark:bg-[#1F2937] dark:hover:bg-slate-700 text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] transition cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
          </button>

          {/* Sign Out */}
          <button
            type="button"
            onClick={onLogout}
            data-testid="logout-button"
            title="Sign Out"
            className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/60 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Role-Filtered Navigation Tabs */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto no-scrollbar space-x-1 sm:space-x-1.5 py-1.5 text-xs sm:text-sm font-medium">
        {visibleNavItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-cyan-50 text-cyan-800 border border-cyan-300 shadow-xs font-bold dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-500/50 dark:shadow-sm dark:shadow-cyan-950'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] dark:hover:bg-[#1F2937]/70'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-900 dark:text-rose-300 dark:border-rose-500/40">
                  {item.badge}
                </span>
              )}
              {isAdmin && (item.id === 'admin-users' || item.id === 'admin-audit') && (
                <span className="text-[9px] px-1 py-0.2 rounded font-mono bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300">
                  ADMIN
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
