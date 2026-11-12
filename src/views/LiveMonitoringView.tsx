import React from 'react';
import { SensorTelemetry, VesselConfig } from '../types/iot';
import { AttitudeIndicator } from '../components/AttitudeIndicator';
import { WaterLevelGauge } from '../components/WaterLevelGauge';
import { LoadCellWidget } from '../components/LoadCellWidget';
import { Activity, Cpu, Waves, Users, Compass, Gauge, Radio, ShieldAlert } from 'lucide-react';

interface LiveMonitoringViewProps {
  telemetry: SensorTelemetry;
  config: VesselConfig;
  history: SensorTelemetry[];
}

export const LiveMonitoringView: React.FC<LiveMonitoringViewProps> = ({
  telemetry,
  config,
  history
}) => {
  // Extract history series
  const points = history.length > 0 ? history : [telemetry];
  const maxPts = Math.min(30, points.length);
  const recent = points.slice(-maxPts);

  // Helper for generating SVG sparkline paths
  const generatePath = (
    data: number[],
    minVal: number,
    maxVal: number,
    width = 300,
    height = 60
  ) => {
    if (data.length <= 1) return `M 0,${height / 2} L ${width},${height / 2}`;
    const range = Math.max(1, maxVal - minVal);
    const stepX = width / (data.length - 1);

    return data
      .map((val, idx) => {
        const x = idx * stepX;
        const normalizedY = 1 - (val - minVal) / range;
        const y = Math.max(2, Math.min(height - 2, normalizedY * height));
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const passengerSeries = recent.map(r => r.passengerCount);
  const rollSeries = recent.map(r => r.roll);
  const pitchSeries = recent.map(r => r.pitch);
  const waterSeries = recent.map(r => r.waterLevelPercent ?? 0);
  const riskSeries = recent.map(r => r.riskScore);

  return (
    <div className="space-y-6">
      {/* Top Banner: Sensor Telemetry Bus Health */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              ESP32 Sensor Bus & Real-Time Signal Diagnostics
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Sampling Rate: 1.5 Hz | Filter: 96/4 Complementary Angle Filter | Baud: 115,200
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              HC-SR04 Gates: OK
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              MPU6050 (0x68): OK
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Water ADC: OK
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              NEO-6M UART: OK
            </span>
          </div>
        </div>
      </div>

      {/* Real-Time Waveform / Time-Series Graphs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Graph 1: Passenger Count Stream */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono">
              <Users className="w-4 h-4 text-cyan-400" />
              Passenger Flow Trend
            </span>
            <span className="text-xs font-mono text-cyan-300 font-bold">
              {telemetry.passengerCount} Onboard
            </span>
          </div>
          <div className="h-28 w-full bg-slate-950 rounded-lg p-2 border border-slate-800 relative flex flex-col justify-between">
            <div className="absolute top-1 right-2 text-[9px] font-mono text-slate-500">
              Capacity: {config.maxPassengerCapacity}
            </div>
            <svg viewBox="0 0 300 60" className="w-full h-full overflow-visible">
              <path
                d={generatePath(passengerSeries, 0, Math.max(config.maxPassengerCapacity, Math.max(...passengerSeries, 100)))}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>-30s</span>
              <span>Live Sensor Ticker</span>
              <span>Now</span>
            </div>
          </div>
        </div>

        {/* Graph 2: Roll & Pitch Wave Dynamics */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono">
              <Compass className="w-4 h-4 text-amber-400" />
              MPU6050 Roll (Cyan) & Pitch (Amber) Degrees
            </span>
            <span className="text-xs font-mono text-amber-300 font-bold">
              Roll: {telemetry.roll.toFixed(1)}° | Pitch: {telemetry.pitch.toFixed(1)}°
            </span>
          </div>
          <div className="h-28 w-full bg-slate-950 rounded-lg p-2 border border-slate-800 relative flex flex-col justify-between">
            {/* Center zero degree line */}
            <div className="absolute top-1/2 left-0 right-0 border-t border-slate-800/80 pointer-events-none"></div>
            <svg viewBox="0 0 300 60" className="w-full h-full overflow-visible">
              <path
                d={generatePath(rollSeries, -20, 20)}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d={generatePath(pitchSeries, -20, 20)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="4, 3"
              />
            </svg>
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>-20° Limit</span>
              <span>0° Equilibrium Horizon</span>
              <span>+20° Limit</span>
            </div>
          </div>
        </div>

        {/* Graph 3: Hull Bilge Water Ingress */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono">
              <Waves className="w-4 h-4 text-teal-400" />
              Bilge Ingress Water Percentage
            </span>
            <span className="text-xs font-mono text-teal-300 font-bold">
              {(telemetry.waterLevelPercent ?? 0).toFixed(1)}% (ADC: {telemetry.waterLevelRaw})
            </span>
          </div>
          <div className="h-28 w-full bg-slate-950 rounded-lg p-2 border border-slate-800 relative flex flex-col justify-between">
            <svg viewBox="0 0 300 60" className="w-full h-full overflow-visible">
              <path
                d={generatePath(waterSeries, 0, 100)}
                fill="none"
                stroke="#14b8a6"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>0% Dry</span>
              <span>Warning Threshold: {config.warningWaterLevelPercent}%</span>
              <span>100% Flooded</span>
            </div>
          </div>
        </div>

        {/* Graph 4: Safety Risk Score Evolution */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Safety Risk Score (0-100)
            </span>
            <span className="text-xs font-mono text-rose-300 font-bold">
              Current: {telemetry.riskScore} ({telemetry.riskStatus})
            </span>
          </div>
          <div className="h-28 w-full bg-slate-950 rounded-lg p-2 border border-slate-800 relative flex flex-col justify-between">
            <svg viewBox="0 0 300 60" className="w-full h-full overflow-visible">
              <path
                d={generatePath(riskSeries, 0, 100)}
                fill="none"
                stroke={telemetry.riskScore >= 75 ? '#f43f5e' : telemetry.riskScore >= 50 ? '#f97316' : telemetry.riskScore >= 25 ? '#f59e0b' : '#10b981'}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span className="text-emerald-400">0 Safe</span>
              <span className="text-amber-400">25 Warn</span>
              <span className="text-orange-400">50 High</span>
              <span className="text-rose-400">75 Crit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gauges & Attitude Instruments Detailed Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
        <LoadCellWidget
          leftLoad={telemetry.leftLoad}
          rightLoad={telemetry.rightLoad}
          totalLoad={telemetry.totalLoad}
          loadImbalancePercent={telemetry.loadImbalancePercent}
          dualHX711Connected={telemetry.dualHX711Connected}
          maxLoadKg={config.maxLoadKg}
        />
      </div>
    </div>
  );
};
