import bcrypt from 'bcryptjs';
import { Router, type Response } from 'express';
import {
  createUserRecord,
  deleteUserRecord,
  findUserByEmail,
  findUserById,
  listAuditLogs,
  listUsers,
  updateUserPassword,
  updateUserRecord,
  writeAuditLog,
  type SQLiteDB,
} from '../db/database';
import {
  createRequireAuth,
  createRequireRole,
  getClientIp,
  requireActiveAccount,
  requirePasswordChanged,
  verifyCsrf,
  type AuthenticatedRequest,
} from '../auth/middleware';
import { isRoleChangeAllowed } from '../auth/rbac';
import {
  generateSecurePassword,
  isCreatableSubRole,
  isValidEmail,
  isValidFullName,
  isValidRole,
  normalizeEmail,
  validatePasswordStrength,
} from '../auth/validation';

export function createAdminRouter(db: SQLiteDB, inactivityTimeoutMs?: number): Router {
  const router = Router();
  const requireAuth = createRequireAuth(db, inactivityTimeoutMs);
  const requireRole = createRequireRole(db);

  // Strict chain applied to ALL Admin endpoints
  router.use(requireAuth, requireActiveAccount, requirePasswordChanged, requireRole('ADMIN'));

  // Generate a random secure temporary password
  router.get('/users/generate-password', (_req: AuthenticatedRequest, res: Response) => {
    res.json({ password: generateSecurePassword(14) });
  });

  // List registered users with optional search/role filters
  router.get('/users', (req: AuthenticatedRequest, res: Response) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const users = listUsers(db, { search, role });
    res.json({ users });
  });

  // Create Captain or Authority account
  router.post('/users', verifyCsrf, async (req: AuthenticatedRequest, res: Response) => {
    const actor = req.currentUser!;
    const ipAddress = getClientIp(req);
    const { fullName, email, role, password, mustChangePassword } = req.body ?? {};

    if (!isValidFullName(fullName)) {
      return res.status(400).json({ error: 'Full name must be between 2 and 100 characters.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (typeof role !== 'string' || !isCreatableSubRole(role)) {
      return res.status(403).json({
        error: 'System policy only permits creating CAPTAIN or AUTHORITY accounts.',
      });
    }

    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.errors[0], details: strength.errors });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = findUserByEmail(db, normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const requireReset = mustChangePassword !== false;

    const created = createUserRecord(db, {
      fullName,
      email: normalizedEmail,
      passwordHash,
      role,
      isActive: true,
      mustChangePassword: requireReset,
    });

    writeAuditLog(db, {
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      targetUserId: created.id,
      targetEmail: created.email,
      eventType: 'USER_CREATED',
      details: `Created ${role} account for ${created.fullName} (${created.email}). Temporary password reset required: ${requireReset}.`,
      ipAddress,
    });

    return res.status(201).json({ user: created });
  });

  // Edit user details, role (Captain <-> Authority), or active status
  router.patch('/users/:id', verifyCsrf, (req: AuthenticatedRequest, res: Response) => {
    const actor = req.currentUser!;
    const ipAddress = getClientIp(req);
    const targetId = Number(req.params.id);

    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }

    const target = findUserById(db, targetId);
    if (!target) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { fullName, email, role, isActive } = req.body ?? {};

    if (fullName !== undefined && !isValidFullName(fullName)) {
      return res.status(400).json({ error: 'Full name must be between 2 and 100 characters.' });
    }

    let normalizedEmail: string | undefined;
    if (email !== undefined) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
      }
      normalizedEmail = normalizeEmail(email);
      const duplicate = findUserByEmail(db, normalizedEmail);
      if (duplicate && duplicate.id !== targetId) {
        return res.status(409).json({ error: 'Another account already uses this email address.' });
      }
    }

    if (role !== undefined) {
      if (typeof role !== 'string' || !isValidRole(role)) {
        return res.status(400).json({ error: 'Invalid role specified.' });
      }
      if (!isRoleChangeAllowed(target.role, role)) {
        return res.status(403).json({
          error: 'System policy prohibits promoting accounts to ADMIN or demoting the primary ADMIN.',
        });
      }
    }

    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: 'isActive must be a boolean.' });
      }
      if (!isActive && (target.role === 'ADMIN' || target.id === actor.id)) {
        return res.status(403).json({
          error: 'The primary ADMIN account cannot be deactivated.',
        });
      }
    }

    const updated = updateUserRecord(db, targetId, {
      fullName,
      email: normalizedEmail,
      role,
      isActive,
    });

    if (!updated) {
      return res.status(404).json({ error: 'User not found after update.' });
    }

    if (role !== undefined && role !== target.role) {
      writeAuditLog(db, {
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        targetUserId: updated.id,
        targetEmail: updated.email,
        eventType: 'ROLE_CHANGED',
        details: `Changed role for ${updated.email} from ${target.role} to ${updated.role}.`,
        ipAddress,
      });
    }

    if (isActive !== undefined && isActive !== (target.is_active === 1)) {
      writeAuditLog(db, {
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        targetUserId: updated.id,
        targetEmail: updated.email,
        eventType: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        details: `${isActive ? 'Activated' : 'Deactivated'} account for ${updated.email}.`,
        ipAddress,
      });
    }

    if (
      (fullName !== undefined && fullName.trim() !== target.full_name) ||
      (normalizedEmail !== undefined && normalizedEmail !== target.email)
    ) {
      writeAuditLog(db, {
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        targetUserId: updated.id,
        targetEmail: updated.email,
        eventType: 'USER_UPDATED',
        details: `Updated profile details for ${updated.email}.`,
        ipAddress,
      });
    }

    return res.json({ user: updated });
  });

  // Reset Captain or Authority password
  router.post('/users/:id/reset-password', verifyCsrf, async (req: AuthenticatedRequest, res: Response) => {
    const actor = req.currentUser!;
    const ipAddress = getClientIp(req);
    const targetId = Number(req.params.id);

    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }

    const target = findUserById(db, targetId);
    if (!target) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (target.role === 'ADMIN') {
      return res.status(403).json({
        error: 'Cannot reset primary ADMIN password from user management. Use Change Password in your profile.',
      });
    }

    const requestedPassword = req.body?.newPassword;
    const tempPassword = typeof requestedPassword === 'string' && requestedPassword.length > 0
      ? requestedPassword
      : generateSecurePassword(14);

    const strength = validatePasswordStrength(tempPassword);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.errors[0], details: strength.errors });
    }

    const hash = await bcrypt.hash(tempPassword, 12);
    updateUserPassword(db, targetId, hash, true, true);

    writeAuditLog(db, {
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      targetUserId: target.id,
      targetEmail: target.email,
      eventType: 'USER_PASSWORD_RESET',
      details: `Reset temporary password for ${target.email} (${target.role}) and invalidated active sessions.`,
      ipAddress,
    });

    return res.json({
      status: 'ok',
      temporaryPassword: tempPassword,
      user: findUserById(db, targetId) ? undefined : null,
    });
  });

  // Delete Captain or Authority account
  router.delete('/users/:id', verifyCsrf, (req: AuthenticatedRequest, res: Response) => {
    const actor = req.currentUser!;
    const ipAddress = getClientIp(req);
    const targetId = Number(req.params.id);

    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }

    const target = findUserById(db, targetId);
    if (!target) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (target.role === 'ADMIN' || target.id === actor.id) {
      return res.status(403).json({
        error: 'System policy forbids deleting the primary ADMIN account.',
      });
    }

    const deleted = deleteUserRecord(db, targetId);
    if (!deleted) {
      return res.status(404).json({ error: 'User could not be deleted.' });
    }

    writeAuditLog(db, {
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      targetUserId: target.id,
      targetEmail: target.email,
      eventType: 'USER_DELETED',
      details: `Deleted ${target.role} account (${target.email}).`,
      ipAddress,
    });

    return res.json({ status: 'ok', deletedId: targetId });
  });

  // View authentication and administrative audit logs
  router.get('/audit-logs', (req: AuthenticatedRequest, res: Response) => {
    const eventType = typeof req.query.eventType === 'string' ? req.query.eventType : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const logs = listAuditLogs(db, { eventType, limit });
    res.json({ logs });
  });

  return router;
}
