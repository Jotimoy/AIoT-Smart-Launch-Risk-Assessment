import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import {
  countAdmins,
  findUserByEmail,
  findUserById,
  mapUserRowToAuthUser,
  updateUserPassword,
  writeAuditLog,
  type SQLiteDB,
} from '../db/database';
import {
  createRequireAuth,
  ensureCsrfToken,
  getClientIp,
  requireActiveAccount,
  verifyCsrf,
  type AuthenticatedRequest,
} from '../auth/middleware';
import { isValidEmail, normalizeEmail, validatePasswordStrength } from '../auth/validation';

export function createAuthRouter(db: SQLiteDB, inactivityTimeoutMs?: number): Router {
  const router = Router();
  const requireAuth = createRequireAuth(db, inactivityTimeoutMs);

  const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
      code: 'RATE_LIMITED',
    },
  });

  // Current session & CSRF bootstrap endpoint
  router.get('/me', (req: Request, res: Response) => {
    const csrfToken = ensureCsrfToken(req);
    const adminProvisioned = countAdmins(db) > 0;
    const userId = req.session?.userId;

    if (!userId) {
      return res.json({
        authenticated: false,
        user: null,
        csrfToken,
        adminProvisioned,
      });
    }

    const timeoutMs = inactivityTimeoutMs ?? (Number(process.env.SESSION_INACTIVITY_MS) || 30 * 60 * 1000);
    const now = Date.now();
    const lastActivity = req.session.lastActivityAt ?? 0;

    if (lastActivity > 0 && now - lastActivity > timeoutMs) {
      req.session.destroy(() => {});
      res.clearCookie('smart_launch.sid');
      return res.json({
        authenticated: false,
        user: null,
        csrfToken: crypto.randomBytes(32).toString('hex'),
        adminProvisioned,
        expired: true,
      });
    }

    const row = findUserById(db, userId);
    if (!row || row.is_active !== 1) {
      req.session.destroy(() => {});
      res.clearCookie('smart_launch.sid');
      return res.json({
        authenticated: false,
        user: null,
        csrfToken: crypto.randomBytes(32).toString('hex'),
        adminProvisioned,
      });
    }

    req.session.lastActivityAt = now;
    return res.json({
      authenticated: true,
      user: mapUserRowToAuthUser(row),
      csrfToken,
      adminProvisioned,
    });
  });

  router.get('/csrf', (req: Request, res: Response) => {
    const csrfToken = ensureCsrfToken(req);
    res.json({ csrfToken });
  });

  // Unified Sign-In (Admin, Captain, Authority)
  router.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    const ipAddress = getClientIp(req);

    if (!isValidEmail(email) || typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({ error: 'Please provide a valid email address and password.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const userRow = findUserByEmail(db, normalizedEmail);

    if (!userRow) {
      writeAuditLog(db, {
        actorEmail: normalizedEmail,
        eventType: 'LOGIN_FAILED',
        details: 'Failed login attempt (unknown email address).',
        ipAddress,
      });
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, userRow.password_hash);
    if (!passwordMatches) {
      writeAuditLog(db, {
        actorUserId: userRow.id,
        actorEmail: userRow.email,
        actorRole: userRow.role,
        eventType: 'LOGIN_FAILED',
        details: 'Failed login attempt (incorrect password).',
        ipAddress,
      });
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    if (userRow.is_active !== 1) {
      writeAuditLog(db, {
        actorUserId: userRow.id,
        actorEmail: userRow.email,
        actorRole: userRow.role,
        eventType: 'LOGIN_FAILED',
        details: 'Blocked login attempt on disabled account.',
        ipAddress,
      });
      return res.status(403).json({
        error: 'This account is currently deactivated. Please contact the system administrator.',
        code: 'ACCOUNT_DISABLED',
      });
    }

    // Regenerate session ID to prevent session fixation
    req.session.regenerate((regenErr) => {
      if (regenErr) {
        console.error('Session regeneration failed:', regenErr);
        return res.status(500).json({ error: 'Unable to establish secure session.' });
      }

      const csrfToken = crypto.randomBytes(32).toString('hex');
      req.session.userId = userRow.id;
      req.session.role = userRow.role;
      req.session.lastActivityAt = Date.now();
      req.session.csrfToken = csrfToken;

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Session save failed:', saveErr);
          return res.status(500).json({ error: 'Failed to persist session.' });
        }

        writeAuditLog(db, {
          actorUserId: userRow.id,
          actorEmail: userRow.email,
          actorRole: userRow.role,
          eventType: 'LOGIN_SUCCESS',
          details: `Signed in successfully as ${userRow.role}${userRow.must_change_password === 1 ? ' (password change pending)' : ''}.`,
          ipAddress,
        });

        return res.json({
          user: mapUserRowToAuthUser(userRow),
          csrfToken,
        });
      });
    });
  });

  // Logout & Destroy Session
  router.post('/logout', requireAuth, verifyCsrf, (req: AuthenticatedRequest, res: Response) => {
    const actor = req.currentUser!;
    const ipAddress = getClientIp(req);

    writeAuditLog(db, {
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      eventType: 'LOGOUT',
      details: `User ${actor.email} signed out.`,
      ipAddress,
    });

    req.session.destroy((err) => {
      res.clearCookie('smart_launch.sid');
      if (err) {
        return res.status(500).json({ error: 'Error ending session.' });
      }
      return res.json({ status: 'ok' });
    });
  });

  // Change Password (required on first login / temporary password reset, or voluntary)
  router.post(
    '/change-password',
    requireAuth,
    requireActiveAccount,
    verifyCsrf,
    async (req: AuthenticatedRequest, res: Response) => {
      const actor = req.currentUser!;
      const { currentPassword, newPassword } = req.body ?? {};
      const ipAddress = getClientIp(req);

      if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
        return res.status(400).json({ error: 'Current password and new password are required.' });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({ error: 'New password must be different from your current password.' });
      }

      const strength = validatePasswordStrength(newPassword);
      if (!strength.valid) {
        return res.status(400).json({ error: strength.errors[0], details: strength.errors });
      }

      const userRow = findUserById(db, actor.id);
      if (!userRow) {
        return res.status(404).json({ error: 'User record not found.' });
      }

      const validCurrent = await bcrypt.compare(currentPassword, userRow.password_hash);
      if (!validCurrent) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }

      const newHash = await bcrypt.hash(newPassword, 12);
      updateUserPassword(db, actor.id, newHash, false, false);

      const newCsrf = crypto.randomBytes(32).toString('hex');
      req.session.csrfToken = newCsrf;
      req.session.lastActivityAt = Date.now();

      writeAuditLog(db, {
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        targetUserId: actor.id,
        targetEmail: actor.email,
        eventType: 'PASSWORD_CHANGED',
        details: `${actor.email} updated their password.`,
        ipAddress,
      });

      const refreshed = findUserById(db, actor.id)!;
      return res.json({
        status: 'ok',
        user: mapUserRowToAuthUser(refreshed),
        csrfToken: newCsrf,
      });
    }
  );

  return router;
}
