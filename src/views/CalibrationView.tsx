import React, { useState } from 'react';
import { VesselConfig, SensorTelemetry } from '../types/iot';
import { apiFetch } from '../utils/apiClient';
import { Sliders, Scale, Compass, Waves, Users, CheckCircle2, Terminal } from 'lucide-react';

interface CalibrationViewProps {
  config: VesselConfig;
  telemetry: SensorTelemetry;
  onSaveConfig: (updated: Partial<VesselConfig>) => void;
  onSendCommand?: (cmd: string) => void;
}

export const CalibrationView: React.FC<CalibrationViewProps> = ({
  config,
  telemetry,
  onSaveConfig,
  onSendCommand
}) => {
  const [formData, setFormData] = useState<VesselConfig>({ ...config });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

  const sendCommand = (cmd: string, name: string) => {
    apiFetch('/api/device/command', {
      method: 'POST',
      body: JSON.stringify({ command: cmd })
    })
      .then(r => r.json())
      .then(() => {
        setCommandFeedback(`Command '${cmd}' (${name}) sent to ESP32!`);
        setTimeout(() => setCommandFeedback(null), 3500);
      })
      .catch(() => {
        setCommandFeedback(`Failed to send command '${cmd}'`);
        setTimeout(() => setCommandFeedback(null), 3500);
      });

    if (onSendCommand) onSendCommand(cmd);
  };

  const handleTareLoadCell = () => {
    sendCommand('t', 'Tare Both Load Cells');
    setFormData(prev => ({
      ...prev,
      loadCellTareLeft: telemetry.leftLoad ?? 0,
      loadCellTareRight: telemetry.rightLoad ?? 0
    }));
  };

  const handleZeroMpuOffset = () => {
    sendCommand('m', 'MPU6050 Level & Bias Calibration');
    setFormData(prev => ({
      ...prev,
      mpuRollOffset: -telemetry.roll,
      mpuPitchOffset: -telemetry.pitch
    }));
  };

  const handleCalibrateDryWater = () => {
    sendCommand('d', 'Water Dry Calibration');
    setFormData(prev => ({
      ...prev,
      waterDryAdc: telemetry.waterLevelRaw
    }));
  };

  const handleCalibrateWetWater = () => {
    sendCommand('w', 'Water Wet Calibration');
  };

  const handleResetPassengers = () => {
    sendCommand('z', 'Passenger Count Reset');
  };

  const handleSave = () => {
    onSaveConfig(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const inputClass =
    'w-full bg-white dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#334155] rounded-lg p-2 text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-cyan-500/40';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 shadow-sm dark:shadow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-white tracking-wide flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              Sensor Calibration &amp; Remote Hardware Commands
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 font-mono">
              Execute live ESP32 serial calibration routines (&apos;d&apos;, &apos;w&apos;, &apos;t&apos;, &apos;m&apos;, &apos;z&apos;) and tune thresholds.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Calibration Stored!
              </span>
            )}
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold shadow-md transition cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>

      {/* Command Dispatch Feedback */}
      {commandFeedback && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/60 rounded-xl text-xs font-mono text-emerald-900 dark:text-emerald-200 flex items-center gap-2 animate-pulse">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{commandFeedback}</span>
        </div>
      )}

      {/* Quick Serial Commands Bar */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 shadow-sm dark:shadow">
        <div className="flex items-center gap-2 mb-2 text-xs font-mono font-bold text-[#0F172A] dark:text-slate-300">
          <Terminal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          Serial Monitor Commands Shortcut:
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
          <button
            onClick={handleCalibrateDryWater}
            className="p-2.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] dark:bg-[#1F2937] dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-slate-200 text-left transition cursor-pointer"
          >
            <div className="text-cyan-700 dark:text-cyan-400 font-bold">&apos;d&apos; &rarr; Dry Calib</div>
            <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Keep sensor dry</div>
          </button>
          <button
            onClick={handleCalibrateWetWater}
            className="p-2.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] dark:bg-[#1F2937] dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-slate-200 text-left transition cursor-pointer"
          >
            <div className="text-cyan-700 dark:text-cyan-400 font-bold">&apos;w&apos; &rarr; Wet Calib</div>
            <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Wet sensing tracks</div>
          </button>
          <button
            onClick={handleTareLoadCell}
            className="p-2.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] dark:bg-[#1F2937] dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-slate-200 text-left transition cursor-pointer"
          >
            <div className="text-indigo-700 dark:text-indigo-400 font-bold">&apos;t&apos; &rarr; Tare Scales</div>
            <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">দুইটি Load Cell Tare</div>
          </button>
          <button
            onClick={handleZeroMpuOffset}
            className="p-2.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] dark:bg-[#1F2937] dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-slate-200 text-left transition cursor-pointer"
          >
            <div className="text-amber-700 dark:text-amber-400 font-bold">&apos;m&apos; &rarr; MPU Calib</div>
            <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Model level &amp; still</div>
          </button>
          <button
            onClick={handleResetPassengers}
            className="p-2.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] dark:bg-[#1F2937] dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-slate-200 text-left transition cursor-pointer"
          >
            <div className="text-rose-700 dark:text-rose-400 font-bold">&apos;z&apos; &rarr; Reset Count</div>
            <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Reset passengers</div>
          </button>
        </div>
      </div>

      {/* Calibration Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. HC-SR04 Ultrasonic Gates */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-5 shadow-sm dark:shadow">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-200 uppercase tracking-wider font-mono">
                1. HC-SR04 Passenger Gates (Entry: 32/33, Exit: 13/14)
              </h3>
            </div>
            <button
              onClick={handleResetPassengers}
              className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-rose-300 dark:border-slate-700 font-bold text-[11px] font-mono cursor-pointer shrink-0"
            >
              Reset (&apos;z&apos;)
            </button>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mb-4 leading-relaxed font-mono text-[11px]">
            Uses dual-sample arming &amp; 3-sample clearing distance verification to prevent double-counting.
          </p>

          <div className="space-y-4 text-xs font-mono">
            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">
                Gate Detection Threshold Distance (cm)
              </label>
              <input
                type="number"
                value={formData.ultrasonicDetectionDistanceCm}
                onChange={e => setFormData({ ...formData, ultrasonicDetectionDistanceCm: Number(e.target.value) })}
                className={inputClass}
              />
              <span className="text-[10px] text-[#64748B] dark:text-slate-500 mt-0.5 block">
                Model tested: 15.0 cm detection distance, 20.0 cm clear distance.
              </span>
            </div>

            <div className="p-3 bg-[#F8FAFC] dark:bg-[#0B1120] rounded-lg border border-[#E2E8F0] dark:border-[#334155] text-[11px]">
              <div className="flex justify-between text-[#64748B] dark:text-slate-300 mb-1">
                <span>Entry Gate TRIG/ECHO:</span>
                <strong className="text-cyan-700 dark:text-cyan-400">GPIO 32 / GPIO 33</strong>
              </div>
              <div className="flex justify-between text-[#64748B] dark:text-slate-300">
                <span>Exit Gate TRIG/ECHO:</span>
                <strong className="text-cyan-700 dark:text-cyan-400">GPIO 13 / GPIO 14</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Load Cells & HX711 Amplifier */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-5 shadow-sm dark:shadow">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-200 uppercase tracking-wider font-mono">
                2. Dual HX711 Load Cell Calibration
              </h3>
            </div>
            <button
              onClick={handleTareLoadCell}
              className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:text-indigo-300 dark:border-indigo-500/50 font-bold text-[11px] font-mono shadow-xs cursor-pointer shrink-0"
            >
              Tare Both (&apos;t&apos;)
            </button>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mb-3 leading-relaxed font-mono text-[11px]">
            User calibrated factors: Left Factor = <strong className="text-[#0F172A] dark:text-slate-200">695.416</strong>, Right Factor = <strong className="text-[#0F172A] dark:text-slate-200">706.785</strong>.
          </p>

          <div className="space-y-3 text-xs font-mono">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Left Scale Factor (19/18)</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.loadCellScaleLeft}
                  onChange={e => setFormData({ ...formData, loadCellScaleLeft: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Right Scale Factor (25/26)</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.loadCellScaleRight}
                  onChange={e => setFormData({ ...formData, loadCellScaleRight: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="p-3 bg-[#F8FAFC] dark:bg-[#0B1120] rounded-lg border border-[#E2E8F0] dark:border-[#334155] text-[11px] space-y-1">
              <div className="flex justify-between text-[#64748B] dark:text-slate-300">
                <span>Left Load (19/18):</span>
                <strong className="text-cyan-700 dark:text-cyan-300">{(telemetry.leftLoad ?? 0).toFixed(1)} g</strong>
              </div>
              <div className="flex justify-between text-[#64748B] dark:text-slate-300">
                <span>Right Load (25/26):</span>
                <strong className="text-cyan-700 dark:text-cyan-300">{(telemetry.rightLoad ?? 0).toFixed(1)} g</strong>
              </div>
              <div className="flex justify-between text-[#64748B] dark:text-slate-300 border-t border-[#E2E8F0] dark:border-[#334155] pt-1">
                <span>Load Imbalance:</span>
                <strong className="text-amber-700 dark:text-amber-300">{(telemetry.loadImbalancePercent ?? 0).toFixed(1)}%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 3. MPU6050 Accelerometer & Gyroscope */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-5 shadow-sm dark:shadow">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-200 uppercase tracking-wider font-mono">
                3. MPU6050 Level Datum (I2C 21/22, 0x68)
              </h3>
            </div>
            <button
              onClick={handleZeroMpuOffset}
              className="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:hover:bg-amber-900 dark:text-amber-300 dark:border-amber-500/50 font-bold text-[11px] font-mono shadow-xs cursor-pointer shrink-0"
            >
              Calibrate (&apos;m&apos;)
            </button>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mb-3 leading-relaxed font-mono text-[11px]">
            Direct registers 0x3B with 100-sample pitch &amp; roll zero bias averaging.
          </p>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 bg-[#F8FAFC] dark:bg-[#0B1120] rounded-lg border border-[#E2E8F0] dark:border-[#334155] flex justify-between items-center text-[11px]">
              <div>
                <span className="text-[#64748B] dark:text-[#94A3B8] block">Current Readings:</span>
                <span className="text-[#0F172A] dark:text-slate-200 font-bold">
                  Roll: {telemetry.roll.toFixed(2)}° | Pitch: {telemetry.pitch.toFixed(2)}°
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/30 font-semibold">
                0x68 Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Roll Offset (°)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.mpuRollOffset}
                  onChange={e => setFormData({ ...formData, mpuRollOffset: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Pitch Offset (°)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.mpuPitchOffset}
                  onChange={e => setFormData({ ...formData, mpuPitchOffset: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Water Level Bilge Sensor */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-5 shadow-sm dark:shadow">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2">
              <Waves className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-200 uppercase tracking-wider font-mono">
                4. Water-Level Sensor (GPIO 34 ADC)
              </h3>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={handleCalibrateDryWater}
                className="px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 dark:bg-teal-950 dark:hover:bg-teal-900 dark:text-teal-300 dark:border-teal-500/50 font-bold text-[11px] font-mono cursor-pointer"
              >
                Dry (&apos;d&apos;)
              </button>
              <button
                onClick={handleCalibrateWetWater}
                className="px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 dark:bg-teal-950 dark:hover:bg-teal-900 dark:text-teal-300 dark:border-teal-500/50 font-bold text-[11px] font-mono cursor-pointer"
              >
                Wet (&apos;w&apos;)
              </button>
            </div>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mb-3 leading-relaxed font-mono text-[11px]">
            16-sample averaging stored into ESP32 Preferences flash storage.
          </p>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 bg-[#F8FAFC] dark:bg-[#0B1120] rounded-lg border border-[#E2E8F0] dark:border-[#334155] text-[11px] space-y-1">
              <div className="flex justify-between text-[#64748B] dark:text-slate-300">
                <span>Current Raw ADC (GPIO 34):</span>
                <strong className="text-cyan-700 dark:text-cyan-300">{telemetry.waterLevelRaw} / 4095</strong>
              </div>
              <div className="flex justify-between text-[#64748B] dark:text-slate-300">
                <span>Track Coverage Estimate:</span>
                <strong className="text-cyan-700 dark:text-cyan-300">{(telemetry.waterLevelPercent ?? 0).toFixed(1)}%</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Dry ADC Reference</label>
                <input
                  type="number"
                  value={formData.waterDryAdc}
                  onChange={e => setFormData({ ...formData, waterDryAdc: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-semibold">Wet ADC Reference</label>
                <input
                  type="number"
                  value={formData.waterSubmergedAdc}
                  onChange={e => setFormData({ ...formData, waterSubmergedAdc: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
