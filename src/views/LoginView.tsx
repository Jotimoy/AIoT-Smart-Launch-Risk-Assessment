import React, { useState } from 'react';
import { Ship, Lock, Mail, Eye, EyeOff, Sun, Moon, AlertCircle, Loader2, ShieldCheck, Compass, Landmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const LoginView: React.FC = () => {
  const { login, adminProvisioned, sessionMessage, clearSessionMessage } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    clearSessionMessage();

    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error || 'Invalid credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col transition-colors duration-200">
      {/* Top Bar with Theme Toggle */}
      <header className="w-full border-b border-[#E2E8F0] dark:border-[#334155] bg-white/90 dark:bg-[#111827]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-sm border border-cyan-400/40">
              <Ship className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-wide text-[#0F172A] dark:text-[#F8FAFC]">
                AIoT Smart Launch Risk Assessment
              </h1>
              <p className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">
                Local Vessel Safety Monitoring &amp; Access Control
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            data-testid="theme-toggle"
            className="p-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] hover:bg-[#F1F5F9] dark:bg-[#1F2937] dark:hover:bg-slate-700 text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5 text-xs font-mono font-semibold shadow-xs transition-all duration-200 cursor-pointer"
          >
            {theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-cyan-400" />
            )}
            <span className="hidden sm:inline">{theme === 'light' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </header>

      {/* Main Centered Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-5">
          {!adminProvisioned && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                Initial Administrator Not Provisioned
              </div>
              <p>
                Run the one-time local setup command in your terminal to create the initial Admin account:
              </p>
              <code className="block bg-white/80 dark:bg-[#0B1120] border border-amber-200 dark:border-amber-800 rounded px-2.5 py-1.5 font-mono text-[11px]">
                npm run setup:admin
              </code>
            </div>
          )}

          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl shadow-lg dark:shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center">
                <Lock className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h2 className="text-xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                Authorized Personnel Sign In
              </h2>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Sign in with credentials assigned by your System Administrator. Public registration is disabled.
              </p>
            </div>

            {(error || sessionMessage) && (
              <div
                role="alert"
                className="rounded-xl border border-rose-300 dark:border-rose-700/70 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{error || sessionMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-wider font-mono text-[#64748B] dark:text-[#94A3B8]">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@smartlaunch.local"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1F2937] text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wider font-mono text-[#64748B] dark:text-[#94A3B8]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your assigned password"
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1F2937] text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 disabled:opacity-60 text-white font-bold text-sm shadow-md shadow-cyan-900/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            {/* Role Summary Footer */}
            <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#334155] grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-[#F8FAFC] dark:bg-[#1F2937]/70 p-2 border border-[#E2E8F0] dark:border-[#334155]">
                <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400 mx-auto mb-1" />
                <div className="text-[10px] font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC]">ADMIN</div>
                <div className="text-[9px] text-[#64748B] dark:text-[#94A3B8]">Full System</div>
              </div>
              <div className="rounded-lg bg-[#F8FAFC] dark:bg-[#1F2937]/70 p-2 border border-[#E2E8F0] dark:border-[#334155]">
                <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                <div className="text-[10px] font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC]">CAPTAIN</div>
                <div className="text-[9px] text-[#64748B] dark:text-[#94A3B8]">Vessel Ops</div>
              </div>
              <div className="rounded-lg bg-[#F8FAFC] dark:bg-[#1F2937]/70 p-2 border border-[#E2E8F0] dark:border-[#334155]">
                <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mx-auto mb-1" />
                <div className="text-[10px] font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC]">AUTHORITY</div>
                <div className="text-[9px] text-[#64748B] dark:text-[#94A3B8]">Oversight</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
