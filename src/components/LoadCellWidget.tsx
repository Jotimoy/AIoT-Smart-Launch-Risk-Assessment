import React from 'react';

interface LoadCellWidgetProps {
  leftLoad: number | null;
  rightLoad: number | null;
  totalLoad: number | null;
  loadImbalancePercent: number | null;
  dualHX711Connected: boolean;
  maxLoadKg?: number;
  onTare?: () => void;
}

export const LoadCellWidget: React.FC<LoadCellWidgetProps> = ({
  leftLoad,
  rightLoad,
  totalLoad,
  loadImbalancePercent,
  maxLoadKg = 2000,
  onTare
}) => {
  const effectiveTotal = totalLoad ?? (leftLoad !== null && rightLoad !== null ? leftLoad + rightLoad : null);

  const isGrams = effectiveTotal !== null ? effectiveTotal <= 4000 : true;
  const unit = isGrams ? 'g' : 'kg';
  const effectiveMax = isGrams ? (maxLoadKg > 5000 ? 2000 : maxLoadKg) : maxLoadKg;

  const loadPercentage = effectiveTotal ? Math.min(150, Math.round((effectiveTotal / effectiveMax) * 100)) : 0;
  const isOverload = effectiveTotal ? effectiveTotal > effectiveMax : false;

  const leftWeight = leftLoad ?? 0;
  const rightWeight = rightLoad ?? 0;
  const totalLR = leftWeight + rightWeight;
  const leftRatio = totalLR > 0 ? (leftWeight / totalLR) * 100 : 50;
  const rightRatio = totalLR > 0 ? (rightWeight / totalLR) * 100 : 50;
  const imbalance = loadImbalancePercent ?? Math.abs(leftRatio - rightRatio);

  const isCriticalImbalance = imbalance >= 20.0;
  const isWarningImbalance = imbalance >= 10.0 && !isCriticalImbalance;

  return (
    <div className="flex flex-col p-3.5 bg-white dark:bg-[#111827] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-sm dark:shadow-lg transition-colors duration-200">
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-mono flex items-center gap-1.5 font-semibold">
          <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse shrink-0"></span>
          Dual HX711 Load Monitoring (Left: 19/18, Right: 25/26)
        </span>
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border shrink-0 ${
          isOverload
            ? 'bg-rose-50 text-rose-700 border-rose-400 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-500 animate-pulse'
            : isCriticalImbalance
            ? 'bg-rose-50 text-rose-700 border-rose-400 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-500 animate-pulse'
            : isWarningImbalance
            ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-500'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
        }`}>
          {isOverload ? 'OVERLOAD' : isCriticalImbalance ? 'HIGH IMBALANCE (≥20%)' : isWarningImbalance ? 'IMBALANCE WARN (≥10%)' : 'BALANCED'}
        </span>
      </div>

      {/* Total Load Progress */}
      <div className="mb-3">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] uppercase font-semibold">Total Measured Weight</span>
          <span className="text-xs font-mono">
            <span className={`font-bold ${isOverload ? 'text-rose-600 dark:text-rose-400' : 'text-[#0F172A] dark:text-[#F8FAFC]'}`}>
              {effectiveTotal !== null ? `${effectiveTotal.toFixed(1)} ${unit}` : 'Taring Required'}
            </span>
            <span className="text-[#64748B] dark:text-slate-500"> / {effectiveMax.toLocaleString()} {unit} Max</span>
          </span>
        </div>
        <div className="h-2.5 w-full bg-[#F1F5F9] dark:bg-[#0B1120] rounded-full overflow-hidden border border-[#E2E8F0] dark:border-[#334155] p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isOverload ? 'bg-rose-500' :
              loadPercentage > 80 ? 'bg-amber-500' :
              'bg-gradient-to-r from-blue-500 to-indigo-500'
            }`}
            style={{ width: `${Math.min(100, loadPercentage)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-[10px] text-[#64748B] dark:text-slate-500 mt-1 font-mono">
          <span>0 {unit}</span>
          <span>Load Level: {loadPercentage}%</span>
          <span>{effectiveMax} {unit} Limit</span>
        </div>
      </div>

      {/* Port vs Starboard Balance Bar */}
      <div className="bg-[#F8FAFC] dark:bg-[#1F2937] p-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] mb-2">
        <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
          <span className="text-blue-700 dark:text-blue-400 font-semibold">
            Port (Left 19/18): <strong>{leftWeight.toFixed(1)} {unit}</strong>
          </span>
          <span className="text-amber-700 dark:text-amber-400 font-semibold">
            Starboard (Right 25/26): <strong>{rightWeight.toFixed(1)} {unit}</strong>
          </span>
        </div>

        {/* Differential Bar */}
        <div className="relative h-4 bg-slate-200 dark:bg-slate-900 rounded-md overflow-hidden flex border border-[#CBD5E1] dark:border-[#334155]">
          <div
            className="bg-blue-600/90 transition-all duration-500 flex items-center justify-start pl-2 text-[9px] font-bold text-white"
            style={{ width: `${leftRatio}%` }}
          >
            {leftRatio.toFixed(0)}%
          </div>
          <div
            className="bg-amber-600/90 transition-all duration-500 flex items-center justify-end pr-2 text-[9px] font-bold text-white"
            style={{ width: `${rightRatio}%` }}
          >
            {rightRatio.toFixed(0)}%
          </div>
          <div className="absolute top-0 bottom-0 left-1/2 -ml-[1px] w-[2px] bg-white/80 pointer-events-none"></div>
        </div>

        <div className="flex justify-between text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1.5 font-mono">
          <span>
            Imbalance: <strong className={
              isCriticalImbalance ? 'text-rose-600 dark:text-rose-400 font-bold' :
              isWarningImbalance ? 'text-amber-600 dark:text-amber-400 font-bold' :
              'text-[#0F172A] dark:text-slate-200'
            }>
              {imbalance.toFixed(1)}%
            </strong>
          </span>
          <span>Thresholds: 10% Warn | 20% Critical</span>
        </div>
      </div>

      {/* Hardware Calibration factors notice */}
      <div className="flex justify-between items-center text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8] pt-1">
        <span>Left Factor: <strong className="text-[#0F172A] dark:text-slate-200">695.416</strong> | Right: <strong className="text-[#0F172A] dark:text-slate-200">706.785</strong></span>
        {onTare && (
          <button
            onClick={onTare}
            className="px-2 py-0.5 rounded bg-[#F1F5F9] hover:bg-slate-200 text-cyan-700 border border-[#CBD5E1] dark:bg-[#1F2937] dark:hover:bg-slate-700 dark:text-cyan-300 dark:border-[#334155] font-bold transition cursor-pointer"
          >
            Tare (&apos;t&apos;)
          </button>
        )}
      </div>
    </div>
  );
};
