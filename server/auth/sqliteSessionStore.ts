import session from 'express-session';
import type { SQLiteDB } from '../db/database';

export interface SQLiteStoreOptions {
  db: SQLiteDB;
  ttlMs?: number;
  inactivityTimeoutMs?: number;
  pruneIntervalMs?: number;
}

export class SQLiteSessionStore extends session.Store {
  private db: SQLiteDB;
  private ttlMs: number;
  private inactivityTimeoutMs: number;
  private pruneTimer?: ReturnType<typeof setInterval>;

  constructor(options: SQLiteStoreOptions) {
    super();
    this.db = options.db;
    this.ttlMs = options.ttlMs ?? 8 * 60 * 60 * 1000; // 8 hours absolute
    this.inactivityTimeoutMs = options.inactivityTimeoutMs ?? 30 * 60 * 1000; // 30 minutes idle

    const pruneEvery = options.pruneIntervalMs ?? 5 * 60 * 1000;
    this.pruneTimer = setInterval(() => {
      this.pruneExpired();
    }, pruneEvery);
    if (typeof this.pruneTimer.unref === 'function') {
      this.pruneTimer.unref();
    }
  }

  public pruneExpired(): number {
    const now = Date.now();
    const res = this.db
      .prepare(`DELETE FROM sessions WHERE expires_at <= ? OR (? - last_activity_at) > ?`)
      .run(now, now, this.inactivityTimeoutMs);
    return res.changes;
  }

  public close(): void {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = undefined;
    }
  }

  override get(sid: string, callback: (err?: unknown, session?: session.SessionData | null) => void): void {
    try {
      const row = this.db
        .prepare(`SELECT sess, expires_at, last_activity_at FROM sessions WHERE sid = ?`)
        .get(sid) as { sess: string; expires_at: number; last_activity_at: number } | undefined;

      if (!row) {
        return callback(null, null);
      }

      const now = Date.now();
      if (row.expires_at <= now || (now - row.last_activity_at) > this.inactivityTimeoutMs) {
        this.db.prepare(`DELETE FROM sessions WHERE sid = ?`).run(sid);
        return callback(null, null);
      }

      const parsed = JSON.parse(row.sess) as session.SessionData;
      return callback(null, parsed);
    } catch (err) {
      return callback(err);
    }
  }

  override set(sid: string, sessData: session.SessionData, callback?: (err?: unknown) => void): void {
    try {
      const now = Date.now();
      const cookieExpire = sessData.cookie?.expires ? new Date(sessData.cookie.expires).getTime() : now + this.ttlMs;
      const expiresAt = Number.isFinite(cookieExpire) ? cookieExpire : now + this.ttlMs;
      const userId = (sessData as unknown as { userId?: number }).userId ?? null;
      const lastActivity = (sessData as unknown as { lastActivityAt?: number }).lastActivityAt ?? now;

      this.db
        .prepare(`
          INSERT INTO sessions (sid, user_id, sess, expires_at, last_activity_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(sid) DO UPDATE SET
            user_id = excluded.user_id,
            sess = excluded.sess,
            expires_at = excluded.expires_at,
            last_activity_at = excluded.last_activity_at
        `)
        .run(sid, userId, JSON.stringify(sessData), expiresAt, lastActivity);

      callback?.(null);
    } catch (err) {
      callback?.(err);
    }
  }

  override destroy(sid: string, callback?: (err?: unknown) => void): void {
    try {
      this.db.prepare(`DELETE FROM sessions WHERE sid = ?`).run(sid);
      callback?.(null);
    } catch (err) {
      callback?.(err);
    }
  }

  override touch(sid: string, sessData: session.SessionData, callback?: (err?: unknown) => void): void {
    try {
      const now = Date.now();
      const cookieExpire = sessData.cookie?.expires ? new Date(sessData.cookie.expires).getTime() : now + this.ttlMs;
      const expiresAt = Number.isFinite(cookieExpire) ? cookieExpire : now + this.ttlMs;

      this.db
        .prepare(`UPDATE sessions SET expires_at = ?, last_activity_at = ? WHERE sid = ?`)
        .run(expiresAt, now, sid);

      callback?.(null);
    } catch (err) {
      callback?.(err);
    }
  }
}
