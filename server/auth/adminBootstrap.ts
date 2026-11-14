import bcrypt from 'bcryptjs';
import {
  countAdmins,
  createUserRecord,
  findUserByEmail,
  writeAuditLog,
  type SQLiteDB,
} from '../db/database';
import { isValidEmail, isValidFullName, normalizeEmail, validatePasswordStrength } from './validation';

export interface ProvisionAdminResult {
  created: boolean;
  reason?: string;
  email?: string;
}

/**
 * Safely creates the single initial ADMIN account if none exists yet.
 * Refuses to create a second ADMIN account once one is provisioned.
 */
export async function provisionInitialAdmin(
  db: SQLiteDB,
  input: { fullName: string; email: string; password: string }
): Promise<ProvisionAdminResult> {
  if (countAdmins(db) > 0) {
    return { created: false, reason: 'An ADMIN account is already provisioned.' };
  }

  if (!isValidFullName(input.fullName)) {
    throw new Error('Admin full name must be between 2 and 100 characters.');
  }
  if (!isValidEmail(input.email)) {
    throw new Error('Admin email address is invalid.');
  }

  const strength = validatePasswordStrength(input.password);
  if (!strength.valid) {
    throw new Error(`Admin password is too weak: ${strength.errors.join(' ')}`);
  }

  const normalizedEmail = normalizeEmail(input.email);
  if (findUserByEmail(db, normalizedEmail)) {
    throw new Error('A user with that email already exists.');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const created = createUserRecord(db, {
    fullName: input.fullName,
    email: normalizedEmail,
    passwordHash,
    role: 'ADMIN',
    isActive: true,
    mustChangePassword: false,
  });

  writeAuditLog(db, {
    actorUserId: created.id,
    actorEmail: created.email,
    actorRole: 'ADMIN',
    targetUserId: created.id,
    targetEmail: created.email,
    eventType: 'ADMIN_PROVISIONED',
    details: `Initial ADMIN account provisioned via secure bootstrap (${created.email}).`,
  });

  return { created: true, email: created.email };
}

export async function provisionInitialAdminFromEnv(db: SQLiteDB): Promise<void> {
  if (countAdmins(db) > 0) return;

  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const fullName = process.env.INITIAL_ADMIN_NAME || 'System Administrator';

  if (!email || !password) {
    return;
  }

  const res = await provisionInitialAdmin(db, { fullName, email, password });
  if (res.created) {
    console.log(`[Auth Bootstrap] Provisioned initial ADMIN from environment (${res.email})`);
  }
}
