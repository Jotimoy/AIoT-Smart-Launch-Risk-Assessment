import React, { useState } from 'react';
import { SafetyAlert, RiskLevel } from '../types/iot';
import { AlertOctagon, ShieldCheck, Check, Filter, BellRing, Radio, PhoneCall } from 'lucide-react';

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
        return 'bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/40 dark:border-rose-500/60 dark:text-rose-300';
      case 'HIGH RISK':
        return 'bg-orange-50 border-orange-300 text-orange-900 dark:bg-orange-950/40 dark:border-orange-500/60 dark:text-orange-300';
      case 'WARNING':
        return 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-500/60 dark:text-amber-300';
      case 'SAFE':
        return 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-500/40 dark:text-emerald-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Protocol Banner */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 shadow-sm dark:shadow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-white tracking-wide flex items-center gap-2">
              <BellRing className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              Multi-Level Emergency Alert &amp; Incident Escalation Log
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 font-mono">
              SRS Feature 6 &amp; FR12 Compliance: Local Buzzer + Terminal Authority + BIWTA Escalation
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#F1F5F9] dark:bg-[#0B1120] p-1 rounded-lg border border-[#E2E8F0] dark:border-[#334155] text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8] ml-1.5" />
            {(['ALL', 'CRITICAL', 'HIGH RISK', 'WARNING'] as const).map(lvl => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                  filterLevel === lvl
                    ? 'bg-white text-[#0F172A] shadow-xs border border-[#E2E8F0] dark:bg-[#1F2937] dark:text-white dark:border-[#334155]'
                    : 'text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-slate-200'
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
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-3.5 flex items-start gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800 shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-[#0F172A] dark:text-slate-200 uppercase font-mono">Level 1: On-Board Warning</h4>
            <p className="text-[#64748B] dark:text-[#94A3B8] mt-1 leading-relaxed text-[11px]">
              Active Buzzer sounds intermittent pulses. Captain dashboard alerts wheelhouse to cease passenger boarding and inspect vessel trim.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-3.5 flex items-start gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-400 dark:border-orange-800 shrink-0">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-[#0F172A] dark:text-slate-200 uppercase font-mono">Level 2: Terminal Authority</h4>
            <p className="text-[#64748B] dark:text-[#94A3B8] mt-1 leading-relaxed text-[11px]">
              Sadarghat / Chandpur terminal launch inspectors receive immediate telemetry push. Port authority dispatches boarding gate enforcement.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-3.5 flex items-start gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800 shrink-0">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-[#0F172A] dark:text-slate-200 uppercase font-mono">Level 3: BIWTA &amp; River Police</h4>
            <p className="text-[#64748B] dark:text-[#94A3B8] mt-1 leading-relaxed text-[11px]">
              Critical list or hull ingress triggers emergency escalation to River Police rescue craft and BIWTA inland navigation emergency operations.
            </p>
          </div>
        </div>
      </div>

      {/* Alert Feed List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-8 text-center text-[#64748B] dark:text-[#94A3B8] font-mono text-xs shadow-xs">
            <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
            No active safety alerts for the selected filter.
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className={`border rounded-xl p-4 shadow-sm dark:shadow-md transition-all ${getSeverityStyle(alert.level)}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertOctagon className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/80 dark:bg-[#0B1120]/60 border border-current">
                        {alert.level}
                      </span>
                      <h3 className="font-bold text-sm text-[#0F172A] dark:text-white tracking-wide">{alert.title}</h3>
                    </div>
                    <p className="text-xs text-[#0F172A]/80 dark:text-slate-300 mt-1 leading-relaxed font-mono">
                      {alert.message}
                    </p>
                    <div className="mt-2.5 p-2 rounded bg-white/80 dark:bg-[#0B1120]/70 border border-[#E2E8F0] dark:border-[#334155] text-[11px] font-mono text-cyan-800 dark:text-cyan-300">
                      <strong>Mandated Safety Action:</strong> {alert.recommendedAction}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-[11px] font-mono opacity-80">
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                  {alert.acknowledged ? (
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/30">
                      <Check className="w-3 h-3" /> Acknowledged
                    </span>
                  ) : (
                    <button
                      onClick={() => onAcknowledgeAlert(alert.id)}
                      className="px-3 py-1 rounded bg-white hover:bg-slate-100 text-[#0F172A] border border-[#CBD5E1] dark:bg-[#1F2937] dark:hover:bg-slate-700 dark:text-white dark:border-[#334155] font-mono text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
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
