import React, { useState } from 'react';
import { VesselConfig, SensorTelemetry } from '../types/iot';
import { Sliders, Scale, Compass, Waves, Users, CheckCircle2, Send, Terminal, AlertTriangle, RotateCcw } from 'lucide-react';

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
    fetch('/api/device/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              Sensor Calibration & Remote Hardware Commands
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Execute live ESP32 serial calibration routines ('d', 'w', 't', 'm', 'z') and tune thresholds.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Calibration Stored!
              </span>
            )}
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold shadow-md transition"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>

      {/* Command Dispatch Feedback */}
      {commandFeedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-xs font-mono text-emerald-200 flex items-center gap-2 animate-pulse">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{commandFeedback}</span>
        </div>
      )}

      {/* Quick Serial Commands Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2 text-xs font-mono font-bold text-slate-300">
          <Terminal className="w-4 h-4 text-cyan-400" />
          Serial Monitor Commands Shortcut:
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
          <button
            onClick={handleCalibrateDryWater}
            className="p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-left transition"
          >
            <div className="text-cyan-400 font-bold">'d' &rarr; Dry Calib</div>
            <div className="text-[10px] text-slate-400">Keep sensor dry</div>
          </button>
          <button
            onClick={handleCalibrateWetWater}
            className="p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-left transition"
          >
            <div className="text-cyan-400 font-bold">'w' &rarr; Wet Calib</div>
            <div className="text-[10px] text-slate-400">Wet sensing tracks</div>
          </button>
          <button
            onClick={handleTareLoadCell}
            className="p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-left transition"
          >
            <div className="text-indigo-400 font-bold">'t' &rarr; Tare Scales</div>
            <div className="text-[10px] text-slate-400">দুইটি Load Cell Tare</div>
          </button>
          <button
            onClick={handleZeroMpuOffset}
            className="p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-left transition"
          >
            <div className="text-amber-400 font-bold">'m' &rarr; MPU Calib</div>
            <div className="text-[10px] text-slate-400">Model level & still</div>
          </button>
          <button
            onClick={handleResetPassengers}
            className="p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-left transition"
          >
            <div className="text-rose-400 font-bold">'z' &rarr; Reset Count</div>
            <div className="text-[10px] text-slate-400">Reset passengers</div>
          </button>
        </div>
      </div>

      {/* Calibration Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. HC-SR04 Ultrasonic Gates (GPIO 32/33 & GPIO 13/14) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                1. HC-SR04 Passenger Gates (Entry: 32/33, Exit: 13/14)
              </h3>
            </div>
            <button
              onClick={handleResetPassengers}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-[11px] font-mono border border-slate-700"
            >
              Reset ('z')
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed font-mono text-[11px]">
            Uses dual-sample arming & 3-sample clearing distance verification to prevent double-counting.
          </p>

          <div className="space-y-4 text-xs font-mono">
            <div>
              <label className="block text-slate-300 mb-1">
                Gate Detection Threshold Distance (cm)
              </label>
              <input
                type="number"
                value={formData.ultrasonicDetectionDistanceCm}
                onChange={e => setFormData({ ...formData, ultrasonicDetectionDistanceCm: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Model tested: 15.0 cm detection distance, 20.0 cm clear distance.
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px]">
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Entry Gate TRIG/ECHO:</span>
                <strong className="text-cyan-400">GPIO 32 / GPIO 33</strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Exit Gate TRIG/ECHO:</span>
                <strong className="text-cyan-400">GPIO 13 / GPIO 14</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Load Cells & HX711 Amplifier (Left: 19/18, Right: 25/26) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                2. Dual HX711 Load Cell Calibration
              </h3>
            </div>
            <button
              onClick={handleTareLoadCell}
              className="px-2.5 py-1 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 font-bold text-[11px] font-mono border border-indigo-500/50 shadow"
            >
              Tare Both ('t')
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed font-mono text-[11px]">
            User calibrated factors: Left Factor = <strong>695.416</strong>, Right Factor = <strong>706.785</strong>.
          </p>

          <div className="space-y-3 text-xs font-mono">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Left Scale Factor (19/18)</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.loadCellScaleLeft}
                  onChange={e => setFormData({ ...formData, loadCellScaleLeft: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Right Scale Factor (25/26)</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.loadCellScaleRight}
                  onChange={e => setFormData({ ...formData, loadCellScaleRight: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Left Load (19/18):</span>
                <strong className="text-cyan-300">{(telemetry.leftLoad ?? 0).toFixed(1)} g</strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Right Load (25/26):</span>
                <strong className="text-cyan-300">{(telemetry.rightLoad ?? 0).toFixed(1)} g</strong>
              </div>
              <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-1">
                <span>Load Imbalance:</span>
                <strong className="text-amber-300">{(telemetry.loadImbalancePercent ?? 0).toFixed(1)}%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 3. MPU6050 Accelerometer & Gyroscope (GPIO 21/22) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                3. MPU6050 Level Datum (I2C 21/22, 0x68)
              </h3>
            </div>
            <button
              onClick={handleZeroMpuOffset}
              className="px-2.5 py-1 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 font-bold text-[11px] font-mono border border-amber-500/50 shadow"
            >
              Calibrate ('m')
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed font-mono text-[11px]">
            Direct registers 0x3B with 100-sample pitch & roll zero bias averaging.
          </p>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center text-[11px]">
              <div>
                <span className="text-slate-400 block">Current Readings:</span>
                <span className="text-slate-200 font-bold">
                  Roll: {telemetry.roll.toFixed(2)}° | Pitch: {telemetry.pitch.toFixed(2)}°
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                0x68 Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Roll Offset (°)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.mpuRollOffset}
                  onChange={e => setFormData({ ...formData, mpuRollOffset: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Pitch Offset (°)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.mpuPitchOffset}
                  onChange={e => setFormData({ ...formData, mpuPitchOffset: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Water Level Bilge Sensor (GPIO 34) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Waves className="w-5 h-5 text-teal-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                4. Water-Level Sensor (GPIO 34 ADC)
              </h3>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={handleCalibrateDryWater}
                className="px-2 py-1 rounded bg-teal-950 hover:bg-teal-900 text-teal-300 font-bold text-[11px] font-mono border border-teal-500/50"
              >
                Dry ('d')
              </button>
              <button
                onClick={handleCalibrateWetWater}
                className="px-2 py-1 rounded bg-teal-950 hover:bg-teal-900 text-teal-300 font-bold text-[11px] font-mono border border-teal-500/50"
              >
                Wet ('w')
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed font-mono text-[11px]">
            16-sample averaging stored into ESP32 Preferences flash storage.
          </p>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Current Raw ADC (GPIO 34):</span>
                <strong className="text-cyan-300">{telemetry.waterLevelRaw} / 4095</strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Track Coverage Estimate:</span>
                <strong className="text-cyan-300">{(telemetry.waterLevelPercent ?? 0).toFixed(1)}%</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Dry ADC Reference</label>
                <input
                  type="number"
                  value={formData.waterDryAdc}
                  onChange={e => setFormData({ ...formData, waterDryAdc: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Wet ADC Reference</label>
                <input
                  type="number"
                  value={formData.waterSubmergedAdc}
                  onChange={e => setFormData({ ...formData, waterSubmergedAdc: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
