import React, { useCallback, useEffect, useState } from 'react';
import {
  UserPlus,
  Users,
  Search,
  KeyRound,
  Edit3,
  Trash2,
  Power,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  ShieldCheck,
  X,
  Loader2,
} from 'lucide-react';
import type { AdminUserRecord, UserRole } from '../types/auth';
import { apiFetch } from '../utils/apiClient';

export const AdminUsersView: React.FC = () => {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  // Create form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'CAPTAIN' | 'AUTHORITY'>('CAPTAIN');
  const [password, setPassword] = useState('');
  const [showCreatePw, setShowCreatePw] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdBanner, setCreatedBanner] = useState<{
    email: string;
    role: string;
    tempPassword: string;
  } | null>(null);
  const [copiedBanner, setCopiedBanner] = useState(false);

  // Table action feedback & modals
  const [actionMessage, setActionMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'CAPTAIN' | 'AUTHORITY'>('CAPTAIN');
  const [savingEdit, setSavingEdit] = useState(false);

  const [resetTarget, setResetTarget] = useState<AdminUserRecord | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetResultPassword, setResetResultPassword] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminUserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      const res = await apiFetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleGeneratePassword = async (target: 'create' | 'reset') => {
    try {
      const res = await apiFetch('/api/admin/users/generate-password');
      const data = await res.json();
      if (res.ok && data.password) {
        if (target === 'create') {
          setPassword(data.password);
          setShowCreatePw(true);
        } else {
          setResetPasswordInput(data.password);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setCreatedBanner(null);
    setActionMessage(null);
    setCreating(true);

    try {
      const res = await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          role,
          password,
          mustChangePassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error || 'Failed to create account.');
        return;
      }

      setCreatedBanner({
        email: data.user.email,
        role: data.user.role,
        tempPassword: password,
      });
      setFullName('');
      setEmail('');
      setPassword('');
      setMustChangePassword(true);
      await fetchUsers();
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (target: AdminUserRecord) => {
    setActionMessage(null);
    const res = await apiFetch(`/api/admin/users/${target.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !target.isActive }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActionMessage({ type: 'err', text: data.error || 'Failed to update account status.' });
      return;
    }
    setActionMessage({
      type: 'ok',
      text: `${target.email} is now ${!target.isActive ? 'ACTIVE' : 'DEACTIVATED'}.`,
    });
    await fetchUsers();
  };

  const openEditModal = (u: AdminUserRecord) => {
    setEditingUser(u);
    setEditName(u.fullName);
    setEditEmail(u.email);
    setEditRole(u.role === 'AUTHORITY' ? 'AUTHORITY' : 'CAPTAIN');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    setActionMessage(null);
    try {
      const payload: Record<string, unknown> = {
        fullName: editName.trim(),
        email: editEmail.trim(),
      };
      if (editingUser.role !== 'ADMIN') {
        payload.role = editRole;
      }
      const res = await apiFetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage({ type: 'err', text: data.error || 'Failed to save user changes.' });
        return;
      }
      setEditingUser(null);
      setActionMessage({ type: 'ok', text: `Updated ${data.user.email}.` });
      await fetchUsers();
    } finally {
      setSavingEdit(false);
    }
  };

  const openResetModal = (u: AdminUserRecord) => {
    setResetTarget(u);
    setResetPasswordInput('');
    setResetResultPassword(null);
    handleGeneratePassword('reset');
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetting(true);
    setActionMessage(null);
    try {
      const res = await apiFetch(`/api/admin/users/${resetTarget.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: resetPasswordInput }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage({ type: 'err', text: data.error || 'Failed to reset password.' });
        return;
      }
      setResetResultPassword(data.temporaryPassword);
      setActionMessage({
        type: 'ok',
        text: `Temporary password reset for ${resetTarget.email}. First-login change required.`,
      });
      await fetchUsers();
    } finally {
      setResetting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionMessage(null);
    try {
      const res = await apiFetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage({ type: 'err', text: data.error || 'Failed to delete user.' });
        return;
      }
      setActionMessage({ type: 'ok', text: `Deleted account ${deleteTarget.email}.` });
      setDeleteTarget(null);
      await fetchUsers();
    } finally {
      setDeleting(false);
    }
  };

  const getRoleBadgeClass = (r: UserRole) => {
    switch (r) {
      case 'ADMIN':
        return 'bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-500/40';
      case 'CAPTAIN':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-500/40';
      case 'AUTHORITY':
        return 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-500/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Admin User &amp; Access Management
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-mono mt-0.5">
            Provision Captain &amp; Authority credentials, enforce temporary password resets, and control account status in SQLite.
          </p>
        </div>
        <div className="text-xs font-mono bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#334155] px-3 py-1.5 rounded-lg text-[#64748B] dark:text-[#94A3B8]">
          Total Accounts: <strong className="text-[#0F172A] dark:text-[#F8FAFC]">{users.length}</strong>
        </div>
      </div>

      {/* Create New User Panel */}
      <section className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Create Captain or Authority Account
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-[#1F2937] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#334155]">
            Bcrypt Cost 12 &bull; SQLite Stored
          </span>
        </div>

        {formError && (
          <div className="rounded-xl border border-rose-300 dark:border-rose-700/70 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {createdBanner && (
          <div className="rounded-xl border border-emerald-300 dark:border-emerald-700/70 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-900 dark:text-emerald-200 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Account Created ({createdBanner.role})
              </div>
              <div className="font-mono">
                Email: <strong>{createdBanner.email}</strong> &bull; Temporary Password: <strong>{createdBanner.tempPassword}</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`Email: ${createdBanner.email}\nPassword: ${createdBanner.tempPassword}`);
                setCopiedBanner(true);
                setTimeout(() => setCopiedBanner(false), 2000);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedBanner ? 'Copied!' : 'Copy Credentials'}
            </button>
          </div>
        )}

        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <label htmlFor="create-full-name" className="block text-[11px] font-mono font-bold uppercase text-[#64748B] dark:text-[#94A3B8]">
              Full Name
            </label>
            <input
              id="create-full-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Capt. Tariqul Islam"
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1F2937] text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="create-email" className="block text-[11px] font-mono font-bold uppercase text-[#64748B] dark:text-[#94A3B8]">
              Email Address
            </label>
            <input
              id="create-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="captain@smartlaunch.local"
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1F2937] text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="create-role" className="block text-[11px] font-mono font-bold uppercase text-[#64748B] dark:text-[#94A3B8]">
              Role Assignment
            </label>
            <select
              id="create-role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'CAPTAIN' | 'AUTHORITY')}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1F2937] text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
            >
              <option value="CAPTAIN">CAPTAIN (Vessel Operations)</option>
              <option value="AUTHORITY">AUTHORITY (Monitoring Oversight)</option>
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="create-password" className="block text-[11px] font-mono font-bold uppercase text-[#64748B] dark:text-[#94A3B8]">
                Password
              </label>
              <button
                type="button"
                onClick={() => handleGeneratePassword('create')}
                className="text-[11px] font-mono font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                Generate Secure Password
              </button>
            </div>
            <div className="relative">
              <input
                id="create-password"
                type={showCreatePw ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 chars, mixed+symbol"
                className="w-full px-3 py-2 pr-9 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1F2937] text-sm font-mono text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
              />
              <button
                type="button"
                onClick={() => setShowCreatePw(s => !s)}
                aria-label="Toggle generated password visibility"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8] cursor-pointer"
              >
                {showCreatePw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-3 flex items-center gap-2 pt-1">
            <input
              id="require-pw-change"
              type="checkbox"
              checked={mustChangePassword}
              onChange={(e) => setMustChangePassword(e.target.checked)}
              className="rounded border-[#E2E8F0] dark:border-[#334155] text-cyan-600 focus:ring-cyan-500"
            />
            <label htmlFor="require-pw-change" className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Require user to change this temporary password on first login
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="w-full px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-xs font-bold font-mono flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Create Account
            </button>
          </div>
        </form>
      </section>

      {/* Existing Users Table */}
      <section className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Registered System Users
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or email..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
              />
            </div>

            <select
              aria-label="Filter users by role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'ALL' | UserRole)}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs font-mono text-[#0F172A] dark:text-[#F8FAFC]"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="CAPTAIN">CAPTAIN</option>
              <option value="AUTHORITY">AUTHORITY</option>
            </select>
          </div>
        </div>

        {actionMessage && (
          <div
            className={`rounded-lg border px-3 py-2 text-xs flex items-center gap-2 ${
              actionMessage.type === 'ok'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-700/60 dark:text-emerald-200'
                : 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:border-rose-700/60 dark:text-rose-200'
            }`}
          >
            {actionMessage.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{actionMessage.text}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-[#334155] text-[#64748B] dark:text-[#94A3B8] font-mono uppercase text-[11px]">
                <th className="py-2.5 pr-4">User</th>
                <th className="py-2.5 pr-4">Role</th>
                <th className="py-2.5 pr-4">Status</th>
                <th className="py-2.5 pr-4">Credential State</th>
                <th className="py-2.5 pr-4">Created</th>
                <th className="py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155]/70">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#64748B] dark:text-[#94A3B8] font-mono">
                    Loading user directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#64748B] dark:text-[#94A3B8] font-mono">
                    No users match the selected filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isPrimaryAdmin = u.role === 'ADMIN';
                  return (
                    <tr key={u.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/40 transition">
                      <td className="py-3 pr-4">
                        <div className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">{u.fullName}</div>
                        <div className="font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8]">{u.email}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold ${getRoleBadgeClass(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/50'
                              : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700/50'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-[11px]">
                        {u.mustChangePassword ? (
                          <span className="text-amber-700 dark:text-amber-400">Temp Change Pending</span>
                        ) : (
                          <span className="text-[#64748B] dark:text-[#94A3B8]">Verified</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        {isPrimaryAdmin ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800 px-2 py-1 rounded">
                            <ShieldCheck className="w-3 h-3" />
                            Protected Admin
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(u)}
                              title="Edit user"
                              className="px-2 py-1 rounded border border-[#E2E8F0] dark:border-[#334155] hover:bg-[#F1F5F9] dark:hover:bg-[#1F2937] text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              title={u.isActive ? 'Deactivate account' : 'Activate account'}
                              className={`px-2 py-1 rounded border flex items-center gap-1 cursor-pointer ${
                                u.isActive
                                  ? 'border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 dark:border-amber-700/60 dark:text-amber-300 dark:bg-amber-950/40'
                                  : 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-700/60 dark:text-emerald-300 dark:bg-emerald-950/40'
                              }`}
                            >
                              <Power className="w-3 h-3" />
                              {u.isActive ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openResetModal(u)}
                              title="Reset password"
                              className="px-2 py-1 rounded border border-cyan-300 text-cyan-800 bg-cyan-50 hover:bg-cyan-100 dark:border-cyan-700/60 dark:text-cyan-300 dark:bg-cyan-950/40 flex items-center gap-1 cursor-pointer"
                            >
                              <KeyRound className="w-3 h-3" />
                              Reset PW
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(u)}
                              title="Delete account"
                              className="px-2 py-1 rounded border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 dark:border-rose-700/60 dark:text-rose-300 dark:bg-rose-950/40 flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">Edit Account Details</h3>
              <button type="button" onClick={() => setEditingUser(null)} className="text-[#64748B] hover:text-[#0F172A] dark:hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-mono font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1F2937] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1F2937] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as 'CAPTAIN' | 'AUTHORITY')}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1F2937] text-sm"
                >
                  <option value="CAPTAIN">CAPTAIN</option>
                  <option value="AUTHORITY">AUTHORITY</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingUser(null)} className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155] text-xs font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={savingEdit} className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer">
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">Reset Password</h3>
              <button type="button" onClick={() => setResetTarget(null)} className="text-[#64748B] hover:text-[#0F172A] dark:hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Assign a temporary password for <strong>{resetTarget.email}</strong>. Active sessions will be revoked and the user will be forced to set a new password upon next login.
            </p>

            {resetResultPassword ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 p-3 text-xs font-mono">
                  New Temporary Password: <strong className="select-all">{resetResultPassword}</strong>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setResetTarget(null)} className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-xs font-bold cursor-pointer">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmReset} className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-[#64748B] dark:text-[#94A3B8]">Temporary Password</label>
                  <button type="button" onClick={() => handleGeneratePassword('reset')} className="text-xs font-mono text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer">
                    Regenerate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1F2937] text-sm font-mono"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setResetTarget(null)} className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155] text-xs font-bold cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={resetting} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer">
                    {resetting ? 'Resetting...' : 'Confirm Password Reset'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-rose-300 dark:border-rose-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-rose-700 dark:text-rose-400">Delete User Account?</h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              This will permanently remove <strong>{deleteTarget.fullName}</strong> (<code className="font-mono">{deleteTarget.email}</code>) and terminate any active sessions.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155] text-xs font-bold cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={handleConfirmDelete} disabled={deleting} className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer">
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
