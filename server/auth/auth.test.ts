import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import session from 'express-session';
import { createDatabase, listAuditLogs, findUserByEmail } from '../db/database';
import { SQLiteSessionStore } from './sqliteSessionStore';
import { provisionInitialAdmin } from './adminBootstrap';
import { generateSecurePassword, validatePasswordStrength } from './validation';
import { hasPermission, isRoleChangeAllowed } from './rbac';
import {
  createRequireAuth,
  createRequireRole,
  requireActiveAccount,
  requirePasswordChanged,
  verifyCsrf,
} from './middleware';
import { createAuthRouter } from '../routes/authRoutes';
import { createAdminRouter } from '../routes/adminRoutes';

function extractCookie(setCookieHeader: string[] | undefined): string {
  if (!setCookieHeader || setCookieHeader.length === 0) return '';
  return setCookieHeader.map(c => c.split(';')[0]).join('; ');
}

test('Validation & password generator produce strong compliant passwords', () => {
  assert.equal(validatePasswordStrength('weak').valid, false);
  assert.equal(validatePasswordStrength('NoNumber!').valid, false);
  assert.equal(validatePasswordStrength('nonumber123').valid, false);
  assert.equal(validatePasswordStrength('ValidPass123!').valid, true);

  for (let i = 0; i < 10; i++) {
    const pw = generateSecurePassword(14);
    assert.equal(pw.length >= 14, true);
    assert.equal(validatePasswordStrength(pw).valid, true);
  }
});

test('RBAC permissions and role transition policies enforce least privilege', () => {
  assert.equal(hasPermission('ADMIN', 'users:manage'), true);
  assert.equal(hasPermission('ADMIN', 'config:write'), true);
  assert.equal(hasPermission('ADMIN', 'audit:read'), true);

  assert.equal(hasPermission('CAPTAIN', 'telemetry:read'), true);
  assert.equal(hasPermission('CAPTAIN', 'operations:control'), true);
  assert.equal(hasPermission('CAPTAIN', 'users:manage'), false);
  assert.equal(hasPermission('CAPTAIN', 'config:write'), false);

  assert.equal(hasPermission('AUTHORITY', 'telemetry:read'), true);
  assert.equal(hasPermission('AUTHORITY', 'alerts:read'), true);
  assert.equal(hasPermission('AUTHORITY', 'operations:control'), false);
  assert.equal(hasPermission('AUTHORITY', 'users:manage'), false);
  assert.equal(hasPermission('AUTHORITY', 'config:write'), false);

  assert.equal(isRoleChangeAllowed('CAPTAIN', 'AUTHORITY'), true);
  assert.equal(isRoleChangeAllowed('AUTHORITY', 'CAPTAIN'), true);
  assert.equal(isRoleChangeAllowed('CAPTAIN', 'ADMIN'), false);
  assert.equal(isRoleChangeAllowed('ADMIN', 'CAPTAIN'), false);
});

test('Initial Admin bootstrap provisions once and hashes passwords with bcrypt', async () => {
  const db = createDatabase(':memory:');
  try {
    const first = await provisionInitialAdmin(db, {
      fullName: 'Primary Admin',
      email: 'admin@smartlaunch.local',
      password: 'AdminStrong!2026',
    });
    assert.equal(first.created, true);

    const row = findUserByEmail(db, 'admin@smartlaunch.local');
    assert.ok(row);
    assert.equal(row.role, 'ADMIN');
    assert.notEqual(row.password_hash, 'AdminStrong!2026');
    assert.equal(row.password_hash.startsWith('$2'), true);

    const second = await provisionInitialAdmin(db, {
      fullName: 'Second Admin',
      email: 'admin2@smartlaunch.local',
      password: 'AdminStrong!2026',
    });
    assert.equal(second.created, false);
  } finally {
    db.close();
  }
});

test('End-to-end Auth, RBAC, CSRF, first-login password change, disable, and delete', async () => {
  const db = createDatabase(':memory:');
  const inactivityMs = 15_000;
  const store = new SQLiteSessionStore({ db, ttlMs: 60_000, inactivityTimeoutMs: inactivityMs });

  await provisionInitialAdmin(db, {
    fullName: 'Faculty Demo Admin',
    email: 'admin@smartlaunch.local',
    password: 'AdminDemo!2026',
  });

  const app = express();
  app.use(express.json());
  app.use(
    session({
      name: 'smart_launch.sid',
      secret: 'test-session-secret-123',
      store,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: { httpOnly: true, sameSite: 'lax', secure: false },
    })
  );

  const requireAuth = createRequireAuth(db, inactivityMs);
  const requireRole = createRequireRole(db);

  app.use('/api/auth', createAuthRouter(db, inactivityMs));
  app.use('/api/admin', createAdminRouter(db, inactivityMs));

  app.get('/api/test/telemetry', requireAuth, requireActiveAccount, requirePasswordChanged, requireRole('ADMIN', 'CAPTAIN', 'AUTHORITY'), (_req, res) => {
    res.json({ ok: true });
  });
  app.post('/api/test/buzzer', requireAuth, requireActiveAccount, requirePasswordChanged, requireRole('ADMIN', 'CAPTAIN'), verifyCsrf, (_req, res) => {
    res.json({ muted: true });
  });

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function req(
    path: string,
    opts: { method?: string; cookie?: string; csrf?: string; body?: unknown } = {}
  ) {
    const headers: Record<string, string> = {};
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (opts.cookie) headers['Cookie'] = opts.cookie;
    if (opts.csrf) headers['X-CSRF-Token'] = opts.csrf;
    const res = await fetch(`${baseUrl}${path}`, {
      method: opts.method || 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const setCookies = res.headers.getSetCookie?.() || [];
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data, setCookies, cookie: extractCookie(setCookies) || opts.cookie || '' };
  }

  try {
    // 1. Unauthenticated request rejected
    const unauth = await req('/api/test/telemetry');
    assert.equal(unauth.status, 401);

    // 2. Invalid credentials rejected
    const badLogin = await req('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@smartlaunch.local', password: 'WrongPassword!1' },
    });
    assert.equal(badLogin.status, 401);

    // 3. Admin signs in
    const adminLogin = await req('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@smartlaunch.local', password: 'AdminDemo!2026' },
    });
    assert.equal(adminLogin.status, 200);
    assert.equal(adminLogin.data.user.role, 'ADMIN');
    assert.ok(adminLogin.setCookies.some(c => c.toLowerCase().includes('httponly')));
    const adminCookie = adminLogin.cookie;
    const adminCsrf = adminLogin.data.csrfToken as string;

    // 4. CSRF rejection without X-CSRF-Token
    const noCsrf = await req('/api/admin/users', {
      method: 'POST',
      cookie: adminCookie,
      body: { fullName: 'Test', email: 'test@smartlaunch.local', role: 'CAPTAIN', password: 'TempUser!2026' },
    });
    assert.equal(noCsrf.status, 403);

    // 5. Admin forbidden from creating another ADMIN via API
    const createSecondAdmin = await req('/api/admin/users', {
      method: 'POST',
      cookie: adminCookie,
      csrf: adminCsrf,
      body: { fullName: 'Rogue Admin', email: 'rogue@smartlaunch.local', role: 'ADMIN', password: 'TempUser!2026' },
    });
    assert.equal(createSecondAdmin.status, 403);

    // 6. Admin creates Captain & Authority accounts
    const createCaptain = await req('/api/admin/users', {
      method: 'POST',
      cookie: adminCookie,
      csrf: adminCsrf,
      body: { fullName: 'Captain Rahman', email: 'captain@smartlaunch.local', role: 'CAPTAIN', password: 'TempCap!2026' },
    });
    assert.equal(createCaptain.status, 201);
    const captainId = createCaptain.data.user.id;

    // Duplicate email rejected
    const dupCaptain = await req('/api/admin/users', {
      method: 'POST',
      cookie: adminCookie,
      csrf: adminCsrf,
      body: { fullName: 'Captain Duplicate', email: 'CAPTAIN@smartlaunch.local', role: 'CAPTAIN', password: 'TempCap!2026' },
    });
    assert.equal(dupCaptain.status, 409);

    const createAuthority = await req('/api/admin/users', {
      method: 'POST',
      cookie: adminCookie,
      csrf: adminCsrf,
      body: { fullName: 'Authority Inspector', email: 'authority@smartlaunch.local', role: 'AUTHORITY', password: 'TempAuth!2026' },
    });
    assert.equal(createAuthority.status, 201);
    const authorityId = createAuthority.data.user.id;

    // 7. Captain logs in -> forced password change blocks telemetry until updated
    const capLogin = await req('/api/auth/login', {
      method: 'POST',
      body: { email: 'captain@smartlaunch.local', password: 'TempCap!2026' },
    });
    assert.equal(capLogin.status, 200);
    assert.equal(capLogin.data.user.mustChangePassword, true);
    let capCookie = capLogin.cookie;
    let capCsrf = capLogin.data.csrfToken as string;

    const blockedTelemetry = await req('/api/test/telemetry', { cookie: capCookie });
    assert.equal(blockedTelemetry.status, 403);
    assert.equal(blockedTelemetry.data.code, 'PASSWORD_CHANGE_REQUIRED');

    // Captain changes password
    const capChangePw = await req('/api/auth/change-password', {
      method: 'POST',
      cookie: capCookie,
      csrf: capCsrf,
      body: { currentPassword: 'TempCap!2026', newPassword: 'CaptainNew!2026' },
    });
    assert.equal(capChangePw.status, 200);
    assert.equal(capChangePw.data.user.mustChangePassword, false);
    capCsrf = capChangePw.data.csrfToken;

    // Captain can now access telemetry and operational buzzer, NOT admin endpoints
    assert.equal((await req('/api/test/telemetry', { cookie: capCookie })).status, 200);
    assert.equal((await req('/api/test/buzzer', { method: 'POST', cookie: capCookie, csrf: capCsrf })).status, 200);
    assert.equal((await req('/api/admin/users', { cookie: capCookie })).status, 403);

    // 8. Authority logs in, changes password, reads telemetry, blocked from admin & operational controls
    const authLogin = await req('/api/auth/login', {
      method: 'POST',
      body: { email: 'authority@smartlaunch.local', password: 'TempAuth!2026' },
    });
    let authCookie = authLogin.cookie;
    let authCsrf = authLogin.data.csrfToken as string;
    const authChangePw = await req('/api/auth/change-password', {
      method: 'POST',
      cookie: authCookie,
      csrf: authCsrf,
      body: { currentPassword: 'TempAuth!2026', newPassword: 'AuthorityNew!2026' },
    });
    authCsrf = authChangePw.data.csrfToken;
    assert.equal((await req('/api/test/telemetry', { cookie: authCookie })).status, 200);
    assert.equal((await req('/api/test/buzzer', { method: 'POST', cookie: authCookie, csrf: authCsrf })).status, 403);
    assert.equal((await req('/api/admin/users', { cookie: authCookie })).status, 403);

    // 9. Admin deactivates Captain -> Captain session rejected & login blocked
    const deactivate = await req(`/api/admin/users/${captainId}`, {
      method: 'PATCH',
      cookie: adminCookie,
      csrf: adminCsrf,
      body: { isActive: false },
    });
    assert.equal(deactivate.status, 200);
    assert.equal((await req('/api/test/telemetry', { cookie: capCookie })).status, 401);

    const disabledLogin = await req('/api/auth/login', {
      method: 'POST',
      body: { email: 'captain@smartlaunch.local', password: 'CaptainNew!2026' },
    });
    assert.equal(disabledLogin.status, 403);

    // 10. Admin deletes Authority account
    const delAuth = await req(`/api/admin/users/${authorityId}`, {
      method: 'DELETE',
      cookie: adminCookie,
      csrf: adminCsrf,
    });
    assert.equal(delAuth.status, 200);

    // 11. Audit logs contain expected security events and zero plaintext passwords
    const logs = listAuditLogs(db, { limit: 100 });
    assert.equal(logs.some(l => l.eventType === 'LOGIN_FAILED'), true);
    assert.equal(logs.some(l => l.eventType === 'USER_CREATED'), true);
    assert.equal(logs.some(l => l.eventType === 'UNAUTHORIZED_ACCESS'), true);
    assert.equal(logs.some(l => l.details.includes('AdminDemo!2026') || l.details.includes('CaptainNew!2026')), false);

    // 12. Logout destroys session
    const logoutRes = await req('/api/auth/logout', { method: 'POST', cookie: adminCookie, csrf: adminCsrf });
    assert.equal(logoutRes.status, 200);
    assert.equal((await req('/api/admin/users', { cookie: adminCookie })).status, 401);
  } finally {
    store.close();
    server.close();
    db.close();
  }
});

test('Session expires deterministically after inactivity timeout', async () => {
  const db = createDatabase(':memory:');
  const inactivityMs = 400;
  const store = new SQLiteSessionStore({ db, ttlMs: 60_000, inactivityTimeoutMs: inactivityMs });

  await provisionInitialAdmin(db, {
    fullName: 'Timeout Admin',
    email: 'timeout@smartlaunch.local',
    password: 'AdminDemo!2026',
  });

  const app = express();
  app.use(express.json());
  app.use(
    session({
      name: 'smart_launch.sid',
      secret: 'test-session-secret-timeout',
      store,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: { httpOnly: true, sameSite: 'lax', secure: false },
    })
  );

  const requireAuth = createRequireAuth(db, inactivityMs);
  app.use('/api/auth', createAuthRouter(db, inactivityMs));
  app.get('/api/test/ping', requireAuth, (_req, res) => res.json({ ok: true }));

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'timeout@smartlaunch.local', password: 'AdminDemo!2026' }),
    });
    assert.equal(loginRes.status, 200);
    const cookie = extractCookie(loginRes.headers.getSetCookie?.());

    const activeRes = await fetch(`${baseUrl}/api/test/ping`, { headers: { Cookie: cookie } });
    assert.equal(activeRes.status, 200);

    await new Promise(r => setTimeout(r, 550));
    const expiredRes = await fetch(`${baseUrl}/api/test/ping`, { headers: { Cookie: cookie } });
    assert.equal(expiredRes.status, 401);
  } finally {
    store.close();
    server.close();
    db.close();
  }
});
