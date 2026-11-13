import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import type { AuthUser, UserRole } from '../../src/types/auth';
import { findUserById, mapUserRowToAuthUser, writeAuditLog, type SQLiteDB } from '../db/database';
import { hasPermission, type Permission } from './rbac';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    role?: UserRole;
    csrfToken?: string;
    lastActivityAt?: number;
  }
}

export interface AuthenticatedRequest extends Request {
  currentUser?: AuthUser;
}

export const DEFAULT_INACTIVITY_TIMEOUT_MS = Number(process.env.SESSION_INACTIVITY_MS) || 30 * 60 * 1000;

export function ensureCsrfToken(req: Request): string {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

export function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

export function verifyCsrf(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  const sessionToken = req.session?.csrfToken;
  const headerToken = req.get('X-CSRF-Token') || req.get('x-csrf-token');

  if (!sessionToken || !headerToken) {
    res.status(403).json({ error: 'Missing CSRF security token. Please refresh and try again.' });
    return;
  }

  const a = Buffer.from(sessionToken, 'utf8');
  const b = Buffer.from(headerToken, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(403).json({ error: 'Invalid CSRF security token.' });
    return;
  }

  next();
}

export function createRequireAuth(db: SQLiteDB, inactivityTimeoutMs = DEFAULT_INACTIVITY_TIMEOUT_MS) {
  return function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const userId = req.session?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }

    const now = Date.now();
    const lastActivity = req.session.lastActivityAt ?? 0;
    if (lastActivity > 0 && now - lastActivity > inactivityTimeoutMs) {
      req.session.destroy(() => {});
      res.clearCookie('smart_launch.sid');
      res.status(401).json({ error: 'Session expired due to inactivity. Please sign in again.', code: 'SESSION_EXPIRED' });
      return;
    }

    const row = findUserById(db, userId);
    if (!row) {
      req.session.destroy(() => {});
      res.clearCookie('smart_launch.sid');
      res.status(401).json({ error: 'User account no longer exists.' });
      return;
    }

    req.session.lastActivityAt = now;
    req.currentUser = mapUserRowToAuthUser(row);
    next();
  };
}

export function requireActiveAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.currentUser) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if (!req.currentUser.isActive) {
    req.session.destroy(() => {});
    res.clearCookie('smart_launch.sid');
    res.status(403).json({
      error: 'Your account has been deactivated by an Administrator.',
      code: 'ACCOUNT_DISABLED',
    });
    return;
  }

  next();
}

export function requirePasswordChanged(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.currentUser) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if (req.currentUser.mustChangePassword) {
    res.status(403).json({
      error: 'You must change your temporary password before accessing this resource.',
      code: 'PASSWORD_CHANGE_REQUIRED',
    });
    return;
  }

  next();
}

export function createRequireRole(db: SQLiteDB) {
  return function requireRole(...allowedRoles: UserRole[]) {
    return function roleGuard(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
      if (!req.currentUser) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      if (!allowedRoles.includes(req.currentUser.role)) {
        writeAuditLog(db, {
          actorUserId: req.currentUser.id,
          actorEmail: req.currentUser.email,
          actorRole: req.currentUser.role,
          eventType: 'UNAUTHORIZED_ACCESS',
          details: `Blocked ${req.method} ${req.originalUrl} (required: ${allowedRoles.join(', ')})`,
          ipAddress: getClientIp(req),
        });

        res.status(403).json({
          error: `Access denied. Role '${req.currentUser.role}' is not authorized for this action.`,
          code: 'FORBIDDEN',
        });
        return;
      }

      next();
    };
  };
}

export function createRequirePermission(db: SQLiteDB) {
  return function requirePermission(permission: Permission) {
    return function permissionGuard(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
      if (!req.currentUser) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      if (!hasPermission(req.currentUser.role, permission)) {
        writeAuditLog(db, {
          actorUserId: req.currentUser.id,
          actorEmail: req.currentUser.email,
          actorRole: req.currentUser.role,
          eventType: 'UNAUTHORIZED_ACCESS',
          details: `Blocked ${req.method} ${req.originalUrl} (missing permission: ${permission})`,
          ipAddress: getClientIp(req),
        });

        res.status(403).json({
          error: `Permission denied (${permission}).`,
          code: 'FORBIDDEN',
        });
        return;
      }

      next();
    };
  };
}
