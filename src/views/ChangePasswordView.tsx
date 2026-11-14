import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ChangePasswordViewProps {
  forced?: boolean;
  onDone?: () => void;
}

export const ChangePasswordView: React.FC<ChangePasswordViewProps> = ({ forced = false, onDone }) => {
  const { user, changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const checks = [
    { label: 'At least 8 characters', ok: newPassword.length >= 8 },
    { label: 'Uppercase letter (A-Z)', ok: /[A-Z]/.test(newPassword) },
    { label: 'Lowercase letter (a-z)', ok: /[a-z]/.test(newPassword) },
    { label: 'Numeric digit (0-9)', ok: /[0-9]/.test(newPassword) },
    { label: 'Special character (!@#$%)', ok: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    const res = await changePassword(currentPassword, newPassword);
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error || 'Unable to update password.');
      return;
    }

    setSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    if (onDone) {
      onDone();
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl shadow-lg p-6 sm:p-8 space-y-5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-500/40 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            {forced && (
              <button
                type="button"
                onClick={logout}
                className="text-xs font-mono text-[#64748B] hover:text-rose-600 dark:text-[#94A3B8] dark:hover:text-rose-400 flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            )}
          </div>
          <h2 className="text-lg font-black text-[#0F172A] dark:text-[#F8FAFC]">
            {forced ? 'Update Temporary Password' : 'Change Account Password'}
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            {forced
              ? `Welcome, ${user?.fullName}. For security, you must replace your temporary password before accessing the ${user?.role} dashboard.`
              : `Updating password for ${user?.email} (${user?.role}).`}
          </p>
        </div>

        {forced && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>First-login security policy requires setting a personal strong password.</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-300 dark:border-rose-700/70 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-300 dark:border-emerald-700/70 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>Password updated successfully.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="current-password" className="block text-xs font-bold font-mono uppercase text-[#64748B] dark:text-[#94A3B8]">
              {forced ? 'Temporary Password' : 'Current Password'}
            </label>
            <div className="relative">
              <input
                id="current-password"
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2 pr-10 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1F2937] text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(v => !v)}
                aria-label="Toggle current password visibility"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8] cursor-pointer"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="new-password" className="block text-xs font-bold font-mono uppercase text-[#64748B] dark:text-[#94A3B8]">
              New Password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 pr-10 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1F2937] text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                aria-label="Toggle new password visibility"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8] cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1 bg-[#F8FAFC] dark:bg-[#0B1120] p-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155]">
            {checks.map(c => (
              <div key={c.label} className={`text-[11px] font-mono flex items-center gap-1.5 ${c.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#64748B] dark:text-[#94A3B8]'}`}>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{c.label}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <label htmlFor="confirm-password" className="block text-xs font-bold font-mono uppercase text-[#64748B] dark:text-[#94A3B8]">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type={showNew ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1F2937] text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
            />
          </div>

          <div className="flex gap-2">
            {!forced && onDone && (
              <button
                type="button"
                onClick={onDone}
                className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save New Password</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
