import React from 'react';
import { SensorTelemetry, VesselConfig, SafetyAlert } from '../types/iot';
import { RiskGauge } from '../components/RiskGauge';
import { AttitudeIndicator } from '../components/AttitudeIndicator';
import { WaterLevelGauge } from '../components/WaterLevelGauge';
import { LoadCellWidget } from '../components/LoadCellWidget';
import { VesselMap } from '../components/VesselMap';
import { buzzerAudio } from '../utils/buzzerAudio';
import {
  Users,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Volume2,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Compass,
  MapPin
} from 'lucide-react';

interface DashboardViewProps {
  telemetry: SensorTelemetry;
  config: VesselConfig;
  alerts: SafetyAlert[];
  onOpenSimulator: () => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  telemetry,
  config,
  alerts,
  onOpenSimulator,
  onNavigateToTab
}) => {
  const capacityPercent = telemetry.capacityPercentage;
  const isOvercrowded = telemetry.passengerCount > config.maxPassengerCapacity;
  const isNearCapacity = !isOvercrowded && capacityPercent >= 90;

  return (
    <div className="space-y-6">
      {/* Real Hardware vs Simulation Mode Alert Banner */}
      {telemetry.mode === 'SIMULATION' ? (
        <div className="bg-amber-950/40 border border-amber-600/40 rounded-xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
            <span>
              <strong>Simulation Mode:</strong> Displaying simulated sensor readings along the Sadarghat–Chandpur river course.
            </span>
          </div>
          <button
            onClick={onOpenSimulator}
            className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold font-mono transition shadow"
          >
            Adjust Sensors / Inject Hazards &rarr;
          </button>
        </div>
      ) : (
        <div className="bg-cyan-950/40 border border-cyan-600/40 rounded-xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs text-cyan-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>
              <strong>Real Hardware Mode:</strong> Listening for live ESP32 telemetry on <code className="bg-cyan-900/60 px-1 py-0.5 rounded font-mono">POST /api/telemetry</code>.
            </span>
          </div>
          <span className="text-[11px] font-mono text-cyan-300">
            {telemetry.hardwareHealth.esp32Wifi ? '✓ ESP32 Wi-Fi Stream Active' : '⚠️ Awaiting ESP32 Heartbeat'}
          </span>
        </div>
      )}

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Passenger Count Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold">
              <Users className="w-4 h-4 text-cyan-400" />
              HC-SR04 Passengers
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
              isOvercrowded ? 'bg-rose-950 text-rose-400 border border-rose-500 animate-pulse' :
              isNearCapacity ? 'bg-amber-950 text-amber-400 border border-amber-500' :
              'bg-emerald-950 text-emerald-400'
            }`}>
              {isOvercrowded ? 'OVERCROWDED' : isNearCapacity ? 'CAPACITY ALERT' : 'SAFE CAPACITY'}
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black font-mono ${isOvercrowded ? 'text-rose-400' : 'text-white'}`}>
                {telemetry.passengerCount}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                / {config.maxPassengerCapacity} Max
              </span>
            </div>

            {/* Capacity Progress Bar */}
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mt-2 border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOvercrowded ? 'bg-rose-500' :
                  isNearCapacity ? 'bg-amber-500' :
                  'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, capacityPercent)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>{capacityPercent}% Rated Cap</span>
              <span>Gate Status: {isOvercrowded ? 'Halt Boarding' : 'Open'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
            <div className="flex items-center gap-1 text-slate-300">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              <span>In: <strong className="text-white">{telemetry.entryCount}</strong></span>
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <ArrowDownRight className="w-3.5 h-3.5 text-sky-400" />
              <span>Out: <strong className="text-white">{telemetry.exitCount}</strong></span>
            </div>
          </div>
        </div>

        {/* 2. Safety Risk Score Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Risk Assessment
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              Rule-Based AIoT
            </span>
          </div>

          <div className="flex items-center justify-center my-1">
            <RiskGauge
              score={telemetry.riskScore}
              level={telemetry.riskStatus}
              primaryHazard={telemetry.riskFactors.find(f => f.severity === telemetry.riskStatus)?.factor || null}
            />
          </div>

          <div className="text-[11px] font-mono text-slate-400 text-center border-t border-slate-800 pt-1.5 truncate">
            {telemetry.recommendedActions[0] || 'Parameters normal.'}
          </div>
        </div>

        {/* 3. MPU6050 Stability & Tilt Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold">
              <Compass className="w-4 h-4 text-sky-400" />
              Vessel Tilt (MPU6050)
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
              Math.abs(telemetry.roll) > config.criticalRollAngle ? 'bg-rose-950 text-rose-400 border border-rose-500' :
              Math.abs(telemetry.roll) > config.warningRollAngle ? 'bg-amber-950 text-amber-400' :
              'bg-emerald-950 text-emerald-400'
            }`}>
              {Math.abs(telemetry.roll) > config.criticalRollAngle ? 'DANGEROUS LIST' : 'STABLE'}
            </span>
          </div>

          <div className="my-2 grid grid-cols-2 gap-2 text-center font-mono">
            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Roll (Port/Stbd)</span>
              <span className={`text-2xl font-black ${
                Math.abs(telemetry.roll) > config.criticalRollAngle ? 'text-rose-400' :
                Math.abs(telemetry.roll) > config.warningRollAngle ? 'text-amber-400' : 'text-slate-100'
              }`}>
                {telemetry.roll > 0 ? `+${telemetry.roll.toFixed(1)}°` : `${telemetry.roll.toFixed(1)}°`}
              </span>
            </div>
            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Pitch (Bow/Stern)</span>
              <span className="text-2xl font-black text-slate-100">
                {telemetry.pitch > 0 ? `+${telemetry.pitch.toFixed(1)}°` : `${telemetry.pitch.toFixed(1)}°`}
              </span>
            </div>
          </div>

          <div className="flex justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800 pt-2">
            <span>Warning Roll: <strong>±{config.warningRollAngle}°</strong></span>
            <span>Critical: <strong>±{config.criticalRollAngle}°</strong></span>
          </div>
        </div>

        {/* 4. GPS & Speed Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold">
              <MapPin className="w-4 h-4 text-teal-400" />
              u-blox NEO-6M GPS
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
              telemetry.gps.fixValid ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' :
              'bg-amber-950 text-amber-400'
            }`}>
              {telemetry.gps.fixValid ? '3D FIX LOCKED' : 'SEARCHING'}
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white font-mono">
                {telemetry.gps.speedKmh ? telemetry.gps.speedKmh.toFixed(1) : '0.0'}
              </span>
              <span className="text-xs text-slate-400 font-mono">km/h Speed</span>
            </div>

            <div className="text-[11px] font-mono text-slate-300 mt-2 space-y-1 bg-slate-950/70 p-2 rounded-lg border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Heading Course:</span>
                <span className="text-cyan-400 font-bold">{telemetry.gps.course ? `${telemetry.gps.course}°` : '145°'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Satellites:</span>
                <span className="text-emerald-400 font-bold">{telemetry.gps.satellites ?? 0} locked</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 border-t border-slate-800 pt-2 flex justify-between">
            <span>UART Baud: <strong>9600</strong></span>
            <button
              onClick={() => onNavigateToTab('vessel-tracking')}
              className="text-cyan-400 hover:text-cyan-300 font-bold"
            >
              Full Map &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Main Center Grid: Instruments & Quick Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Attitude Horizon & Bilge Water */}
        <div className="space-y-6">
          <AttitudeIndicator
            roll={telemetry.roll}
            pitch={telemetry.pitch}
            warningRollThreshold={config.warningRollAngle}
            criticalRollThreshold={config.criticalRollAngle}
          />
          <WaterLevelGauge
            waterLevelPercent={telemetry.waterLevelPercent}
            rawAdc={telemetry.waterLevelRaw}
            warningThreshold={config.warningWaterLevelPercent}
            criticalThreshold={config.criticalWaterLevelPercent}
          />
        </div>

        {/* Column 2: Load Cells & Active Buzzer Alarm Unit */}
        <div className="space-y-6">
          <LoadCellWidget
            leftLoad={telemetry.leftLoad}
            rightLoad={telemetry.rightLoad}
            totalLoad={telemetry.totalLoad}
            loadImbalancePercent={telemetry.loadImbalancePercent}
            dualHX711Connected={telemetry.dualHX711Connected}
            maxLoadKg={config.maxLoadKg}
            onTare={() => fetch('/api/device/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: 't' }) })}
          />

          {/* Active Buzzer Module Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  telemetry.buzzerState !== 'OFF' ? 'bg-rose-500 animate-ping' : 'bg-slate-600'
                }`}></div>
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  Active Buzzer Alert System (GPIO 27 NPN)
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                telemetry.buzzerState === 'CONTINUOUS_ALARM' ? 'bg-rose-950 text-rose-300 border border-rose-500 animate-pulse' :
                telemetry.buzzerState === 'RAPID_HIGH_RISK' ? 'bg-orange-950 text-orange-400 border border-orange-500' :
                telemetry.buzzerState === 'INTERMITTENT_WARNING' ? 'bg-amber-950 text-amber-400 border border-amber-500' :
                'bg-slate-800 text-slate-400'
              }`}>
                {telemetry.buzzerState}
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Synthesizes audible alert signals according to real-time risk level. Warning sounds intermittent beeps, High Risk sounds rapid bursts, and Critical sounds continuous urgent sirens.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => buzzerAudio.testBuzzer()}
                className="flex-1 py-2 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition"
              >
                <Volume2 className="w-4 h-4" />
                Play Audio Test Pulse
              </button>
            </div>
          </div>
        </div>

        {/* Column 3: Live GPS River Map Preview & Incident Logs */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-400" />
                Live GPS Position & River Course
              </h3>
              <button
                onClick={() => onNavigateToTab('vessel-tracking')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-mono font-bold"
              >
                Expand Tracking &rarr;
              </button>
            </div>

            <VesselMap
              gps={telemetry.gps}
              vesselName={telemetry.vesselName}
              riskStatus={telemetry.riskStatus}
              height="240px"
              interactive={true}
            />
          </div>

          {/* Quick Active Alerts Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Active Safety Warnings ({alerts.length})
              </h3>
              <button
                onClick={() => onNavigateToTab('alerts')}
                className="text-xs text-slate-400 hover:text-slate-200 font-mono"
              >
                View All &rarr;
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {alerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-2.5 rounded-lg border text-xs font-mono flex items-start gap-2 ${
                    alert.level === 'CRITICAL' ? 'bg-rose-950/40 border-rose-500/50 text-rose-200' :
                    alert.level === 'HIGH RISK' ? 'bg-orange-950/40 border-orange-500/50 text-orange-200' :
                    alert.level === 'WARNING' ? 'bg-amber-950/40 border-amber-500/50 text-amber-200' :
                    'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <strong className="truncate font-semibold">{alert.title}</strong>
                      <span className="text-[10px] opacity-75 shrink-0 ml-1">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90 line-clamp-1 mt-0.5">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
