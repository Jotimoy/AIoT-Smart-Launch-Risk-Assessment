import React from 'react';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import type { UserRole } from '../types/auth';

interface AccessDeniedViewProps {
  role: UserRole;
  attemptedPath: string;
  onReturnDashboard: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  role,
  attemptedPath,
  onReturnDashboard,
}) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-[#111827] border border-rose-300 dark:border-rose-700/60 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-md">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/40 flex items-center justify-center">
          <ShieldOff className="w-6 h-6 text-rose-600 dark:text-rose-400" />
        </div>
        <div className="space-y-1.5">
          <span className="inline-block text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            HTTP 403 &bull; ACCESS DENIED
          </span>
          <h2 className="text-lg font-black text-[#0F172A] dark:text-[#F8FAFC]">
            Unauthorized Section
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Your active role (<strong className="font-mono text-[#0F172A] dark:text-[#F8FAFC]">{role}</strong>) does not have permission to access <code className="font-mono text-rose-600 dark:text-rose-400">{attemptedPath}</code>.
          </p>
        </div>

        <button
          type="button"
          onClick={onReturnDashboard}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to {role} Dashboard
        </button>
      </div>
    </div>
  );
};
