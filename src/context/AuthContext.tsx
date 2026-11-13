import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AuthUser } from '../types/auth';
import { apiFetch, setCsrfToken, setUnauthorizedHandler } from '../utils/apiClient';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  adminProvisioned: boolean;
  sessionMessage: string | null;
  clearSessionMessage: () => void;
  refreshSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; user?: AuthUser }>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [adminProvisioned, setAdminProvisioned] = useState<boolean>(true);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
      const data = await res.json();
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
      setAdminProvisioned(data.adminProvisioned !== false);
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
        if (data.expired) {
          setSessionMessage('Your session expired due to inactivity. Please sign in again.');
        }
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(prev => {
        if (prev) {
          setSessionMessage('Your session ended or was revoked. Please sign in again.');
        }
        return null;
      });
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || 'Authentication failed.' };
      }
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
      setUser(data.user);
      setSessionMessage(null);
      return { ok: true, user: data.user as AuthUser };
    } catch {
      return { ok: false, error: 'Unable to reach authentication server.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network failure on logout
    } finally {
      setUser(null);
      await refreshSession();
    }
  }, [refreshSession]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to update password.' };
      }
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
      if (data.user) {
        setUser(data.user);
      }
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error while updating password.' };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        adminProvisioned,
        sessionMessage,
        clearSessionMessage: () => setSessionMessage(null),
        refreshSession,
        login,
        logout,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
