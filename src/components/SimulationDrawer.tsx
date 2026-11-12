import React from 'react';
import { SensorTelemetry, VesselConfig } from '../types/iot';
import { buzzerAudio } from '../utils/buzzerAudio';
import { AlertTriangle, Users, Waves, Gauge, Compass, Volume2, RotateCcw, ShieldCheck, Flame } from 'lucide-react';

interface SimulationDrawerProps {
  telemetry: SensorTelemetry;
  config: VesselConfig;
  onUpdateSimulation: (updates: Partial<SensorTelemetry>) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SimulationDrawer: React.FC<SimulationDrawerProps> = ({
  telemetry,
  config,
  onUpdateSimulation,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const handlePassengerChange = (delta: number) => {
    const newCount = Math.max(0, telemetry.passengerCount + delta);
    const newEntry = delta > 0 ? telemetry.entryCount + delta : telemetry.entryCount;
    const newExit = delta < 0 ? telemetry.exitCount + Math.abs(delta) : telemetry.exitCount;
    onUpdateSimulation({
      passengerCount: newCount,
      entryCount: newEntry,
      exitCount: newExit
    });
  };

  const handleApplyPreset = (type: 'SAFE' | 'OVERCROWDED' | 'CRITICAL_ROLL' | 'WATER_INGRESS') => {
    if (type === 'SAFE') {
      onUpdateSimulation({
        passengerCount: 12,
        roll: 1.2,
        pitch: 0.8,
        waterLevelPercent: 3.5,
        waterLevelRaw: 180,
        leftLoad: 410.0,
        rightLoad: 405.0,
        totalLoad: 815.0,
        loadImbalancePercent: 0.6,
        dualHX711Connected: true,
        gps: { ...telemetry.gps, fixValid: true, speedKmh: 16.0 }
      });
    } else if (type === 'OVERCROWDED') {
      onUpdateSimulation({
        passengerCount: 48, // Near/exceeding prototype capacity
        entryCount: telemetry.entryCount + 30,
        roll: 3.2,
        pitch: 1.5,
        waterLevelPercent: 8.0,
        waterLevelRaw: 350,
        leftLoad: 890.0,
        rightLoad: 875.0,
        totalLoad: 1765.0,
        dualHX711Connected: true
      });
    } else if (type === 'CRITICAL_ROLL') {
      onUpdateSimulation({
        passengerCount: 25,
        roll: 12.8, // > 10 deg critical prototype limit
        pitch: 2.2,
        waterLevelPercent: 12.0,
        waterLevelRaw: 480,
        leftLoad: 850.0,
        rightLoad: 120.0,
        loadImbalancePercent: 75.3,
        dualHX711Connected: true
      });
    } else if (type === 'WATER_INGRESS') {
      onUpdateSimulation({
        passengerCount: 15,
        roll: 4.8,
        pitch: 3.5,
        waterLevelPercent: 72.0, // > 60% critical limit
        waterLevelRaw: 3350,
        dualHX711Connected: true
      });
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-900/98 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></div>
          <h2 className="text-base font-bold text-white tracking-wide">
            Interactive IoT Sensor Simulator
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono"
        >
          Close [Esc]
        </button>
      </div>

      <div className="p-4 bg-amber-950/30 border-b border-amber-900/50 text-[11px] text-amber-300 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong>Simulation Mode Active:</strong> Values injected here trigger the real-time Risk Engine, generate multi-level alerts, and synthesize active buzzer sounds.
        </span>
      </div>

      {/* Preset Scenarios */}
      <div className="p-4 border-b border-slate-800">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-mono">
          ⚡ 1-Click Safety Scenarios:
        </label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={() => handleApplyPreset('SAFE')}
            className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-semibold text-left transition"
          >
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <div>
              <div className="font-bold">1. Safe Sailing</div>
              <div className="text-[10px] text-emerald-400/80">Score: 0-24</div>
            </div>
          </button>

          <button
            onClick={() => handleApplyPreset('OVERCROWDED')}
            className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 font-semibold text-left transition"
          >
            <Users className="w-4 h-4 shrink-0 text-amber-400" />
            <div>
              <div className="font-bold">2. Overcrowded</div>
              <div className="text-[10px] text-amber-400/80">115% Capacity</div>
            </div>
          </button>

          <button
            onClick={() => handleApplyPreset('CRITICAL_ROLL')}
            className="flex items-center gap-1.5 p-2 rounded-lg bg-orange-950/50 hover:bg-orange-900/60 border border-orange-500/40 text-orange-300 font-semibold text-left transition"
          >
            <Compass className="w-4 h-4 shrink-0 text-orange-400" />
            <div>
              <div className="font-bold">3. Severe Roll List</div>
              <div className="text-[10px] text-orange-400/80">15.8° Port List</div>
            </div>
          </button>

          <button
            onClick={() => handleApplyPreset('WATER_INGRESS')}
            className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 font-semibold text-left transition"
          >
            <Flame className="w-4 h-4 shrink-0 text-rose-400" />
            <div>
              <div className="font-bold">4. Bilge Leak Ingress</div>
              <div className="text-[10px] text-rose-400/80">74% Hull Flood</div>
            </div>
          </button>
        </div>
      </div>

      {/* Sensor Interactive Sliders */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Passenger Gates */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-cyan-400" />
              HC-SR04 Passenger Gates
            </span>
            <span className="font-mono text-cyan-300 font-bold text-sm">
              {telemetry.passengerCount} / {config.maxPassengerCapacity}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 mb-2">
            <button
              onClick={() => handlePassengerChange(1)}
              className="py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 font-bold rounded"
            >
              +1 In
            </button>
            <button
              onClick={() => handlePassengerChange(25)}
              className="py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 font-bold rounded"
            >
              +25 In
            </button>
            <button
              onClick={() => handlePassengerChange(-1)}
              className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded"
            >
              -1 Out
            </button>
            <button
              onClick={() => handlePassengerChange(-25)}
              className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded"
            >
              -25 Out
            </button>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>Entry Gate Total: {telemetry.entryCount}</span>
            <span>Exit Gate Total: {telemetry.exitCount}</span>
          </div>
        </div>

        {/* MPU6050 Roll / Pitch */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-400" />
              MPU6050 Roll Angle (Tilt)
            </span>
            <span className="font-mono text-amber-300 font-bold text-sm">
              {telemetry.roll > 0 ? `+${telemetry.roll.toFixed(1)}°` : `${telemetry.roll.toFixed(1)}°`}
            </span>
          </div>
          <input
            type="range"
            min="-25"
            max="25"
            step="0.5"
            value={telemetry.roll}
            onChange={(e) => onUpdateSimulation({ roll: parseFloat(e.target.value) })}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>-25° Port</span>
            <span>0° Level</span>
            <span>+25° Starboard</span>
          </div>
        </div>

        {/* Water Level */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Waves className="w-4 h-4 text-cyan-400" />
              Bilge Water Ingress Level
            </span>
            <span className="font-mono text-cyan-300 font-bold text-sm">
              {(telemetry.waterLevelPercent ?? 0).toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={telemetry.waterLevelPercent ?? 0}
            onChange={(e) => {
              const pct = parseFloat(e.target.value);
              const rawAdc = Math.round(150 + (pct / 100) * (3200 - 150));
              onUpdateSimulation({ waterLevelPercent: pct, waterLevelRaw: rawAdc });
            }}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>0% Dry</span>
            <span>30% Warning</span>
            <span>65% Critical</span>
          </div>
        </div>

        {/* Total Load */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-indigo-400" />
              Load Cell Total Weight
            </span>
            <span className="font-mono text-indigo-300 font-bold text-sm">
              {((telemetry.totalLoad ?? 20000) / 1000).toFixed(1)} tons
            </span>
          </div>
          <input
            type="range"
            min="5000"
            max="60000"
            step="1000"
            value={telemetry.totalLoad ?? 20000}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onUpdateSimulation({
                totalLoad: val,
                leftLoad: Math.round(val * 0.5),
                rightLoad: Math.round(val * 0.5)
              });
            }}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>5,000 kg</span>
            <span>45,000 kg Max</span>
            <span>60,000 kg</span>
          </div>
        </div>

        {/* GPS Fix Toggle */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-200">NEO-6M GPS Fix Status</div>
            <div className="text-[10px] text-slate-400 font-mono">Simulate outdoor sky lock vs indoor loss</div>
          </div>
          <button
            onClick={() => onUpdateSimulation({
              gps: {
                ...telemetry.gps,
                fixValid: !telemetry.gps.fixValid,
                isStale: telemetry.gps.fixValid
              }
            })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
              telemetry.gps.fixValid
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-950 text-rose-300 border border-rose-500/40'
            }`}
          >
            {telemetry.gps.fixValid ? '3D Fix Locked' : 'Signal Lost'}
          </button>
        </div>
      </div>

      {/* Footer with Buzzer Test */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex gap-2">
        <button
          onClick={() => buzzerAudio.testBuzzer()}
          className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-1.5 shadow"
        >
          <Volume2 className="w-4 h-4" />
          Test Active Buzzer
        </button>
        <button
          onClick={() => handleApplyPreset('SAFE')}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          title="Reset to Defaults"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
