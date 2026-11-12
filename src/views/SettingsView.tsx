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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" />
              Vessel Profile & Safety Threshold Configurations
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Certified limits, river operational routes, network endpoints, and alarm boundaries.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Settings Saved!
              </span>
            )}
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow transition"
            >
              <Save className="w-4 h-4" />
              Save Vessel Settings
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Vessel Profile */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Ship className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Vessel Registry Information
            </h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <label className="block text-slate-300 mb-1">Vessel Name</label>
              <input
                type="text"
                value={formData.vesselName}
                onChange={e => setFormData({ ...formData, vesselName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Vessel Device ID</label>
              <input
                type="text"
                value={formData.vesselId}
                onChange={e => setFormData({ ...formData, vesselId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Official Registration Number</label>
              <input
                type="text"
                value={formData.registrationNumber}
                onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Designated River Route</label>
              <input
                type="text"
                value={formData.route}
                onChange={e => setFormData({ ...formData, route: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Maximum Licensed Passenger Capacity</label>
              <input
                type="number"
                value={formData.maxPassengerCapacity}
                onChange={e => setFormData({ ...formData, maxPassengerCapacity: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Maximum Safe Displacement Load (kg)</label>
              <input
                type="number"
                value={formData.maxLoadKg}
                onChange={e => setFormData({ ...formData, maxLoadKg: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* 2. Safety Hazard Thresholds */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Maritime Risk Alarm Thresholds
            </h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Warning Roll Angle (°)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.warningRollAngle}
                  onChange={e => setFormData({ ...formData, warningRollAngle: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Critical Roll Angle (°)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.criticalRollAngle}
                  onChange={e => setFormData({ ...formData, criticalRollAngle: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Warning Pitch Angle (°)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.warningPitchAngle}
                  onChange={e => setFormData({ ...formData, warningPitchAngle: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Critical Pitch Angle (°)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.criticalPitchAngle}
                  onChange={e => setFormData({ ...formData, criticalPitchAngle: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Warning Bilge Water (%)</label>
                <input
                  type="number"
                  value={formData.warningWaterLevelPercent}
                  onChange={e => setFormData({ ...formData, warningWaterLevelPercent: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Critical Bilge Water (%)</label>
                <input
                  type="number"
                  value={formData.criticalWaterLevelPercent}
                  onChange={e => setFormData({ ...formData, criticalWaterLevelPercent: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Max Port/Starboard Load Imbalance (%)</label>
              <input
                type="number"
                value={formData.maxLoadImbalancePercent}
                onChange={e => setFormData({ ...formData, maxLoadImbalancePercent: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* 3. ESP32 Wi-Fi & Telemetry API Info */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Wifi className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              ESP32 Wi-Fi & REST API Settings
            </h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <label className="block text-slate-300 mb-1">Telemetry POST Endpoint</label>
              <input
                type="text"
                readOnly
                value="/api/telemetry"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-cyan-300"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                ESP32 sends JSON HTTP POST to this local/LAN IP address.
              </span>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Telemetry Heartbeat Interval (seconds)</label>
              <input
                type="number"
                value={formData.apiHeartbeatIntervalSec}
                onChange={e => setFormData({ ...formData, apiHeartbeatIntervalSec: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* 4. NEO-6M GPS UART Configuration */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Navigation className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              NEO-6M GPS UART Interface
            </h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <label className="block text-slate-300 mb-1">Hardware Serial UART Baud Rate</label>
              <select
                value={formData.gpsUartBaudRate}
                onChange={e => setFormData({ ...formData, gpsUartBaudRate: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
              >
                <option value={9600}>9600 Baud (Standard u-blox NEO-6M Default)</option>
                <option value={19200}>19200 Baud</option>
                <option value={38400}>38400 Baud</option>
              </select>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              <strong>Pin Assignment:</strong> ESP32 GPIO 16 (RX2) &larr; NEO-6M TX. ESP32 GPIO 17 (TX2) &rarr; NEO-6M RX. Ground must be shared with the common power supply.
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
