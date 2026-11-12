import React from 'react';

interface WaterLevelGaugeProps {
  waterLevelPercent: number | null;
  rawAdc: number;
  warningThreshold?: number;
  criticalThreshold?: number;
}

export const WaterLevelGauge: React.FC<WaterLevelGaugeProps> = ({
  waterLevelPercent,
  rawAdc,
  warningThreshold = 30,
  criticalThreshold = 65
}) => {
  const pct = waterLevelPercent ?? 0;
  const isCritical = pct >= criticalThreshold;
  const isWarning = pct >= warningThreshold && !isCritical;

  return (
    <div className="flex flex-col p-3 bg-slate-900/60 rounded-xl border border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          Bilge Water Sensor
        </span>
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
          isCritical ? 'bg-rose-950 text-rose-400 border border-rose-500 animate-bounce' :
          isWarning ? 'bg-amber-950 text-amber-400 border border-amber-500' :
          'bg-emerald-950 text-emerald-400'
        }`}>
          {isCritical ? 'CRITICAL INGRESS' : isWarning ? 'ELEVATED BILGE' : 'DRY / NORMAL'}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Bilge Well SVG Cross-section */}
        <div className="relative w-16 h-36 bg-slate-950 rounded-lg border-2 border-slate-700 overflow-hidden flex flex-col justify-end p-0.5 shadow-inner">
          {/* Depth scale tick marks */}
          <div className="absolute inset-y-0 right-1 flex flex-col justify-between py-1 pointer-events-none z-10 text-[8px] font-mono text-slate-500">
            <span>100%</span>
            <span className="text-rose-400 font-bold">65%</span>
            <span className="text-amber-400 font-bold">30%</span>
            <span>0%</span>
          </div>

          {/* Warning and Critical Threshold lines */}
          <div
            className="absolute left-0 right-0 border-b border-dashed border-rose-500/80 pointer-events-none z-10"
            style={{ bottom: `${criticalThreshold}%` }}
          ></div>
          <div
            className="absolute left-0 right-0 border-b border-dashed border-amber-500/80 pointer-events-none z-10"
            style={{ bottom: `${warningThreshold}%` }}
          ></div>

          {/* Water Fill Column */}
          <div
            className={`w-full transition-all duration-700 ease-out relative ${
              isCritical ? 'bg-gradient-to-t from-rose-600 via-rose-500 to-rose-400' :
              isWarning ? 'bg-gradient-to-t from-amber-600 via-amber-500 to-cyan-500' :
              'bg-gradient-to-t from-cyan-600 via-sky-500 to-teal-400'
            }`}
            style={{ height: `${Math.min(100, Math.max(2, pct))}%` }}
          >
            {/* Animated Water Surface Ripple */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/40 animate-pulse"></div>
          </div>
        </div>

        {/* Detailed Sensor Metrics */}
        <div className="flex-1 flex flex-col justify-between h-36 py-1">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Calibrated Level</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-3xl font-black font-mono ${
                isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-cyan-300'
              }`}>
                {pct.toFixed(1)}
              </span>
              <span className="text-sm font-bold text-slate-400">%</span>
            </div>
          </div>

          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-slate-400">Raw ADC Value:</span>
              <span className="text-slate-200">{rawAdc} / 4095</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-slate-400">Warning Limit:</span>
              <span className="text-amber-400 font-bold">{warningThreshold}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Critical Limit:</span>
              <span className="text-rose-400 font-bold">{criticalThreshold}%</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 leading-tight">
            {isCritical ? '🚨 Pump failure or hull leak detected. Initiate pump cycle immediately.' :
             isWarning ? '⚠️ Bilge accumulation rising. Monitor bilge sump.' :
             '✓ Hull dry well dry. No abnormal water ingress.'}
          </p>
        </div>
      </div>
    </div>
  );
};
