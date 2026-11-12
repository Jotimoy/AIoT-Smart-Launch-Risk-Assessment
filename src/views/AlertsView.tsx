import React, { useState } from 'react';
import { SafetyAlert, RiskLevel } from '../types/iot';
import { AlertOctagon, AlertTriangle, ShieldCheck, Check, Filter, BellRing, Radio, PhoneCall } from 'lucide-react';

interface AlertsViewProps {
  alerts: SafetyAlert[];
  onAcknowledgeAlert: (alertId: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts, onAcknowledgeAlert }) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');

  const filteredAlerts = alerts.filter(a => {
    if (filterLevel === 'ALL') return true;
    return a.level === filterLevel;
  });

  const getSeverityStyle = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-rose-950/40 border-rose-500/60 text-rose-300';
      case 'HIGH RISK':
        return 'bg-orange-950/40 border-orange-500/60 text-orange-300';
      case 'WARNING':
        return 'bg-amber-950/40 border-amber-500/60 text-amber-300';
      case 'SAFE':
        return 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Protocol Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <BellRing className="w-5 h-5 text-amber-400" />
              Multi-Level Emergency Alert & Incident Escalation Log
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              SRS Feature 6 & FR12 Compliance: Local Buzzer + Terminal Authority + BIWTA Escalation
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            {(['ALL', 'CRITICAL', 'HIGH RISK', 'WARNING'] as const).map(lvl => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                  filterLevel === lvl
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Escalation Hierarchy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800 shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-200 uppercase font-mono">Level 1: On-Board Warning</h4>
            <p className="text-slate-400 mt-1 leading-relaxed text-[11px]">
              Active Buzzer sounds intermittent pulses. Captain dashboard alerts wheelhouse to cease passenger boarding and inspect vessel trim.
            </p>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-orange-950/60 text-orange-400 border border-orange-800 shrink-0">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-200 uppercase font-mono">Level 2: Terminal Authority</h4>
            <p className="text-slate-400 mt-1 leading-relaxed text-[11px]">
              Sadarghat / Chandpur terminal launch inspectors receive immediate telemetry push. Port authority dispatches boarding gate enforcement.
            </p>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-800 shrink-0">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-200 uppercase font-mono">Level 3: BIWTA & River Police</h4>
            <p className="text-slate-400 mt-1 leading-relaxed text-[11px]">
              Critical list or hull ingress triggers emergency escalation to River Police rescue craft and BIWTA inland navigation emergency operations.
            </p>
          </div>
        </div>
      </div>

      {/* Alert Feed List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center text-slate-400 font-mono text-xs">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            No active safety alerts for the selected filter.
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className={`border rounded-xl p-4 shadow-md transition-all ${getSeverityStyle(alert.level)}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertOctagon className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-current">
                        {alert.level}
                      </span>
                      <h3 className="font-bold text-sm text-white tracking-wide">{alert.title}</h3>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed font-mono">
                      {alert.message}
                    </p>
                    <div className="mt-2.5 p-2 rounded bg-slate-950/70 border border-slate-800 text-[11px] font-mono text-cyan-300">
                      <strong>Mandated Safety Action:</strong> {alert.recommendedAction}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-[11px] font-mono opacity-80">
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                  {alert.acknowledged ? (
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      <Check className="w-3 h-3" /> Acknowledged
                    </span>
                  ) : (
                    <button
                      onClick={() => onAcknowledgeAlert(alert.id)}
                      className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold transition flex items-center gap-1 shadow"
                    >
                      <Check className="w-3.5 h-3.5 text-cyan-400" />
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
