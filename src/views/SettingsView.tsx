import React, { useState } from 'react';
import { VesselConfig } from '../types/iot';
import { Settings, Save, Ship, ShieldAlert, Wifi, Navigation, CheckCircle2 } from 'lucide-react';

interface SettingsViewProps {
  config: VesselConfig;
  onSaveConfig: (updated: Partial<VesselConfig>) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ config, onSaveConfig }) => {
  const [formData, setFormData] = useState<VesselConfig>({ ...config });
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const inputClass =
    'w-full bg-white dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#334155] rounded-lg p-2 text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-cyan-500/40';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 shadow-sm dark:shadow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-white tracking-wide flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              Vessel Profile &amp; Safety Threshold Configurations
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 font-mono">
              Certified limits, river operational routes, network endpoints, and alarm boundaries.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Settings Saved!
              </span>
            )}
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Vessel Settings
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Vessel Profile */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-5 shadow-sm dark:shadow space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#334155] pb-2">
            <Ship className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-200 uppercase tracking-wider font-mono">
              Vessel Registry Information
            </h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Vessel Name</label>
              <input
                type="text"
                value={formData.vesselName}
                onChange={e => setFormData({ ...formData, vesselName: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Vessel Device ID</label>
              <input
                type="text"
                value={formData.vesselId}
                onChange={e => setFormData({ ...formData, vesselId: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Official Registration Number</label>
              <input
                type="text"
                value={formData.registrationNumber}
                onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Designated River Route</label>
              <input
                type="text"
                value={formData.route}
                onChange={e => setFormData({ ...formData, route: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Maximum Licensed Passenger Capacity</label>
              <input
                type="number"
                value={formData.maxPassengerCapacity}
                onChange={e => setFormData({ ...formData, maxPassengerCapacity: Number(e.target.value) })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Maximum Safe Displacement Load (kg)</label>
              <input
                type="number"
                value={formData.maxLoadKg}
                onChange={e => setFormData({ ...formData, maxLoadKg: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* 2. Safety Hazard Thresholds */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-5 shadow-sm dark:shadow space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#334155] pb-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-200 uppercase tracking-wider font-mono">
              Maritime Risk Alarm Thresholds
            </h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Warning Roll Angle (°)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.warningRollAngle}
                  onChange={e => setFormData({ ...formData, warningRollAngle: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Critical Roll Angle (°)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.criticalRollAngle}
                  onChange={e => setFormData({ ...formData, criticalRollAngle: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Warning Pitch Angle (°)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.warningPitchAngle}
                  onChange={e => setFormData({ ...formData, warningPitchAngle: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Critical Pitch Angle (°)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.criticalPitchAngle}
                  onChange={e => setFormData({ ...formData, criticalPitchAngle: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Warning Bilge Water (%)</label>
                <input
                  type="number"
                  value={formData.warningWaterLevelPercent}
                  onChange={e => setFormData({ ...formData, warningWaterLevelPercent: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Critical Bilge Water (%)</label>
                <input
                  type="number"
                  value={formData.criticalWaterLevelPercent}
                  onChange={e => setFormData({ ...formData, criticalWaterLevelPercent: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Max Port/Starboard Load Imbalance (%)</label>
              <input
                type="number"
                value={formData.maxLoadImbalancePercent}
                onChange={e => setFormData({ ...formData, maxLoadImbalancePercent: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* 3. ESP32 Wi-Fi & Telemetry API Info */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-5 shadow-sm dark:shadow space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#334155] pb-2">
            <Wifi className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-200 uppercase tracking-wider font-mono">
              ESP32 Wi-Fi &amp; REST API Settings
            </h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Telemetry POST Endpoint</label>
              <input
                type="text"
                readOnly
                value="/api/telemetry"
                className="w-full bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#334155] rounded-lg p-2 text-cyan-700 dark:text-cyan-300 font-semibold"
              />
              <span className="text-[10px] text-[#64748B] dark:text-slate-500 mt-0.5 block">
                ESP32 sends JSON HTTP POST to this local/LAN IP address.
              </span>
            </div>

            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Telemetry Heartbeat Interval (seconds)</label>
              <input
                type="number"
                value={formData.apiHeartbeatIntervalSec}
                onChange={e => setFormData({ ...formData, apiHeartbeatIntervalSec: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* 4. NEO-6M GPS UART Configuration */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-5 shadow-sm dark:shadow space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#334155] pb-2">
            <Navigation className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-200 uppercase tracking-wider font-mono">
              NEO-6M GPS UART Interface
            </h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Hardware Serial UART Baud Rate</label>
              <select
                value={formData.gpsUartBaudRate}
                onChange={e => setFormData({ ...formData, gpsUartBaudRate: Number(e.target.value) })}
                className={inputClass}
              >
                <option value={9600}>9600 Baud (Standard u-blox NEO-6M Default)</option>
                <option value={19200}>19200 Baud</option>
                <option value={38400}>38400 Baud</option>
              </select>
            </div>

            <div className="p-3 bg-[#F8FAFC] dark:bg-[#0B1120] rounded-lg border border-[#E2E8F0] dark:border-[#334155] text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              <strong className="text-[#0F172A] dark:text-slate-200">Pin Assignment:</strong> ESP32 GPIO 16 (RX2) &larr; NEO-6M TX. ESP32 GPIO 17 (TX2) &rarr; NEO-6M RX. Ground must be shared with the common power supply.
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
