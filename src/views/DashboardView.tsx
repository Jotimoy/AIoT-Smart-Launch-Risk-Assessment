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
  AlertTriangle,
  Volume2,
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
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-600/40 rounded-xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 transition-colors duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-ping"></span>
            <span>
              <strong>Simulation Mode:</strong> Displaying simulated sensor readings along the Sadarghat–Chandpur river course.
            </span>
          </div>
          <button
            onClick={onOpenSimulator}
            className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold font-mono transition shadow cursor-pointer"
          >
            Adjust Sensors / Inject Hazards &rarr;
          </button>
        </div>
      ) : (
        <div className="bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-600/40 rounded-xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs text-cyan-900 dark:text-cyan-200 transition-colors duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse"></span>
            <span>
              <strong>Real Hardware Mode:</strong> Listening for live ESP32 telemetry on <code className="bg-cyan-100 dark:bg-cyan-900/60 px-1 py-0.5 rounded font-mono text-cyan-900 dark:text-cyan-200">POST /api/telemetry</code>.
            </span>
          </div>
          <span className="text-[11px] font-mono text-cyan-800 dark:text-cyan-300 font-semibold">
            {telemetry.hardwareHealth.esp32Wifi ? '✓ ESP32 Wi-Fi Stream Active' : '⚠️ Awaiting ESP32 Heartbeat'}
          </span>
        </div>
      )}

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Passenger Count Card */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-sm dark:shadow-lg relative overflow-hidden transition-colors duration-200">
          <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
            <span className="flex items-center gap-1.5 font-semibold">
              <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              HC-SR04 Passengers
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
              isOvercrowded
                ? 'bg-rose-50 text-rose-700 border-rose-400 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-500 animate-pulse'
                : isNearCapacity
                ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-500'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
            }`}>
              {isOvercrowded ? 'OVERCROWDED' : isNearCapacity ? 'CAPACITY ALERT' : 'SAFE CAPACITY'}
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black font-mono ${isOvercrowded ? 'text-rose-600 dark:text-rose-400' : 'text-[#0F172A] dark:text-white'}`}>
                {telemetry.passengerCount}
              </span>
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-mono">
                / {config.maxPassengerCapacity} Max
              </span>
            </div>

            <div className="w-full bg-[#F1F5F9] dark:bg-[#0B1120] h-2 rounded-full overflow-hidden mt-2 border border-[#E2E8F0] dark:border-[#334155]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOvercrowded ? 'bg-rose-500' :
                  isNearCapacity ? 'bg-amber-500' :
                  'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, capacityPercent)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8] mt-1">
              <span>{capacityPercent}% Rated Cap</span>
              <span>Gate Status: {isOvercrowded ? 'Halt Boarding' : 'Open'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#334155] text-[11px] font-mono">
            <div className="flex items-center gap-1 text-[#64748B] dark:text-slate-300">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>In: <strong className="text-[#0F172A] dark:text-white">{telemetry.entryCount}</strong></span>
            </div>
            <div className="flex items-center gap-1 text-[#64748B] dark:text-slate-300">
              <ArrowDownRight className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Out: <strong className="text-[#0F172A] dark:text-white">{telemetry.exitCount}</strong></span>
            </div>
          </div>
        </div>

        {/* 2. Safety Risk Score Card */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-sm dark:shadow-lg transition-colors duration-200">
          <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
            <span className="flex items-center gap-1.5 font-semibold">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Risk Assessment
            </span>
            <span className="text-[10px] font-mono text-[#64748B] dark:text-slate-500 uppercase">
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

          <div className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8] text-center border-t border-[#E2E8F0] dark:border-[#334155] pt-1.5 truncate">
            {telemetry.recommendedActions[0] || 'Parameters normal.'}
          </div>
        </div>

        {/* 3. MPU6050 Stability & Tilt Card */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-sm dark:shadow-lg transition-colors duration-200">
          <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
            <span className="flex items-center gap-1.5 font-semibold">
              <Compass className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Vessel Tilt (MPU6050)
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
              Math.abs(telemetry.roll) > config.criticalRollAngle
                ? 'bg-rose-50 text-rose-700 border-rose-400 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-500'
                : Math.abs(telemetry.roll) > config.warningRollAngle
                ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-500'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
            }`}>
              {Math.abs(telemetry.roll) > config.criticalRollAngle ? 'DANGEROUS LIST' : 'STABLE'}
            </span>
          </div>

          <div className="my-2 grid grid-cols-2 gap-2 text-center font-mono">
            <div className="bg-[#F8FAFC] dark:bg-[#1F2937] p-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155]">
              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block uppercase">Roll (Port/Stbd)</span>
              <span className={`text-2xl font-black ${
                Math.abs(telemetry.roll) > config.criticalRollAngle ? 'text-rose-600 dark:text-rose-400' :
                Math.abs(telemetry.roll) > config.warningRollAngle ? 'text-amber-600 dark:text-amber-400' : 'text-[#0F172A] dark:text-[#F8FAFC]'
              }`}>
                {telemetry.roll > 0 ? `+${telemetry.roll.toFixed(1)}°` : `${telemetry.roll.toFixed(1)}°`}
              </span>
            </div>
            <div className="bg-[#F8FAFC] dark:bg-[#1F2937] p-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155]">
              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block uppercase">Pitch (Bow/Stern)</span>
              <span className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                {telemetry.pitch > 0 ? `+${telemetry.pitch.toFixed(1)}°` : `${telemetry.pitch.toFixed(1)}°`}
              </span>
            </div>
          </div>

          <div className="flex justify-between text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8] border-t border-[#E2E8F0] dark:border-[#334155] pt-2">
            <span>Warning Roll: <strong className="text-[#0F172A] dark:text-slate-200">±{config.warningRollAngle}°</strong></span>
            <span>Critical: <strong className="text-[#0F172A] dark:text-slate-200">±{config.criticalRollAngle}°</strong></span>
          </div>
        </div>

        {/* 4. GPS & Speed Card */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-sm dark:shadow-lg transition-colors duration-200">
          <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
            <span className="flex items-center gap-1.5 font-semibold">
              <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              u-blox NEO-6M GPS
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
              telemetry.gps.fixValid
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-500/40'
                : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-500/40'
            }`}>
              {telemetry.gps.fixValid ? '3D FIX LOCKED' : 'SEARCHING'}
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#0F172A] dark:text-white font-mono">
                {telemetry.gps.speedKmh ? telemetry.gps.speedKmh.toFixed(1) : '0.0'}
              </span>
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-mono">km/h Speed</span>
            </div>

            <div className="text-[11px] font-mono text-[#0F172A] dark:text-slate-300 mt-2 space-y-1 bg-[#F8FAFC] dark:bg-[#1F2937] p-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155]">
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Heading Course:</span>
                <span className="text-cyan-700 dark:text-cyan-400 font-bold">{telemetry.gps.course ? `${telemetry.gps.course}°` : '145°'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Satellites:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">{telemetry.gps.satellites ?? 0} locked</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8] border-t border-[#E2E8F0] dark:border-[#334155] pt-2 flex justify-between">
            <span>UART Baud: <strong className="text-[#0F172A] dark:text-slate-200">9600</strong></span>
            <button
              onClick={() => onNavigateToTab('vessel-tracking')}
              className="text-cyan-700 hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300 font-bold cursor-pointer"
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
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 shadow-sm dark:shadow-lg transition-colors duration-200">
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full shrink-0 ${
                  telemetry.buzzerState !== 'OFF' ? 'bg-rose-500 animate-ping' : 'bg-slate-300 dark:bg-slate-600'
                }`}></div>
                <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider font-mono">
                  Active Buzzer Alert System (GPIO 27 NPN)
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border shrink-0 ${
                telemetry.buzzerState === 'CONTINUOUS_ALARM'
                  ? 'bg-rose-50 text-rose-700 border-rose-400 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-500 animate-pulse'
                  : telemetry.buzzerState === 'RAPID_HIGH_RISK'
                  ? 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-500'
                  : telemetry.buzzerState === 'INTERMITTENT_WARNING'
                  ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-500'
                  : 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0] dark:bg-[#1F2937] dark:text-slate-400 dark:border-[#334155]'
              }`}>
                {telemetry.buzzerState}
              </span>
            </div>

            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mb-3 leading-relaxed">
              Synthesizes audible alert signals according to real-time risk level. Warning sounds intermittent beeps, High Risk sounds rapid bursts, and Critical sounds continuous urgent sirens.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => buzzerAudio.testBuzzer()}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                Play Audio Test Pulse
              </button>
            </div>
          </div>
        </div>

        {/* Column 3: Live GPS River Map Preview & Incident Logs */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 shadow-sm dark:shadow-lg transition-colors duration-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Live GPS Position &amp; River Course
              </h3>
              <button
                onClick={() => onNavigateToTab('vessel-tracking')}
                className="text-xs text-cyan-700 hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300 font-mono font-bold cursor-pointer"
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
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 shadow-sm dark:shadow-lg transition-colors duration-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Active Safety Warnings ({alerts.length})
              </h3>
              <button
                onClick={() => onNavigateToTab('alerts')}
                className="text-xs text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-slate-200 font-mono cursor-pointer"
              >
                View All &rarr;
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {alerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-2.5 rounded-lg border text-xs font-mono flex items-start gap-2 ${
                    alert.level === 'CRITICAL'
                      ? 'bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/40 dark:border-rose-500/50 dark:text-rose-200'
                      : alert.level === 'HIGH RISK'
                      ? 'bg-orange-50 border-orange-300 text-orange-900 dark:bg-orange-950/40 dark:border-orange-500/50 dark:text-orange-200'
                      : alert.level === 'WARNING'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-500/50 dark:text-amber-200'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] dark:bg-[#1F2937]/60 dark:border-[#334155] dark:text-slate-300'
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
