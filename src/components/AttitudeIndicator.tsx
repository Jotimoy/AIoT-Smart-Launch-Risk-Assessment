import React from 'react';

interface AttitudeIndicatorProps {
  roll: number;  // degrees (positive = starboard list, negative = port list)
  pitch: number; // degrees (positive = bow up, negative = bow down)
  warningRollThreshold?: number;
  criticalRollThreshold?: number;
}

export const AttitudeIndicator: React.FC<AttitudeIndicatorProps> = ({
  roll,
  pitch,
  warningRollThreshold = 7.0,
  criticalRollThreshold = 14.0
}) => {
  const absRoll = Math.abs(roll);
  const isCritical = absRoll >= criticalRollThreshold;
  const isWarning = absRoll >= warningRollThreshold && !isCritical;

  // Visual pitch translation offset (-40 to +40 px)
  const pitchOffset = Math.max(-35, Math.min(35, pitch * 2.5));

  return (
    <div className="flex flex-col items-center justify-center p-2 bg-slate-900/60 rounded-xl border border-slate-800">
      <div className="flex items-center justify-between w-full px-2 mb-2 text-xs">
        <span className="text-slate-400 font-mono">MPU-6050 IMU</span>
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
          isCritical ? 'bg-rose-950 text-rose-400 border border-rose-500/50 animate-pulse' :
          isWarning ? 'bg-amber-950 text-amber-400 border border-amber-500/50' :
          'bg-emerald-950 text-emerald-400'
        }`}>
          {isCritical ? 'CRITICAL LIST' : isWarning ? 'EXCESSIVE ROLL' : 'STABLE HORIZON'}
        </span>
      </div>

      <div className="relative w-44 h-44 rounded-full overflow-hidden border-2 border-slate-700 shadow-inner bg-slate-950 flex items-center justify-center">
        {/* Pitch and Roll Horizon Disc */}
        <div
          className="absolute inset-[-40px] transition-transform duration-300 ease-out"
          style={{
            transform: `rotate(${-roll}deg) translateY(${pitchOffset}px)`
          }}
        >
          {/* Sky (Upper Half) */}
          <div className="w-full h-1/2 bg-gradient-to-b from-sky-900 via-sky-800 to-sky-700 border-b-2 border-emerald-400 flex items-end justify-center pb-1">
            <span className="text-[9px] text-sky-200 tracking-wider uppercase font-semibold opacity-70">
              Sky
            </span>
          </div>

          {/* Sea / Ground (Lower Half) */}
          <div className="w-full h-1/2 bg-gradient-to-b from-teal-900 via-slate-900 to-slate-950 flex items-start justify-center pt-1">
            <span className="text-[9px] text-teal-300 tracking-wider uppercase font-semibold opacity-70">
              Waterline
            </span>
          </div>

          {/* Pitch Ladder lines */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {/* +10 deg pitch */}
            <div className="w-16 border-t border-sky-300/60 my-2 relative">
              <span className="absolute -left-4 -top-2 text-[8px] text-sky-200">+10°</span>
              <span className="absolute -right-4 -top-2 text-[8px] text-sky-200">+10°</span>
            </div>
            {/* Horizon Center */}
            <div className="w-24 border-t-2 border-emerald-400 my-1"></div>
            {/* -10 deg pitch */}
            <div className="w-16 border-t border-teal-300/60 my-2 relative">
              <span className="absolute -left-4 -top-2 text-[8px] text-teal-200">-10°</span>
              <span className="absolute -right-4 -top-2 text-[8px] text-teal-200">-10°</span>
            </div>
          </div>
        </div>

        {/* Fixed Aircraft/Launch Reference Reticle */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Wings */}
          <div className="w-28 flex items-center justify-between">
            <div className="w-9 h-1 bg-amber-400 rounded-sm shadow-md border border-slate-900"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-900 shadow-md"></div>
            <div className="w-9 h-1 bg-amber-400 rounded-sm shadow-md border border-slate-900"></div>
          </div>
        </div>

        {/* Bank angle roll scale around top arc */}
        <div className="absolute inset-0 pointer-events-none">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Warning / Critical Roll Zone indicators */}
            <line x1="50" y1="3" x2="50" y2="9" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="32" y1="7" x2="35" y2="12" stroke="#eab308" strokeWidth="1.5" />
            <line x1="68" y1="7" x2="65" y2="12" stroke="#eab308" strokeWidth="1.5" />
            <line x1="18" y1="18" x2="22" y2="22" stroke="#ef4444" strokeWidth="2" />
            <line x1="82" y1="18" x2="78" y2="22" stroke="#ef4444" strokeWidth="2" />
          </svg>
        </div>

        {/* Center roll indicator arrow */}
        <div
          className="absolute top-1 pointer-events-none transition-transform duration-200"
          style={{ transform: `rotate(${-roll}deg)`, transformOrigin: 'center 88px' }}
        >
          <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[8px] border-t-amber-400"></div>
        </div>
      </div>

      {/* Numerical Readout */}
      <div className="grid grid-cols-2 gap-2 w-full mt-2 font-mono text-center">
        <div className="bg-slate-950/70 py-1 px-1.5 rounded border border-slate-800">
          <span className="block text-[10px] text-slate-400 uppercase">Roll (List)</span>
          <span className={`text-sm font-bold ${
            isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-slate-100'
          }`}>
            {roll > 0 ? `+${roll.toFixed(1)}° Stbd` : roll < 0 ? `${roll.toFixed(1)}° Port` : '0.0°'}
          </span>
        </div>
        <div className="bg-slate-950/70 py-1 px-1.5 rounded border border-slate-800">
          <span className="block text-[10px] text-slate-400 uppercase">Pitch (Trim)</span>
          <span className="text-sm font-bold text-slate-100">
            {pitch > 0 ? `+${pitch.toFixed(1)}° Bow` : pitch < 0 ? `${pitch.toFixed(1)}° Stern` : '0.0°'}
          </span>
        </div>
      </div>
    </div>
  );
};
