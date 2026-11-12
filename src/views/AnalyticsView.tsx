import React, { useState } from 'react';
import { SensorTelemetry, VesselConfig } from '../types/iot';
import { BarChart3, Download, TrendingUp, Users, Compass, Waves, ShieldAlert } from 'lucide-react';

interface AnalyticsViewProps {
  history: SensorTelemetry[];
  config: VesselConfig;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ history, config }) => {
  const [selectedMetric, setSelectedMetric] = useState<'risk' | 'passengers' | 'roll' | 'water'>('risk');

  const records = history.length > 0 ? history : [];

  // Compute key statistics
  const peakPassengers = records.reduce((max, r) => Math.max(max, r.passengerCount), 0);
  const maxRoll = records.reduce((max, r) => Math.max(max, Math.abs(r.roll)), 0);
  const maxWater = records.reduce((max, r) => Math.max(max, r.waterLevelPercent ?? 0), 0);
  const maxRisk = records.reduce((max, r) => Math.max(max, r.riskScore), 0);
  const avgPassengers = records.length > 0
    ? Math.round(records.reduce((sum, r) => sum + r.passengerCount, 0) / records.length)
    : 0;

  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = [
      'Timestamp',
      'VesselID',
      'PassengerCount',
      'EntryCount',
      'ExitCount',
      'TotalLoadKg',
      'RollDegrees',
      'PitchDegrees',
      'WaterLevelPercent',
      'WaterRawADC',
      'GPS_Latitude',
      'GPS_Longitude',
      'SpeedKmh',
      'Course',
      'RiskScore',
      'RiskStatus'
    ];

    const rows = records.map(r => [
      r.timestamp,
      r.deviceId,
      r.passengerCount,
      r.entryCount,
      r.exitCount,
      r.totalLoad ?? '',
      r.roll,
      r.pitch,
      r.waterLevelPercent ?? '',
      r.waterLevelRaw,
      r.gps.latitude ?? '',
      r.gps.longitude ?? '',
      r.gps.speedKmh ?? '',
      r.gps.course ?? '',
      r.riskScore,
      r.riskStatus
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart_launch_telemetry_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // SVG Chart path generator
  const getMetricData = () => {
    switch (selectedMetric) {
      case 'risk':
        return records.map(r => r.riskScore);
      case 'passengers':
        return records.map(r => r.passengerCount);
      case 'roll':
        return records.map(r => Math.abs(r.roll));
      case 'water':
        return records.map(r => r.waterLevelPercent ?? 0);
    }
  };

  const metricData = getMetricData();
  const maxVal = Math.max(
    selectedMetric === 'risk' ? 100 :
    selectedMetric === 'passengers' ? config.maxPassengerCapacity :
    selectedMetric === 'roll' ? 20 : 100,
    ...metricData, 10
  );

  const chartWidth = 700;
  const chartHeight = 180;
  const pathD = metricData.length > 1
    ? metricData.map((val, idx) => {
        const x = (idx / (metricData.length - 1)) * chartWidth;
        const y = chartHeight - (val / maxVal) * chartHeight;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${Math.max(4, Math.min(chartHeight - 4, y)).toFixed(1)}`;
      }).join(' ')
    : `M 0,${chartHeight / 2} L ${chartWidth},${chartHeight / 2}`;

  return (
    <div className="space-y-6">
      {/* Top Bar with Export */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Voyage Historical Analytics & Safety Trends
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Temporal logs for post-voyage audit, BIWTA safety compliance, and ML model training.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export Telemetry CSV
          </button>
        </div>
      </div>

      {/* Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Peak Passengers</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono mt-2">
            {peakPassengers}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Avg: {avgPassengers} | Limit: {config.maxPassengerCapacity}
          </span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Max Roll Angle</span>
            <Compass className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 font-mono mt-2">
            {maxRoll.toFixed(1)}°
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Critical Threshold: {config.criticalRollAngle}°
          </span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Peak Bilge Water</span>
            <Waves className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-300 font-mono mt-2">
            {maxWater.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Dry Baseline: &lt;10%
          </span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Highest Risk Score</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono mt-2">
            {maxRisk}/100
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Peak Severity Recorded
          </span>
        </div>
      </div>

      {/* Main Trend Chart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
            Temporal Trend Analysis ({records.length} data samples)
          </h3>

          {/* Metric Selector Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            {[
              { id: 'risk', label: 'Risk Score' },
              { id: 'passengers', label: 'Passengers' },
              { id: 'roll', label: 'Roll Angle' },
              { id: 'water', label: 'Bilge Water' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMetric(m.id as any)}
                className={`px-3 py-1 rounded text-[11px] font-bold transition ${
                  selectedMetric === m.id
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Detailed Graph */}
        <div className="h-52 w-full bg-slate-950 rounded-xl p-3 border border-slate-800 relative flex flex-col justify-between">
          <div className="absolute top-2 right-3 text-[10px] font-mono text-slate-500">
            Peak: {maxVal.toFixed(0)} | Baseline: 0
          </div>

          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
            {/* Horizontal Grid lines */}
            <line x1="0" y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} stroke="#1e293b" strokeDasharray="3, 3" />
            <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="#1e293b" strokeDasharray="3, 3" />
            <line x1="0" y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} stroke="#1e293b" strokeDasharray="3, 3" />

            {/* Main Path */}
            <path
              d={pathD}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="3"
              strokeLinecap="round"
              className="drop-shadow-md"
            />
          </svg>

          <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800">
            <span>Voyage Start</span>
            <span>Historical Telemetry Window</span>
            <span>Current State</span>
          </div>
        </div>
      </div>
    </div>
  );
};
