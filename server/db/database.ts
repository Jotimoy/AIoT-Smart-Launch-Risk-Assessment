import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import type { AdminUserRecord, AuditLogRecord, AuthUser, UserRole } from '../../src/types/auth';

export type SQLiteDB = Database.Database;

export interface InternalUserRow {
  id: number;
  full_name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_active: number;
  must_change_password: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLogInput {
  actorUserId?: number | null;
  actorEmail?: string | null;
  actorRole?: UserRole | null;
  targetUserId?: number | null;
  targetEmail?: string | null;
  eventType: string;
  details: string;
  ipAddress?: string | null;
}

const DEFAULT_DB_PATH = path.resolve(process.cwd(), 'data', 'smart_launch.db');

export function mapUserRowToAuthUser(row: InternalUserRow): AuthUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    isActive: row.is_active === 1,
    mustChangePassword: row.must_change_password === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function initSchema(db: SQLiteDB): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('ADMIN', 'CAPTAIN', 'AUTHORITY')),
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      user_id INTEGER NULL REFERENCES users(id) ON DELETE CASCADE,
      sess TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      last_activity_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      actor_email TEXT NULL,
      actor_role TEXT NULL,
      target_user_id INTEGER NULL,
      target_email TEXT NULL,
      event_type TEXT NOT NULL,
      details TEXT NOT NULL,
      ip_address TEXT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_logs(event_type);
    CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_user_id);

    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);
}

export function createDatabase(dbPath: string = process.env.SQLITE_DB_PATH || DEFAULT_DB_PATH): SQLiteDB {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  const db = new Database(dbPath);
  initSchema(db);
  return db;
}

let singletonDb: SQLiteDB | null = null;

export function getDatabase(): SQLiteDB {
  if (!singletonDb) {
    singletonDb = createDatabase();
  }
  return singletonDb;
}

export function countAdmins(db: SQLiteDB): number {
  const row = db.prepare(`SELECT COUNT(*) AS cnt FROM users WHERE role = 'ADMIN'`).get() as { cnt: number };
  return row.cnt;
}

export function findUserByEmail(db: SQLiteDB, email: string): InternalUserRow | undefined {
  return db.prepare(`SELECT * FROM users WHERE email = ? LIMIT 1`).get(email.trim().toLowerCase()) as InternalUserRow | undefined;
}

export function findUserById(db: SQLiteDB, id: number): InternalUserRow | undefined {
  return db.prepare(`SELECT * FROM users WHERE id = ? LIMIT 1`).get(id) as InternalUserRow | undefined;
}

export function listUsers(
  db: SQLiteDB,
  filters: { search?: string; role?: string } = {}
): AdminUserRecord[] {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.role && filters.role !== 'ALL') {
    conditions.push(`role = ?`);
    params.push(filters.role);
  }
  if (filters.search && filters.search.trim().length > 0) {
    conditions.push(`(full_name LIKE ? OR email LIKE ?)`);
    const like = `%${filters.search.trim()}%`;
    params.push(like, like);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT * FROM users ${where} ORDER BY CASE role WHEN 'ADMIN' THEN 0 WHEN 'CAPTAIN' THEN 1 ELSE 2 END, created_at DESC`)
    .all(...params) as InternalUserRow[];

  return rows.map(mapUserRowToAuthUser);
}

export function createUserRecord(
  db: SQLiteDB,
  input: {
    fullName: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    isActive?: boolean;
    mustChangePassword?: boolean;
  }
): AdminUserRecord {
  const stmt = db.prepare(`
    INSERT INTO users (full_name, email, password_hash, role, is_active, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    input.fullName.trim(),
    input.email.trim().toLowerCase(),
    input.passwordHash,
    input.role,
    input.isActive === false ? 0 : 1,
    input.mustChangePassword === false ? 0 : 1
  );
  const created = findUserById(db, Number(result.lastInsertRowid));
  if (!created) {
    throw new Error('Failed to retrieve newly created user.');
  }
  return mapUserRowToAuthUser(created);
}

export function updateUserRecord(
  db: SQLiteDB,
  id: number,
  updates: {
    fullName?: string;
    email?: string;
    role?: UserRole;
    isActive?: boolean;
  }
): AdminUserRecord | undefined {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.fullName !== undefined) {
    fields.push(`full_name = ?`);
    params.push(updates.fullName.trim());
  }
  if (updates.email !== undefined) {
    fields.push(`email = ?`);
    params.push(updates.email.trim().toLowerCase());
  }
  if (updates.role !== undefined) {
    fields.push(`role = ?`);
    params.push(updates.role);
  }
  if (updates.isActive !== undefined) {
    fields.push(`is_active = ?`);
    params.push(updates.isActive ? 1 : 0);
  }

  if (fields.length === 0) {
    const existing = findUserById(db, id);
    return existing ? mapUserRowToAuthUser(existing) : undefined;
  }

  fields.push(`updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`);
  params.push(id);

  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  // If account deactivated, immediately revoke active sessions
  if (updates.isActive === false) {
    db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(id);
  }

  const row = findUserById(db, id);
  return row ? mapUserRowToAuthUser(row) : undefined;
}

export function updateUserPassword(
  db: SQLiteDB,
  id: number,
  passwordHash: string,
  mustChangePassword: boolean,
  invalidateSessions = false
): void {
  db.prepare(`
    UPDATE users
    SET password_hash = ?,
        must_change_password = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ?
  `).run(passwordHash, mustChangePassword ? 1 : 0, id);

  if (invalidateSessions) {
    db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(id);
  }
}

export function deleteUserRecord(db: SQLiteDB, id: number): boolean {
  db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(id);
  const res = db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
  return res.changes > 0;
}

export function writeAuditLog(db: SQLiteDB, entry: AuditLogInput): void {
  db.prepare(`
    INSERT INTO audit_logs (
      actor_user_id, actor_email, actor_role,
      target_user_id, target_email, event_type, details, ip_address
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.actorUserId ?? null,
    entry.actorEmail ?? null,
    entry.actorRole ?? null,
    entry.targetUserId ?? null,
    entry.targetEmail ?? null,
    entry.eventType,
    entry.details,
    entry.ipAddress ?? null
  );
}

export function listAuditLogs(
  db: SQLiteDB,
  options: { eventType?: string; limit?: number } = {}
): AuditLogRecord[] {
  const limit = Math.min(Math.max(Number(options.limit) || 100, 1), 500);
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.eventType && options.eventType !== 'ALL') {
    conditions.push(`event_type = ?`);
    params.push(options.eventType);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit);

  const rows = db
    .prepare(`SELECT * FROM audit_logs ${where} ORDER BY id DESC LIMIT ?`)
    .all(...params) as Array<{
      id: number;
      actor_user_id: number | null;
      actor_email: string | null;
      actor_role: UserRole | null;
      target_user_id: number | null;
      target_email: string | null;
      event_type: string;
      details: string;
      ip_address: string | null;
      created_at: string;
    }>;

  return rows.map(r => ({
    id: r.id,
    actorUserId: r.actor_user_id,
    actorEmail: r.actor_email,
    actorRole: r.actor_role,
    targetUserId: r.target_user_id,
    targetEmail: r.target_email,
    eventType: r.event_type,
    details: r.details,
    ipAddress: r.ip_address,
    createdAt: r.created_at,
  }));
}

export function loadSystemConfig<T>(db: SQLiteDB, key: string): T | null {
  const row = db.prepare(`SELECT value FROM system_config WHERE key = ?`).get(key) as { value: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export function saveSystemConfig(db: SQLiteDB, key: string, value: unknown): void {
  db.prepare(`
    INSERT INTO system_config (key, value, updated_at)
    VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `).run(key, JSON.stringify(value));
}
