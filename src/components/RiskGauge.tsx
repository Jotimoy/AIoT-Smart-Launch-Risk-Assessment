import React from 'react';
import { RiskLevel } from '../types/iot';

interface RiskGaugeProps {
  score: number;
  level: RiskLevel;
  primaryHazard: string | null;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, level, primaryHazard }) => {
  // SVG semi-circle arc from 180 to 0 degrees
  // Radius = 85, center = (100, 95)
  const radius = 75;
  const cx = 100;
  const cy = 90;
  
  // Calculate needle angle (-90deg at score 0, +90deg at score 100)
  const clampedScore = Math.min(100, Math.max(0, score));
  const angleDeg = -180 + (clampedScore / 100) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;

  const needleLength = 62;
  const nx = cx + needleLength * Math.cos(angleRad);
  const ny = cy + needleLength * Math.sin(angleRad);

  const getLevelColor = () => {
    switch (level) {
      case 'SAFE': return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40';
      case 'WARNING': return 'text-amber-400 bg-amber-950/40 border-amber-500/40';
      case 'HIGH RISK': return 'text-orange-400 bg-orange-950/40 border-orange-500/40';
      case 'CRITICAL': return 'text-rose-400 bg-rose-950/40 border-rose-500/40 animate-pulse';
    }
  };

  const getNeedleColor = () => {
    switch (level) {
      case 'SAFE': return '#10b981';
      case 'WARNING': return '#f59e0b';
      case 'HIGH RISK': return '#f97316';
      case 'CRITICAL': return '#f43f5e';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-3">
      <div className="relative w-52 h-32 flex items-center justify-center">
        <svg viewBox="0 0 200 115" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="gaugeArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="25%" stopColor="#10b981" />
              <stop offset="35%" stopColor="#eab308" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#f97316" />
              <stop offset="85%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <filter id="gaugeGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Arc */}
          <path
            d="M 25,90 A 75,75 0 0,1 175,90"
            fill="none"
            stroke="#1e293b"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Value colored gradient Arc */}
          <path
            d="M 25,90 A 75,75 0 0,1 175,90"
            fill="none"
            stroke="url(#gaugeArcGrad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray="235.6"
            strokeDashoffset={235.6 - (clampedScore / 100) * 235.6}
            className="transition-all duration-700 ease-out"
          />

          {/* Tick marks */}
          <line x1="25" y1="90" x2="18" y2="90" stroke="#64748b" strokeWidth="2" />
          <line x1="47" y1="38" x2="42" y2="32" stroke="#64748b" strokeWidth="2" />
          <line x1="100" y1="15" x2="100" y2="8" stroke="#64748b" strokeWidth="2" />
          <line x1="153" y1="38" x2="158" y2="32" stroke="#64748b" strokeWidth="2" />
          <line x1="175" y1="90" x2="182" y2="90" stroke="#64748b" strokeWidth="2" />

          {/* Zone labels */}
          <text x="26" y="105" fill="#10b981" fontSize="9" fontWeight="600">0</text>
          <text x="96" y="26" fill="#f59e0b" fontSize="9" fontWeight="600">50</text>
          <text x="168" y="105" fill="#ef4444" fontSize="9" fontWeight="600">100</text>

          {/* Gauge Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={nx}
            y2={ny}
            stroke={getNeedleColor()}
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#gaugeGlow)"
            className="transition-all duration-700 ease-out"
          />

          {/* Center Pivot Point */}
          <circle cx={cx} cy={cy} r="6" fill="#0f172a" stroke={getNeedleColor()} strokeWidth="2.5" />
          <circle cx={cx} cy={cy} r="2" fill="#ffffff" />
        </svg>

        {/* Big Score Display */}
        <div className="absolute bottom-1 left-0 right-0 flex flex-col items-center">
          <span className="text-3xl font-black tracking-tight text-white font-mono drop-shadow-md">
            {score}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Safety Score / 100
          </span>
        </div>
      </div>

      {/* Status Badge */}
      <div className={`mt-2 px-3 py-1 rounded-full text-xs font-bold border tracking-wide uppercase ${getLevelColor()}`}>
        {level}
      </div>

      {level !== 'SAFE' && primaryHazard ? (
        <p className="mt-1.5 text-xs text-rose-300 font-medium text-center line-clamp-1 max-w-[200px]">
          ⚠️ {primaryHazard}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-emerald-400 font-medium text-center line-clamp-1 max-w-[200px]">
          ✓ All parameters nominal
        </p>
      )}
    </div>
  );
};
