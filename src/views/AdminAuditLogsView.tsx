import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import type { AuditLogRecord } from '../types/auth';
import { apiFetch } from '../utils/apiClient';

export const AdminAuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [eventFilter, setEventFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '150' });
      if (eventFilter !== 'ALL') params.set('eventType', eventFilter);
      const res = await apiFetch(`/api/admin/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } finally {
      setLoading(false);
    }
  }, [eventFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getEventBadge = (evt: string) => {
    if (evt.includes('FAILED') || evt.includes('UNAUTHORIZED') || evt.includes('DELETED') || evt.includes('DEACTIVATED')) {
      return 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700/60';
    }
    if (evt.includes('RESET') || evt.includes('ROLE') || evt.includes('CONFIG')) {
      return 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60';
    }
    if (evt.includes('SUCCESS') || evt.includes('CREATED') || evt.includes('ACTIVATED') || evt.includes('PASSWORD_CHANGED')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/60';
    }
    return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-[#1F2937] dark:text-slate-300 dark:border-[#334155]';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Authentication &amp; Security Audit Logs
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-mono mt-0.5">
            Immutable SQLite security trail of sign-ins, failed attempts, account lifecycle events, and RBAC blocks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Filter audit logs by event type"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs font-mono text-[#0F172A] dark:text-[#F8FAFC]"
          >
            <option value="ALL">All Event Types</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="USER_CREATED">USER_CREATED</option>
            <option value="USER_DEACTIVATED">USER_DEACTIVATED</option>
            <option value="USER_ACTIVATED">USER_ACTIVATED</option>
            <option value="USER_PASSWORD_RESET">USER_PASSWORD_RESET</option>
            <option value="PASSWORD_CHANGED">PASSWORD_CHANGED</option>
            <option value="ROLE_CHANGED">ROLE_CHANGED</option>
            <option value="USER_DELETED">USER_DELETED</option>
            <option value="UNAUTHORIZED_ACCESS">UNAUTHORIZED_ACCESS</option>
          </select>

          <button
            type="button"
            onClick={fetchLogs}
            className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] hover:bg-[#F1F5F9] dark:bg-[#1F2937] dark:hover:bg-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-5 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#E2E8F0] dark:border-[#334155] text-[#64748B] dark:text-[#94A3B8] font-mono uppercase text-[11px]">
              <th className="py-2.5 pr-4">Timestamp</th>
              <th className="py-2.5 pr-4">Event</th>
              <th className="py-2.5 pr-4">Actor</th>
              <th className="py-2.5 pr-4">Details</th>
              <th className="py-2.5">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155]/70">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[#64748B] dark:text-[#94A3B8] font-mono">
                  {loading ? 'Loading audit log records...' : 'No audit events recorded for this filter.'}
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/40 transition">
                  <td className="py-2.5 pr-4 font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-4 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${getEventBadge(log.eventType)}`}>
                      {log.eventType}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[11px] text-[#0F172A] dark:text-[#F8FAFC]">
                    {log.actorEmail || 'anonymous'}
                    {log.actorRole && (
                      <span className="ml-1.5 text-[10px] text-[#64748B] dark:text-[#94A3B8]">({log.actorRole})</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-[#0F172A] dark:text-slate-200">{log.details}</td>
                  <td className="py-2.5 font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    {log.ipAddress || 'localhost'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
